const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface Booking {
  id: number;
  desk: {
    id: number;
    name: string;
    room: number;
    room_name: string;
  };
  user: number;
  username: string;
  room_name: string;
  floor_name: string;
  location_name: string;
  location_id: string;
  start_time: string;
  end_time: string;
}

export interface CreateBookingPayload {
  desk_id: number;
  start_time: string; // ISO 8601
  end_time: string;   // ISO 8601
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || error.error || `HTTP ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
};

export const createBookingApi = (
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>
) => ({
  /** Get current user's bookings, optionally filtered */
  async getMyBookings(params?: {
    start?: string;
    end?: string;
    desk?: number;
  }): Promise<Booking[]> {
    const qs = new URLSearchParams({ user_only: 'true' });
    if (params?.start) qs.set('start', params.start);
    if (params?.end)   qs.set('end',   params.end);
    if (params?.desk)  qs.set('desk',  String(params.desk));
    const response = await authenticatedFetch(`${API_BASE_URL}/bookings/?${qs}`);
    return handleResponse<Booking[]>(response);
  },

  /** Get bookings for a specific desk on a given date */
  async getDeskBookings(deskId: number, date: string): Promise<Booking[]> {
    const start = `${date}T00:00:00Z`;
    const end   = `${date}T23:59:59Z`;
    const qs = new URLSearchParams({ desk: String(deskId), start, end });
    const response = await authenticatedFetch(`${API_BASE_URL}/bookings/?${qs}`);
    return handleResponse<Booking[]>(response);
  },

  /** Create a single booking */
  async createBooking(payload: CreateBookingPayload): Promise<Booking> {
    const response = await authenticatedFetch(`${API_BASE_URL}/bookings/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<Booking>(response);
  },

  /** Cancel a booking */
  async cancelBooking(bookingId: number): Promise<void> {
    const response = await authenticatedFetch(`${API_BASE_URL}/bookings/${bookingId}/`, {
      method: 'DELETE',
    });
    return handleResponse<void>(response);
  },

  /** Lock a desk before booking */
  async lockDesk(deskId: number): Promise<{ ok: boolean; locked_by?: string }> {
    const response = await authenticatedFetch(`${API_BASE_URL}/bookings/lock/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ desk_id: deskId }),
    });
    // 423 = already locked by someone else — not an error, just a state
    if (response.status === 423) {
      const data = await response.json();
      return { ok: false, locked_by: data.locked_by };
    }
    return handleResponse<{ ok: boolean }>(response);
  },

  /** Unlock a desk (called on modal close without booking) */
  async unlockDesk(deskId: number): Promise<void> {
    await authenticatedFetch(`${API_BASE_URL}/bookings/unlock/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ desk_id: deskId }),
    });
  },

  /** Refresh lock TTL while user is on the booking form */
  async refreshLock(deskId: number): Promise<{ ok: boolean }> {
    const response = await authenticatedFetch(`${API_BASE_URL}/bookings/refresh_lock/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ desk_id: deskId }),
    });
    return handleResponse<{ ok: boolean }>(response);
  },
});

export type BookingApi = ReturnType<typeof createBookingApi>;
