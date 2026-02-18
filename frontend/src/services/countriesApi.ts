const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface Country {
  id: number;
  name: string;
  country_code: string | null;
  lat: number | null;
  lng: number | null;
}

export interface CountryPayload {
  name: string;
  country_code?: string | null;
  lat?: number | null;
  lng?: number | null;
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.detail || `HTTP ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
};

export const createCountriesApi = (
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>
) => ({
  async getCountries(): Promise<Country[]> {
    const response = await authenticatedFetch(`${API_BASE_URL}/countries/`);
    return handleResponse<Country[]>(response);
  },

  async getCountry(id: number): Promise<Country> {
    const response = await authenticatedFetch(`${API_BASE_URL}/countries/${id}/`);
    return handleResponse<Country>(response);
  },

  async createCountry(data: CountryPayload): Promise<Country> {
    const response = await authenticatedFetch(`${API_BASE_URL}/countries/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Country>(response);
  },

  async updateCountry(id: number, data: Partial<CountryPayload>): Promise<Country> {
    const response = await authenticatedFetch(`${API_BASE_URL}/countries/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Country>(response);
  },

  async deleteCountry(id: number): Promise<void> {
    const response = await authenticatedFetch(`${API_BASE_URL}/countries/${id}/`, {
      method: 'DELETE',
    });
    return handleResponse<void>(response);
  },
});

export type CountriesApi = ReturnType<typeof createCountriesApi>;
