const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
}

// Helper to handle API responses
const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.detail || `HTTP ${response.status}`);
  }
  return response.json();
};

// User search API functions
export const createUserSearchApi = (authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>) => ({
  /**
   * Search for users by username, email, or name
   */
  async searchUsers(query: string): Promise<User[]> {
    const response = await authenticatedFetch(`${API_BASE_URL}/users/search/?q=${encodeURIComponent(query)}`);
    return handleResponse<User[]>(response);
  },

  /**
   * Get user by ID
   */
  async getUser(id: number): Promise<User> {
    const response = await authenticatedFetch(`${API_BASE_URL}/users/${id}/`);
    return handleResponse<User>(response);
  },
});

export type UserSearchApi = ReturnType<typeof createUserSearchApi>;