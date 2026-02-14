const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface Country {
  id: number;
  name: string;
  code?: string;
}

// Helper to handle API responses
const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.detail || `HTTP ${response.status}`);
  }
  return response.json();
};

// Countries API functions
export const createCountriesApi = (authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>) => ({
  /**
   * Get all countries
   */
  async getCountries(): Promise<Country[]> {
    const response = await authenticatedFetch(`${API_BASE_URL}/countries/`);
    return handleResponse<Country[]>(response);
  },

  /**
   * Get single country
   */
  async getCountry(id: number): Promise<Country> {
    const response = await authenticatedFetch(`${API_BASE_URL}/countries/${id}/`);
    return handleResponse<Country>(response);
  },
});

export type CountriesApi = ReturnType<typeof createCountriesApi>;