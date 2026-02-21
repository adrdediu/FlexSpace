const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Location interfaces
export interface LocationManager {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
}

export interface AllowedLocationGroup {
  id: number;
  name: string;
  description: string;
  member_count: number;
}

export interface Location {
  id: number;
  name: string;
  country: number;
  country_name?: string;
  lat?: number;
  lng?: number;
  country_code?: string;
  location_managers: LocationManager[];
  allowed_groups: AllowedLocationGroup[];
  allow_room_managers_to_add_group_members: boolean;
  is_manager: boolean;
  can_access: boolean;
  user_group_count: number;
  floor_count: number;
  room_count: number;
  floors?: any[];
}

export interface LocationListItem {
  id: number;
  name: string;
  country: number;
  country_name: string;
  lat?: number;
  lng?: number;
  floor_count: number;
  room_count: number;
  is_manager: boolean;
  can_access: boolean;
}

// Helper to handle API responses
const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.detail || `HTTP ${response.status}`);
  }
  return response.json();
};

// Location API functions
export const createLocationApi = (authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>) => ({
  /**
   * Get all managed locations
   */
  async getLocations(): Promise<LocationListItem[]> {
    const response = await authenticatedFetch(`${API_BASE_URL}/admin/locations/`);
    return handleResponse<LocationListItem[]>(response);
  },

  /**
   * Get single location details
   */
  async getLocation(id: number): Promise<Location> {
    const response = await authenticatedFetch(`${API_BASE_URL}/admin/locations/${id}/`);
    return handleResponse<Location>(response);
  },

  /**
   * Create new location
   */
  async createLocation(data: {
    name: string;
    country: number;
    lat?: number;
    lng?: number;
    country_code?: string;
  }): Promise<Location> {
    const response = await authenticatedFetch(`${API_BASE_URL}/admin/locations/`, {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        country_id: data.country, // Backend expects country_id
        lat: data.lat,
        lng: data.lng,
        country_code: data.country_code,
      }),
    });
    return handleResponse<Location>(response);
  },

  /**
   * Update location
   */
  async updateLocation(id: number, data: Partial<Location>): Promise<Location> {
    // Remove read-only fields
    const { country, location_managers, is_manager, user_group_count, floor_count, room_count, ...updateData } = data as any;
    
    const response = await authenticatedFetch(`${API_BASE_URL}/admin/locations/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
    return handleResponse<Location>(response);
  },

  /**
   * Delete location
   */
  async deleteLocation(id: number): Promise<void> {
    const response = await authenticatedFetch(`${API_BASE_URL}/admin/locations/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete location' }));
      throw new Error(error.error || error.detail || 'Failed to delete location');
    }
  },

  /**
   * Add location managers
   */
  async addManagers(id: number, userIds: number[]): Promise<Location> {
    const response = await authenticatedFetch(`${API_BASE_URL}/admin/locations/${id}/add_managers/`, {
      method: 'POST',
      body: JSON.stringify({ user_ids: userIds }),
    });
    return handleResponse<Location>(response);
  },

  /**
   * Remove location managers
   */
  async removeManagers(id: number, userIds: number[]): Promise<Location> {
    const response = await authenticatedFetch(`${API_BASE_URL}/admin/locations/${id}/remove_managers/`, {
      method: 'POST',
      body: JSON.stringify({ user_ids: userIds }),
    });
    return handleResponse<Location>(response);
  },

  /**
   * Toggle room manager permissions
   */
  async toggleRoomManagerPermissions(id: number, allow: boolean): Promise<Location> {
    const response = await authenticatedFetch(`${API_BASE_URL}/admin/locations/${id}/toggle_room_manager_permissions/`, {
      method: 'POST',
      body: JSON.stringify({ allow }),
    });
    return handleResponse<Location>(response);
  },

  /**
   * Get rooms in location
   */
  async getLocationRooms(id: number): Promise<any[]> {
    const response = await authenticatedFetch(`${API_BASE_URL}/admin/locations/${id}/rooms/`);
    return handleResponse<any[]>(response);
  },

  /**
   * Get user groups in location
   */
  async getLocationGroups(id: number): Promise<any[]> {
    const response = await authenticatedFetch(`${API_BASE_URL}/admin/locations/${id}/user_groups/`);
    return handleResponse<any[]>(response);
  },

  /**
   * Set which user groups can access this location.
   * Empty array = open to all authenticated users.
   */
  async setAllowedGroups(id: number, groupIds: number[]): Promise<Location> {
    const response = await authenticatedFetch(`${API_BASE_URL}/admin/locations/${id}/set_allowed_groups/`, {
      method: 'POST',
      body: JSON.stringify({ group_ids: groupIds }),
    });
    return handleResponse<Location>(response);
  },
});

export type LocationApi = ReturnType<typeof createLocationApi>;