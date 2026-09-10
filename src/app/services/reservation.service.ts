import { Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  where
} from 'firebase/firestore';
import { Reservation } from './reservation.model';
import { db, isBrowser } from './firebase';

// Thrown by bookTable() when the chosen table was taken while the customer was
// filling in the form. The booking page catches this by name to show a friendly
// "pick another table" message rather than a generic failure.
export const SLOT_TAKEN = 'slot-taken';

// Phone numbers are stored twice: exactly as the customer typed them (for staff
// to read and dial) and as digits only, so "My Reservations" can look them up
// regardless of spaces, dashes or a +995 prefix.
export function normalizePhone(phone: string | undefined): string {
  return (phone || '').replace(/[^0-9]/g, '');
}

// Every booked table/date/time combination also gets a small "slot" document
// whose id is derived from those three values. Because a document id can only
// exist once, creating the reservation and its slot together inside a Firestore
// transaction is what makes double-booking genuinely impossible: if two people
// submit for the same table at the same moment, only one transaction can create
// that slot id and the other is rejected by the database itself.
function slotId(date: string, time: string, tableId: number | string): string {
  return `${date}_${time}_t${tableId}`;
}

@Injectable({
  providedIn: 'root'
})
export class ReservationService {

  // Fetch every reservation — used by the staff panel.
  getReservations(): Observable<Reservation[]> {
    if (!isBrowser()) {
      return of([]);
    }

    const load = async (): Promise<Reservation[]> => {
      const snapshot = await getDocs(collection(db(), 'reservations'));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Reservation));
    };

    return from(load());
  }

  // Look up a customer's own reservations by phone number.
  getReservationsByPhone(phone: string): Observable<Reservation[]> {
    if (!isBrowser()) {
      return of([]);
    }

    const load = async (): Promise<Reservation[]> => {
      const snapshot = await getDocs(query(
        collection(db(), 'reservations'),
        where('phoneKey', '==', normalizePhone(phone))
      ));
      return snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Reservation))
        .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
    };

    return from(load());
  }

  // Which tables are already taken for a given date and time.
  getBookedTableIds(date: string, time: string): Observable<number[]> {
    if (!isBrowser()) {
      return of([]);
    }

    const load = async (): Promise<number[]> => {
      const snapshot = await getDocs(query(
        collection(db(), 'tableSlots'),
        where('date', '==', date),
        where('time', '==', time)
      ));
      return snapshot.docs
        .map(d => d.data() as { tableId: number; cancelled?: boolean })
        .filter(slot => !slot.cancelled)
        .map(slot => Number(slot.tableId));
    };

    return from(load());
  }

  // Create a reservation and claim its table slot in one atomic step.
  // Rejects with SLOT_TAKEN if someone else already holds that slot.
  bookTable(reservation: Reservation): Observable<Reservation> {
    const book = async (): Promise<Reservation> => {
      const database = db();
      const slotRef = doc(database, 'tableSlots', slotId(reservation.date, reservation.time, reservation.tableId));

      const payload: Reservation = {
        ...reservation,
        phoneKey: normalizePhone(reservation.phone),
        status: 'confirmed',
        createdAt: new Date().toISOString()
      };
      delete payload.id;

      const newId = await runTransaction(database, async (transaction) => {
        const existingSlot = await transaction.get(slotRef);

        // A slot that exists and hasn't been cancelled means the table is taken.
        // A cancelled slot is free again and can simply be taken over.
        if (existingSlot.exists() && !(existingSlot.data() as { cancelled?: boolean }).cancelled) {
          throw new Error(SLOT_TAKEN);
        }

        const reservationRef = doc(collection(database, 'reservations'));
        transaction.set(reservationRef, payload);
        transaction.set(slotRef, {
          reservationId: reservationRef.id,
          date: reservation.date,
          time: reservation.time,
          tableId: Number(reservation.tableId),
          cancelled: false
        });

        return reservationRef.id;
      });

      return { ...payload, id: newId };
    };

    return from(book());
  }

  // Cancel a reservation and release its table so someone else can book it.
  cancelReservation(reservationId: string): Observable<void> {
    const cancel = async (): Promise<void> => {
      const database = db();
      const reservationRef = doc(database, 'reservations', reservationId);

      await runTransaction(database, async (transaction) => {
        const snapshot = await transaction.get(reservationRef);
        if (!snapshot.exists()) {
          return;
        }

        const data = snapshot.data() as Reservation;
        const slotRef = doc(database, 'tableSlots', slotId(data.date, data.time, data.tableId));
        const slotSnapshot = await transaction.get(slotRef);

        transaction.update(reservationRef, { status: 'cancelled' });

        // Only release the slot if it still belongs to this reservation — it may
        // already have been taken over by a later booking.
        if (slotSnapshot.exists() &&
            (slotSnapshot.data() as { reservationId?: string }).reservationId === reservationId) {
          transaction.update(slotRef, { cancelled: true });
        }
      });
    };

    return from(cancel());
  }

  // Permanently remove a reservation — staff panel only.
  deleteReservation(reservationId: string): Observable<void> {
    const remove = async (): Promise<void> => {
      const database = db();
      const reservationRef = doc(database, 'reservations', reservationId);
      const snapshot = await getDoc(reservationRef);

      if (snapshot.exists()) {
        const data = snapshot.data() as Reservation;
        const slotRef = doc(database, 'tableSlots', slotId(data.date, data.time, data.tableId));
        const slotSnapshot = await getDoc(slotRef);

        if (slotSnapshot.exists() &&
            (slotSnapshot.data() as { reservationId?: string }).reservationId === reservationId) {
          await deleteDoc(slotRef);
        }
      }

      await deleteDoc(reservationRef);
    };

    return from(remove());
  }
}
