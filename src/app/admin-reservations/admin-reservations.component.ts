import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReservationService } from '../services/reservation.service';
import { Reservation } from '../services/reservation.model';
import { PanelAuthComponent } from '../shared/panel-auth/panel-auth.component';

type ReservationFilter = 'upcoming' | 'today' | 'cancelled' | 'all';

@Component({
  selector: 'app-admin-reservations',
  standalone: true,
  imports: [CommonModule, PanelAuthComponent],
  templateUrl: './admin-reservations.component.html',
  styleUrl: './admin-reservations.component.css'
})
export class AdminReservationsComponent implements OnInit {

  allReservations: Reservation[] = [];
  loading = false;
  errorMessage = '';
  lastUpdated: Date | null = null;

  filter: ReservationFilter = 'upcoming';
  cancellingId: string | null = null;
  deletingId: string | null = null;

  private readonly todayValue = this.toDateValue(new Date());

  constructor(private reservationService: ReservationService) {}

  ngOnInit(): void {
    this.fetchReservations();
  }

  fetchReservations(): void {
    this.loading = true;
    this.errorMessage = '';
    this.reservationService.getReservations().subscribe({
      next: (all) => {
        this.allReservations = all.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
        this.loading = false;
        this.lastUpdated = new Date();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Could not load reservations right now. Please try refreshing.';
      }
    });
  }

  setFilter(filter: ReservationFilter): void {
    this.filter = filter;
  }

  get filteredReservations(): Reservation[] {
    switch (this.filter) {
      case 'today':
        return this.allReservations.filter(r => r.date === this.todayValue && r.status !== 'cancelled');
      case 'cancelled':
        return this.allReservations.filter(r => r.status === 'cancelled');
      case 'upcoming':
        return this.allReservations.filter(r => r.status !== 'cancelled' && !this.isPast(r));
      case 'all':
      default:
        return this.allReservations;
    }
  }

  get upcomingCount(): number {
    return this.allReservations.filter(r => r.status !== 'cancelled' && !this.isPast(r)).length;
  }

  get todayCount(): number {
    return this.allReservations.filter(r => r.date === this.todayValue && r.status !== 'cancelled').length;
  }

  get cancelledCount(): number {
    return this.allReservations.filter(r => r.status === 'cancelled').length;
  }

  isToday(r: Reservation): boolean {
    return r.date === this.todayValue;
  }

  isPast(r: Reservation): boolean {
    const dt = new Date(`${r.date}T${r.time}`);
    return !isNaN(dt.getTime()) && dt < new Date();
  }

  cancelReservation(r: Reservation): void {
    if (!r.id || this.cancellingId) {
      return;
    }
    if (!confirm(`Cancel the reservation for ${r.name} on ${r.date} at ${r.time}?`)) {
      return;
    }
    this.cancellingId = r.id;
    // Cancelling also frees the table again so it can be re-booked.
    this.reservationService.cancelReservation(r.id).subscribe({
      next: () => {
        r.status = 'cancelled';
        this.cancellingId = null;
      },
      error: () => {
        this.cancellingId = null;
        this.errorMessage = 'Could not cancel that reservation right now. Please try again.';
      }
    });
  }

  deleteReservation(r: Reservation): void {
    if (!r.id || this.deletingId) {
      return;
    }
    if (!confirm(`Permanently delete the reservation for ${r.name} on ${r.date} at ${r.time}? This can't be undone.`)) {
      return;
    }
    this.deletingId = r.id;
    this.reservationService.deleteReservation(r.id).subscribe({
      next: () => {
        this.allReservations = this.allReservations.filter(x => x.id !== r.id);
        this.deletingId = null;
      },
      error: () => {
        this.deletingId = null;
        this.errorMessage = 'Could not delete that reservation right now. Please try again.';
      }
    });
  }

  private toDateValue(d: Date): string {
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  }
}
