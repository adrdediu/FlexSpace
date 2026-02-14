const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface Floor {
  id: number;
  name: string;
  location: number;
}

// Helper to handle API responses
const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.detail || `HTTP ${response.status}`);
  }
  return response.json();
};

// Floor API functions
export const createFloorApi = (authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>) => ({
  /**
   * Get all floors for a location
   */
  async getFloorsByLocation(locationId: number): Promise<Floor[]> {
    const response = await authenticatedFetch(`${API_BASE_URL}/floors/?location=${locationId}`);
    return handleResponse<Floor[]>(response);
  },

  /**
   * Get single floor
   */
  async getFloor(id: number): Promise<Floor> {
    const response = await authenticatedFetch(`${API_BASE_URL}/floors/${id}/`);
    return handleResponse<Floor>(response);
  },

  /**
   * Create new floor
   */
  async createFloor(data: { name: string; location: number }): Promise<Floor> {
    const response = await authenticatedFetch(`${API_BASE_URL}/floors/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse<Floor>(response);
  },

  /**
   * Update floor
   */
  async updateFloor(id: number, data: Partial<Floor>): Promise<Floor> {
    const response = await authenticatedFetch(`${API_BASE_URL}/floors/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return handleResponse<Floor>(response);
  },

  /**
   * Delete floor
   */
  async deleteFloor(id: number): Promise<void> {
    const response = await authenticatedFetch(`${API_BASE_URL}/floors/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete floor' }));
      throw new Error(error.error || error.detail || 'Failed to delete floor');
    }
  },
});

export type FloorApi = ReturnType<typeof createFloorApi>;