const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface GroupMember {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
}

export interface UserGroupList {
  id: number;
  name: string;
  description: string;
  location: number;
  location_name: string;
  member_count: number;
  created_by: number;
  created_by_username: string;
  created_at: string;
  updated_at: string;
}

export interface UserGroupDetail {
  id: number;
  name: string;
  description: string;
  location: number;
  location_name: string;
  members: GroupMember[];
  created_by: number;
  created_by_username: string;
  created_at: string;
  updated_at: string;
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.detail || `HTTP ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
};

export const createUserGroupApi = (
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>
) => ({
  async getGroups(): Promise<UserGroupList[]> {
    const response = await authenticatedFetch(`${API_BASE_URL}/usergroups/`);
    return handleResponse<UserGroupList[]>(response);
  },

  async getGroupsByLocation(locationId: number): Promise<UserGroupList[]> {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/usergroups/by_location/?location_id=${locationId}`
    );
    return handleResponse<UserGroupList[]>(response);
  },

  async getGroup(id: number): Promise<UserGroupDetail> {
    const response = await authenticatedFetch(`${API_BASE_URL}/usergroups/${id}/`);
    return handleResponse<UserGroupDetail>(response);
  },

  async createGroup(data: {
    name: string;
    description: string;
    location: number;
  }): Promise<UserGroupDetail> {
    const response = await authenticatedFetch(`${API_BASE_URL}/usergroups/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<UserGroupDetail>(response);
  },

  async updateGroup(
    id: number,
    data: { name?: string; description?: string }
  ): Promise<UserGroupDetail> {
    const response = await authenticatedFetch(`${API_BASE_URL}/usergroups/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<UserGroupDetail>(response);
  },

  async deleteGroup(id: number): Promise<void> {
    const response = await authenticatedFetch(`${API_BASE_URL}/usergroups/${id}/`, {
      method: 'DELETE',
    });
    return handleResponse<void>(response);
  },

  async addMembers(id: number, userIds: number[]): Promise<UserGroupDetail> {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/usergroups/${id}/add_members/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: userIds }),
      }
    );
    return handleResponse<UserGroupDetail>(response);
  },

  async removeMembers(id: number, userIds: number[]): Promise<UserGroupDetail> {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/usergroups/${id}/remove_members/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: userIds }),
      }
    );
    return handleResponse<UserGroupDetail>(response);
  },
});

export type UserGroupApi = ReturnType<typeof createUserGroupApi>;
