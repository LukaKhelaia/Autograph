export interface Reservation {
  id?: string;
  name: string;
  phone: string;
  // Digits-only copy of `phone`, so the "My Reservations" lookup matches
  // regardless of how the customer typed spaces, dashes or a country code.
  phoneKey?: string;
  email?: string;
  date: string;      // yyyy-mm-dd
  time: string;       // HH:mm
  guests: number;
  tableId: number;
  notes?: string;
  status?: string;    // 'confirmed' | 'cancelled'
  createdAt?: string;
}

export interface RestaurantTable {
  id: number;
  label: string;
  capacity: number;
}
