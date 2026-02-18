/**
 * Room Management API Service
 * Provides all API calls for managing rooms, room managers, and access control
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Type definitions matching backend serializers
export interface RoomManager {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
}

export interface AllowedGroup {
  id: number;
  name: string;
  description: string;
  member_count: number;
}

export interface BasicFloor {
  id: number;
  name: string;
  location: number;
  location_id: number;
  location_name: string;
}

export interface Desk {
  id: number;
  name: string;
  pos_x: number;
  pos_y: number;
  is_booked: boolean;
  booked_by?: string;
  is_locked: boolean;
  locked_by?: string;
  is_permanent: boolean;
  permanent_assignee?: number | null;           // user ID (writable)
  permanent_assignee_username?: string | null;  // read-only display
  permanent_assignee_full_name?: string | null; // read-only display
  room: number;
  room_name?: string;
  orientation: 'top' | 'bottom' | 'left' | 'right';
}

export interface Room {
  id: number;
  name: string;
  description: string;
  floor: BasicFloor;
  floor_id?: number;
  map_image?: string;
  room_managers: RoomManager[];
  room_manager_ids?: number[];
  allowed_groups: AllowedGroup[];
  allowed_group_ids?: number[];
  is_manager: boolean;
  can_book: boolean;
  desk_count: number;
}

export interface RoomListItem {
  id: number;
  name: string;
  description: string;
  floor: number;
  floor_name: string;
  location_name: string;
  map_image?: string;
  desk_count: number;
  available_desk_count: number;
  is_manager: boolean;
  can_book: boolean;
}

export interface RoomWithDesks extends Room {
  desks: Desk[];
}

// Type for the authenticated fetch function
export type AuthenticatedFetch = (
  url: string,
  options?: RequestInit
) => Promise<Response>;

/**
 * Create Room API instance with authenticated fetch
 */
export const createRoomApi = (authenticatedFetch: AuthenticatedFetch) => {
  return {
    /**
     * Get all managed rooms
     * @param floorId - Optional floor ID to filter rooms
     */
    getRooms: async (floorId?: number): Promise<RoomListItem[]> => {
      const params = floorId ? `?floor=${floorId}` : '';
      const response = await authenticatedFetch(`${API_BASE_URL}/admin/rooms/${params}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to fetch rooms');
      }
      return response.json();
    },

    /**
     * Get detailed room information including desks
     * @param id - Room ID
     */
    getRoom: async (id: number): Promise<RoomWithDesks> => {
      const response = await authenticatedFetch(`${API_BASE_URL}/admin/rooms/${id}/`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to fetch room details');
      }
      return response.json();
    },

    /**
     * Create a new room
     * @param data - Room creation data
     */
    createRoom: async (data: {
      name: string;
      description?: string;
      floor_id: number;
    }): Promise<Room> => {
      const response = await authenticatedFetch(`${API_BASE_URL}/admin/rooms/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || error.error || 'Failed to create room');
      }
      return response.json();
    },

    /**
     * Update room details
     * @param id - Room ID
     * @param data - Partial room data to update
     */
    updateRoom: async (id: number, data: Partial<Room>): Promise<Room> => {
      const response = await authenticatedFetch(`${API_BASE_URL}/admin/rooms/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to update room');
      }
      return response.json();
    },

    /**
     * Delete a room
     * @param id - Room ID
     */
    deleteRoom: async (id: number): Promise<void> => {
      const response = await authenticatedFetch(`${API_BASE_URL}/admin/rooms/${id}/`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to delete room');
      }
    },

    /**
     * Add room managers
     * @param roomId - Room ID
     * @param userIds - Array of user IDs to add as managers
     */
    addManagers: async (roomId: number, userIds: number[]): Promise<Room> => {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/admin/rooms/${roomId}/add_managers/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_ids: userIds }),
        }
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.detail || 'Failed to add managers');
      }
      return response.json();
    },

    /**
     * Remove room managers
     * @param roomId - Room ID
     * @param userIds - Array of user IDs to remove from managers
     */
    removeManagers: async (roomId: number, userIds: number[]): Promise<Room> => {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/admin/rooms/${roomId}/remove_managers/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_ids: userIds }),
        }
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.detail || 'Failed to remove managers');
      }
      return response.json();
    },

    /**
     * Set which user groups can book in this room
     * @param roomId - Room ID
     * @param groupIds - Array of group IDs (empty array = allow all)
     */
    setAllowedGroups: async (roomId: number, groupIds: number[]): Promise<Room> => {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/admin/rooms/${roomId}/set_allowed_groups/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ group_ids: groupIds }),
        }
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.detail || 'Failed to set allowed groups');
      }
      return response.json();
    },

    /**
     * Upload a room map image
     * @param roomId - Room ID
     * @param file - Image file to upload
     */
    uploadMap: async (roomId: number, file: File): Promise<Room> => {
      const formData = new FormData();
      formData.append('map_image', file);
      
      // For FormData, we need to let the browser set Content-Type with boundary
      // So we create a custom fetch that doesn't use authenticatedFetch's Content-Type
      const response = await fetch(
        `${API_BASE_URL}/admin/rooms/${roomId}/upload-map/`,
        {
          method: 'POST',
          body: formData,
          credentials: 'include',
          // Don't set Content-Type - browser will set it with boundary for multipart/form-data
        }
      );
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.detail || 'Failed to upload map');
      }
      return response.json();
    },

    /**
     * Delete the room map image
     * @param roomId - Room ID
     */
    deleteMap: async (roomId: number): Promise<Room> => {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/admin/rooms/${roomId}/delete-map/`,
        {
          method: 'DELETE',
        }
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || error.detail || 'Failed to delete map');
      }
      return response.json();
    },
  };
};

export type RoomApi = ReturnType<typeof createRoomApi>;