import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HeaderComponent } from '../header/header.component';
import { ReservationService, SLOT_TAKEN } from '../services/reservation.service';
import { Reservation, RestaurantTable } from '../services/reservation.model';

interface DateOption {
  value: string;   // yyyy-mm-dd
  dayLabel: string; // Mon, Tue...
  dateLabel: string; // 9
  monthLabel: string; // Sep
}

@Component({
  selector: 'app-reserve',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, HeaderComponent],
  templateUrl: './reserve.component.html',
  styleUrl: './reserve.component.css'
})
export class ReserveComponent implements OnInit {

  // Restaurant's fixed set of tables
  readonly tables: RestaurantTable[] = [
    { id: 1, label: 'Table 1', capacity: 2 },
    { id: 2, label: 'Table 2', capacity: 2 },
    { id: 3, label: 'Table 3', capacity: 2 },
    { id: 4, label: 'Table 4', capacity: 4 },
    { id: 5, label: 'Table 5', capacity: 4 },
    { id: 6, label: 'Table 6', capacity: 4 },
    { id: 7, label: 'Table 7', capacity: 6 },
    { id: 8, label: 'Table 8', capacity: 6 },
    { id: 9, label: 'Table 9', capacity: 8 },
    { id: 10, label: 'Table 10', capacity: 4 },
  ];

  readonly maxCapacity = Math.max(...this.tables.map(t => t.capacity));

  // Restaurant is open 11am - 10pm; last seating an hour before close
  readonly timeSlots: string[] = this.buildTimeSlots('11:00', '21:00', 30);

  dateOptions: DateOption[] = [];
  selectedDate: string = '';
  selectedTime: string = '';
  guests: number = 2;

  availableTimeSlots: string[] = [];
  availableTables: RestaurantTable[] = [];
  selectedTableId: number | null = null;

  loadingAvailability = false;
  availabilityError = '';

  // Contact form fields
  name = '';
  phone = '';
  email = '';
  notes = '';

  submitting = false;
  submitted = false;
  submitError = '';
  selectedLanguage = 'en';

  // Tab switching between booking a new table and looking up an existing reservation
  viewMode: 'book' | 'lookup' = 'book';
  lookupPhone = '';
  lookupSearched = false;
  lookupLoading = false;
  lookupError = '';
  lookupResults: Reservation[] = [];
  cancellingId: string | null = null;

  constructor(
    private reservationService: ReservationService,
    private translateService: TranslateService
  ) {
    this.translateService.onLangChange.subscribe(e => {
      this.selectedLanguage = e.lang;
    });
    this.selectedLanguage = this.translateService.currentLang || 'en';
  }

  ngOnInit(): void {
    this.dateOptions = this.buildDateOptions(7);
    this.selectedDate = this.dateOptions[0].value;
    this.refreshAvailableTimeSlots();
  }

  private buildTimeSlots(start: string, end: string, stepMinutes: number): string[] {
    const slots: string[] = [];
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let cur = sh * 60 + sm;
    const last = eh * 60 + em;
    while (cur <= last) {
      const h = Math.floor(cur / 60);
      const m = cur % 60;
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      cur += stepMinutes;
    }
    return slots;
  }

  private buildDateOptions(days: number): DateOption[] {
    const options: DateOption[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const value = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      options.push({
        value,
        dayLabel: i === 0 ? 'Today' : dayNames[d.getDay()],
        dateLabel: d.getDate().toString(),
        monthLabel: monthNames[d.getMonth()]
      });
    }
    return options;
  }

  // Filter out time slots already in the past when "today" is selected
  private refreshAvailableTimeSlots(): void {
    const todayValue = this.dateOptions[0]?.value;
    if (this.selectedDate !== todayValue) {
      this.availableTimeSlots = this.timeSlots;
      return;
    }
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes() + 30; // 30 min prep buffer
    this.availableTimeSlots = this.timeSlots.filter(t => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m >= nowMinutes;
    });
  }

  selectDate(date: string): void {
    this.selectedDate = date;
    this.selectedTime = '';
    this.selectedTableId = null;
    this.availableTables = [];
    this.refreshAvailableTimeSlots();
  }

  selectTime(time: string): void {
    this.selectedTime = time;
    this.selectedTableId = null;
    this.checkAvailability();
  }

  changeGuests(delta: number): void {
    const next = this.guests + delta;
    if (next >= 1 && next <= this.maxCapacity + 4) {
      this.guests = next;
      this.selectedTableId = null;
      if (this.selectedTime) {
        this.checkAvailability();
      }
    }
  }

  get partyTooLarge(): boolean {
    return this.guests > this.maxCapacity;
  }

  checkAvailability(): void {
    if (!this.selectedDate || !this.selectedTime) {
      return;
    }
    this.loadingAvailability = true;
    this.availabilityError = '';
    this.reservationService.getBookedTableIds(this.selectedDate, this.selectedTime).subscribe({
      next: (bookedTableIds) => {
        this.availableTables = this.computeAvailableTables(bookedTableIds);
        if (this.selectedTableId && !this.availableTables.find(t => t.id === this.selectedTableId)) {
          this.selectedTableId = null;
        }
        this.loadingAvailability = false;
      },
      error: () => {
        this.loadingAvailability = false;
        this.availabilityError = 'Could not load table availability right now. Please try again in a moment.';
      }
    });
  }

  private computeAvailableTables(bookedTableIds: number[]): RestaurantTable[] {
    const booked = new Set(bookedTableIds.map(Number));
    return this.tables.filter(t => t.capacity >= this.guests && !booked.has(t.id));
  }

  selectTable(tableId: number): void {
    this.selectedTableId = tableId;
  }

  get canSubmit(): boolean {
    return !!(
      this.selectedDate &&
      this.selectedTime &&
      this.selectedTableId &&
      this.name.trim() &&
      this.phone.trim() &&
      !this.partyTooLarge
    );
  }

  submitReservation(): void {
    if (!this.canSubmit || this.submitting) {
      return;
    }
    this.submitting = true;
    this.submitError = '';

    const reservation: Reservation = {
      name: this.name.trim(),
      phone: this.phone.trim(),
      email: this.email.trim(),
      date: this.selectedDate,
      time: this.selectedTime,
      guests: this.guests,
      tableId: this.selectedTableId as number,
      notes: this.notes.trim(),
      status: 'confirmed'
    };

    // No "check then hope" any more: the database itself refuses to hand the
    // same table to two people, so either this booking wins the slot outright
    // or it comes back as SLOT_TAKEN and the customer picks again.
    this.reservationService.bookTable(reservation).subscribe({
      next: () => {
        this.submitting = false;
        this.submitted = true;
      },
      error: (err) => {
        this.submitting = false;
        if (err?.message === SLOT_TAKEN) {
          this.selectedTableId = null;
          this.submitError = 'That table was just booked by someone else — please pick another one.';
          this.checkAvailability();
          return;
        }
        this.submitError = 'Something went wrong while saving your reservation. Please try again.';
      }
    });
  }

  startNewReservation(): void {
    this.submitted = false;
    this.selectedTime = '';
    this.selectedTableId = null;
    this.availableTables = [];
    this.name = '';
    this.phone = '';
    this.email = '';
    this.notes = '';
    this.guests = 2;
    this.dateOptions = this.buildDateOptions(7);
    this.selectedDate = this.dateOptions[0].value;
    this.refreshAvailableTimeSlots();
  }

  switchToBook(): void {
    this.viewMode = 'book';
  }

  switchToLookup(): void {
    this.viewMode = 'lookup';
  }

  lookupSearch(): void {
    const query = this.lookupPhone.trim();
    if (!query) {
      return;
    }
    this.lookupLoading = true;
    this.lookupError = '';
    this.lookupSearched = true;

    this.reservationService.getReservationsByPhone(query).subscribe({
      next: (results) => {
        this.lookupResults = results;
        this.lookupLoading = false;
      },
      error: () => {
        this.lookupLoading = false;
        this.lookupError = 'Could not load your reservations right now. Please try again in a moment.';
      }
    });
  }

  isPast(r: Reservation): boolean {
    const dt = new Date(`${r.date}T${r.time}`);
    return !isNaN(dt.getTime()) && dt < new Date();
  }

  cancelReservation(r: Reservation): void {
    if (!r.id || this.cancellingId) {
      return;
    }
    this.cancellingId = r.id;

    this.reservationService.cancelReservation(r.id).subscribe({
      next: () => {
        r.status = 'cancelled';
        this.cancellingId = null;
      },
      error: () => {
        this.cancellingId = null;
        this.lookupError = 'Could not cancel that reservation right now. Please try again.';
      }
    });
  }
}
