const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export type AuditAction =
  | 'booking_created'
  | 'booking_cancelled'
  | 'booking_updated'
  | 'desk_locked'
  | 'desk_unlocked'
  | 'desk_assigned'
  | 'desk_unassigned'
  | 'room_maintenance'
  | 'user_login'
  | 'user_logout';

export interface AuditLog {
  id: number;
  username_snapshot: string;
  action: AuditAction;
  action_display: string;
  target_type: string;
  target_id: number | null;
  target_snapshot: Record<string, string | number | boolean | null>;
  ip_address: string | null;
  timestamp: string;
  notes: string;
}

export interface AuditLogFilters {
  action?: AuditAction;
  target_type?: string;
  target_id?: number;
  username?: string;
  location_id?: number;
  room_id?: number;
  start?: string;
  end?: string;
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || error.error || `HTTP ${response.status}`);
  }
  return response.json();
};

export const createAuditApi = (
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>
) => ({
  async getLogs(filters?: AuditLogFilters): Promise<AuditLog[]> {
    const qs = new URLSearchParams();
    if (filters?.action)      qs.set('action',      filters.action);
    if (filters?.target_type) qs.set('target_type', filters.target_type);
    if (filters?.target_id)   qs.set('target_id',   String(filters.target_id));
    if (filters?.username)    qs.set('username',     filters.username);
    if (filters?.location_id) qs.set('location_id', String(filters.location_id));
    if (filters?.room_id)     qs.set('room_id',      String(filters.room_id));
    if (filters?.start)       qs.set('start',        filters.start);
    if (filters?.end)         qs.set('end',          filters.end);
    const response = await authenticatedFetch(`${API_BASE_URL}/audit/?${qs}`);
    return handleResponse<AuditLog[]>(response);
  },
});