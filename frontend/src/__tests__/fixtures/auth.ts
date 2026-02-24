// src/__tests__/fixtures/auth.ts
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for user/response shapes used across auth test suites.
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_USER = {
  username: 'jdoe',
  first_name: 'John',
  last_name: 'Doe',
  email: 'jdoe@example.com',
  is_staff: false,
  is_superuser: false,
  is_location_manager: false,
  is_room_manager: false,
  is_any_manager: false,
  role: 'employee',
  groups: ['Engineering'],
};

export const MOCK_ADMIN_USER = {
  ...MOCK_USER,
  username: 'admin',
  email: 'admin@example.com',
  is_staff: true,
  is_superuser: true,
  is_any_manager: true,
  role: 'admin',
  groups: ['Admins'],
};

export const MOCK_LOGIN_RESPONSE = {
  ...MOCK_USER,
  access: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Create a minimal Response-like object that `fetch` can resolve to. */
export function mockResponse(
  body: unknown,
  status = 200,
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
    headers: new Headers(),
  } as unknown as Response;
}

/** Convenience: a response that rejects .json() (network noise simulation). */
export function mockNetworkError(message = 'Network error'): never {
  throw new Error(message);
}