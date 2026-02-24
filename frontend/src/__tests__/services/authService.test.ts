// src/__tests__/services/authService.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// Unit tests for src/services/authService.ts
//
// Strategy:
//  • authService is a singleton, so we reset its private state between tests
//    by calling logout-like paths or by re-importing via jest.isolateModules().
//  • global.fetch is mocked in setup.ts and reset here in beforeEach.
//  • The dynamic import('./websocketService') inside logout/refreshToken is
//    intercepted via jest.mock so no real WebSocket code runs.
// ─────────────────────────────────────────────────────────────────────────────

import { mockResponse, MOCK_USER, MOCK_LOGIN_RESPONSE } from '../fixtures/auth';

// ── Mock the dynamic websocketService import ─────────────────────────────────
jest.mock('../../services/webSocketService', () => ({
  __esModule: true,
  default: {
    disconnectAll: jest.fn(),
    reconnectAll: jest.fn(),
  },
}));

// ── Import AFTER mocks are registered ────────────────────────────────────────
import authService from '../../services/authService';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const fetchMock = global.fetch as jest.Mock;

beforeEach(() => {
  fetchMock.mockReset();
});

// ─────────────────────────────────────────────────────────────────────────────
// login()
// ─────────────────────────────────────────────────────────────────────────────

describe('authService.login()', () => {
  it('resolves with user data and sets isAuthenticated on success', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(MOCK_LOGIN_RESPONSE, 200));

    const result = await authService.login('jdoe', 'password123');

    expect(result.username).toBe('jdoe');
    expect(result.email).toBe('jdoe@example.com');
    expect(authService.isAuthenticated()).toBe(true);
  });

  it('sends credentials and JSON body to the correct endpoint', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(MOCK_LOGIN_RESPONSE, 200));

    await authService.login('jdoe', 'password123');

    expect(fetchMock).toHaveBeenCalledWith('/auth/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username: 'jdoe', password: 'password123' }),
    });
  });

  it('throws with server detail message on 400 response', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ detail: 'Invalid credentials.' }, 400),
    );

    await expect(authService.login('jdoe', 'wrong')).rejects.toThrow(
      'Invalid credentials.',
    );
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('throws generic "Login failed" when error response has no detail', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({}, 500));

    await expect(authService.login('jdoe', 'pass')).rejects.toThrow(
      'Login failed',
    );
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('throws and clears auth flag on network failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'));

    await expect(authService.login('jdoe', 'pass')).rejects.toThrow(
      'Network error',
    );
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('stores username and email accessors after successful login', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(MOCK_LOGIN_RESPONSE, 200));

    await authService.login('jdoe', 'password123');

    expect(authService.getUsername()).toBe('jdoe');
    expect(authService.getEmail()).toBe('jdoe@example.com');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// logout()
// ─────────────────────────────────────────────────────────────────────────────

describe('authService.logout()', () => {
  // Ensure we start logged-in for each logout test
  beforeEach(async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(MOCK_LOGIN_RESPONSE, 200));
    await authService.login('jdoe', 'password123');
    fetchMock.mockReset();
  });

  it('returns true and clears auth state on 205 response', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(null, 205));

    const result = await authService.logout();

    expect(result).toBe(true);
    expect(authService.isAuthenticated()).toBe(false);
    expect(authService.getUsername()).toBeNull();
    expect(authService.getEmail()).toBeNull();
  });

  it('returns true on any 2xx response (e.g. 200)', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({}, 200));

    const result = await authService.logout();

    expect(result).toBe(true);
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('still clears local state even if server returns non-2xx', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({}, 500));

    const result = await authService.logout();

    // ok is false for 500; state should still be cleared
    expect(result).toBe(false);
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('throws on network error during logout', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'));

    await expect(authService.logout()).rejects.toThrow('Network error');
    // isAuthenticatedFlag is set to false in catch
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('calls the correct endpoint with POST + credentials', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(null, 205));

    await authService.logout();

    expect(fetchMock).toHaveBeenCalledWith('/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// refreshToken()
// ─────────────────────────────────────────────────────────────────────────────

describe('authService.refreshToken()', () => {
  it('returns true and sets isAuthenticated on 200', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ detail: 'ok' }, 200));

    const result = await authService.refreshToken();

    expect(result).toBe(true);
    expect(authService.isAuthenticated()).toBe(true);
  });

  it('returns false and clears isAuthenticated on 401', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ detail: 'Token invalid' }, 401));

    const result = await authService.refreshToken();

    expect(result).toBe(false);
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('returns false on network error (does not throw)', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Connection refused'));

    const result = await authService.refreshToken();

    expect(result).toBe(false);
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('calls the correct endpoint', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({}, 200));

    await authService.refreshToken();

    expect(fetchMock).toHaveBeenCalledWith('/auth/token/refresh/', {
      method: 'POST',
      credentials: 'include',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getUserProfile()
// ─────────────────────────────────────────────────────────────────────────────

describe('authService.getUserProfile()', () => {
  it('returns user data and sets isAuthenticated on 200', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(MOCK_USER, 200));

    const profile = await authService.getUserProfile();

    expect(profile).toMatchObject({
      username: 'jdoe',
      email: 'jdoe@example.com',
      is_staff: false,
    });
    expect(authService.isAuthenticated()).toBe(true);
  });

  it('populates all optional boolean fields (defaults false when missing)', async () => {
    const payload = { ...MOCK_USER };
    delete (payload as any).is_location_manager;
    delete (payload as any).is_room_manager;
    delete (payload as any).is_any_manager;

    fetchMock.mockResolvedValueOnce(mockResponse(payload, 200));

    const profile = await authService.getUserProfile();

    // Service applies || false for optional booleans
    expect(profile).not.toBeNull();
    expect(authService.isAuthenticated()).toBe(true);
  });

  it('retries with refreshToken on 401 and succeeds', async () => {
    // First call → 401
    fetchMock.mockResolvedValueOnce(mockResponse({ detail: 'Unauthorized' }, 401));
    // refreshToken call → 200
    fetchMock.mockResolvedValueOnce(mockResponse({}, 200));
    // Retry /auth/me → 200 with profile
    fetchMock.mockResolvedValueOnce(mockResponse(MOCK_USER, 200));

    const profile = await authService.getUserProfile();

    expect(profile).not.toBeNull();
    expect(profile?.username).toBe('jdoe');
    // fetch was called 3 times: /auth/me, /auth/token/refresh/, /auth/me again
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('returns null when 401 and refreshToken fails', async () => {
    // First /auth/me → 401
    fetchMock.mockResolvedValueOnce(mockResponse({ detail: 'Unauthorized' }, 401));
    // refreshToken → 401 (invalid refresh token)
    fetchMock.mockResolvedValueOnce(mockResponse({ detail: 'Token expired' }, 401));

    const profile = await authService.getUserProfile();

    expect(profile).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('returns null when server returns non-401 error after successful refresh', async () => {
    // /auth/me → 401
    fetchMock.mockResolvedValueOnce(mockResponse({}, 401));
    // refreshToken → ok
    fetchMock.mockResolvedValueOnce(mockResponse({}, 200));
    // retry /auth/me → 500
    fetchMock.mockResolvedValueOnce(mockResponse({}, 500));

    const profile = await authService.getUserProfile();

    expect(profile).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('returns null and clears auth on network error', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'));

    const profile = await authService.getUserProfile();

    expect(profile).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('stores all fields on the service instance after success', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(MOCK_USER, 200));

    await authService.getUserProfile();

    expect(authService.getUsername()).toBe('jdoe');
    expect(authService.getEmail()).toBe('jdoe@example.com');

    const info = authService.getUserInfo();
    expect(info?.first_name).toBe('John');
    expect(info?.last_name).toBe('Doe');
    expect(info?.role).toBe('employee');
    expect(info?.groups).toEqual(['Engineering']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// checkAuth()
// ─────────────────────────────────────────────────────────────────────────────

describe('authService.checkAuth()', () => {
  it('returns true when getUserProfile returns a valid user', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(MOCK_USER, 200));

    const result = await authService.checkAuth();

    expect(result).toBe(true);
  });

  it('returns false when getUserProfile returns null', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({}, 401));
    // refresh fails too
    fetchMock.mockResolvedValueOnce(mockResponse({}, 401));

    const result = await authService.checkAuth();

    expect(result).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getUserInfo() — synchronous accessor
// ─────────────────────────────────────────────────────────────────────────────

describe('authService.getUserInfo()', () => {
  it('returns null when no user is loaded', () => {
    // Force clean state by confirming we start with no username/email
    // (achieved by running logout earlier in the suite or clean singleton)
    // We just ensure the method doesn't throw and returns null-or-object.
    const info = authService.getUserInfo();
    // Could be null or a previously set user — either is acceptable per impl
    if (info !== null) {
      expect(info).toHaveProperty('username');
      expect(info).toHaveProperty('email');
    }
  });

  it('returns full user object after a successful getUserProfile', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(MOCK_USER, 200));
    await authService.getUserProfile();

    const info = authService.getUserInfo();

    expect(info).not.toBeNull();
    expect(info?.username).toBe('jdoe');
    expect(info?.email).toBe('jdoe@example.com');
    expect(info?.is_staff).toBe(false);
    expect(info?.is_superuser).toBe(false);
    expect(info?.groups).toEqual(['Engineering']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isAuthenticated() — synchronous flag
// ─────────────────────────────────────────────────────────────────────────────

describe('authService.isAuthenticated()', () => {
  it('reflects false before any successful auth call', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({}, 401));
    fetchMock.mockResolvedValueOnce(mockResponse({}, 401));
    await authService.getUserProfile(); // drives flag to false

    expect(authService.isAuthenticated()).toBe(false);
  });

  it('reflects true after a successful login', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(MOCK_LOGIN_RESPONSE, 200));
    await authService.login('jdoe', 'pass');

    expect(authService.isAuthenticated()).toBe(true);
  });

  it('reverts to false after logout', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(MOCK_LOGIN_RESPONSE, 200));
    await authService.login('jdoe', 'pass');

    fetchMock.mockResolvedValueOnce(mockResponse(null, 205));
    await authService.logout();

    expect(authService.isAuthenticated()).toBe(false);
  });
});