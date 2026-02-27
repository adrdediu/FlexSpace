// src/__tests__/contexts/AuthContext.test.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Tests are written against the ACTUAL AuthContext behaviour, including its
// known quirks:
//
//   • The init useEffect has [user] in its dep array but is guarded by
//     hasInitialized ref — it only ever runs ONCE per component mount.
//
//   • The refresh-interval useEffect also has [user] as its dep. When user
//     becomes null the interval is cleared; when user becomes non-null a new
//     interval is started. This is intentional debounce-on-login behaviour.
//
//   • authenticatedFetch throws 'Authentication failed' after clearing user
//     on a failed refresh. Callers must catch it.
//
//   • logout() does NOT clear user on failure — only sets the error string.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MOCK_USER, MOCK_LOGIN_RESPONSE, mockResponse } from '../fixtures/auth';

jest.mock('../../services/authService', () => ({
  __esModule: true,
  default: {
    getUserProfile: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
  },
}));

import authService from '../../services/authService';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

const mockedFetch = global.fetch as jest.Mock;
const mockedAuthService = authService as jest.Mocked<typeof authService>;

// ─────────────────────────────────────────────────────────────────────────────
// Test consumer
// ─────────────────────────────────────────────────────────────────────────────

const TestConsumer: React.FC = () => {
  const {
    user, loading, error, isAuthenticated,
    login, logout, authenticatedFetch, clearError,
  } = useAuth();

  const handleFetch = async () => {
    try {
      await authenticatedFetch('/api/test');
    } catch {
      // AuthContext intentionally throws after clearing user on failed refresh.
      // Catch here so it doesn't become an unhandled rejection in the test runner.
    }
  };

  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="isAuthenticated">{String(isAuthenticated)}</span>
      <span data-testid="user">{user ? user.username : 'null'}</span>
      <span data-testid="error">{error ?? 'null'}</span>
      <button onClick={() => login('jdoe', 'pass')} data-testid="login-btn">Login</button>
      <button onClick={() => logout()} data-testid="logout-btn">Logout</button>
      <button onClick={() => clearError()} data-testid="clear-error-btn">Clear Error</button>
      <button onClick={handleFetch} data-testid="fetch-btn">Fetch</button>
    </div>
  );
};

// Each test gets a fresh mount — never share a render across tests.
const renderWithProvider = () =>
  render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>,
  );

// ─────────────────────────────────────────────────────────────────────────────
// Global setup
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockedFetch.mockReset();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// Waits for the async init to settle (loading → false).
const waitForInit = () =>
  waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

// Renders and waits for an authenticated session to be ready.
const renderAuthenticated = async () => {
  mockedAuthService.getUserProfile.mockResolvedValueOnce(MOCK_USER);
  renderWithProvider();
  await waitFor(() =>
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('true'),
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Initialisation
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthProvider — initialisation', () => {
  it('starts in loading state then resolves with user when session exists', async () => {
    mockedAuthService.getUserProfile.mockResolvedValueOnce(MOCK_USER);
    renderWithProvider();

    expect(screen.getByTestId('loading').textContent).toBe('true');

    await waitForInit();

    expect(screen.getByTestId('user').textContent).toBe('jdoe');
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
  });

  it('resolves with null user when no active session', async () => {
    mockedAuthService.getUserProfile.mockResolvedValueOnce(null);
    renderWithProvider();

    await waitForInit();

    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
  });

  it('handles getUserProfile throwing without crashing — user stays null', async () => {
    mockedAuthService.getUserProfile.mockRejectedValueOnce(new Error('Network error'));
    renderWithProvider();

    await waitForInit();

    expect(screen.getByTestId('user').textContent).toBe('null');
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
  });

  it('init useEffect only runs once even though dep array contains [user]', async () => {
    // The hasInitialized ref prevents re-running on subsequent user changes.
    mockedAuthService.getUserProfile.mockResolvedValueOnce(MOCK_USER);
    renderWithProvider();
    await waitForInit();

    // Trigger user change by advancing timers to fire a refresh that fails
    mockedAuthService.refreshToken.mockResolvedValueOnce(false);
    await act(async () => { jest.advanceTimersByTime(4 * 60 * 1000); });
    await waitFor(() =>
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('false'),
    );

    // getUserProfile should have been called exactly once (on mount), not again
    expect(mockedAuthService.getUserProfile).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// login()
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthProvider — login()', () => {
  it('sets user and isAuthenticated=true on successful login', async () => {
    mockedAuthService.getUserProfile.mockResolvedValueOnce(null);
    renderWithProvider();
    await waitForInit();

    mockedAuthService.login.mockResolvedValueOnce(MOCK_LOGIN_RESPONSE);

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.click(screen.getByTestId('login-btn'));

    await waitFor(() =>
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('true'),
    );
    expect(screen.getByTestId('user').textContent).toBe('jdoe');
    expect(screen.getByTestId('error').textContent).toBe('null');
  });

  it('sets error message and keeps user null on failed login', async () => {
    // SW BEHAVIOUR NOTE: login() sets error but does NOT call setUser(null)
    // on failure — user was already null from init, so isAuthenticated stays false.
    mockedAuthService.getUserProfile.mockResolvedValueOnce(null);
    renderWithProvider();
    await waitForInit();

    mockedAuthService.login.mockRejectedValueOnce(new Error('Invalid credentials.'));

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.click(screen.getByTestId('login-btn'));

    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toBe('Invalid credentials.'),
    );
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('clears a previous error before the next login attempt', async () => {
    mockedAuthService.getUserProfile.mockResolvedValueOnce(null);
    renderWithProvider();
    await waitForInit();

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    // First — fail to produce an error
    mockedAuthService.login.mockRejectedValueOnce(new Error('Bad creds'));
    await user.click(screen.getByTestId('login-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toBe('Bad creds'),
    );

    // Second — succeed; error must clear
    mockedAuthService.login.mockResolvedValueOnce(MOCK_LOGIN_RESPONSE);
    await user.click(screen.getByTestId('login-btn'));

    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toBe('null'),
    );
    await waitFor(() =>
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('true'),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// logout()
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthProvider — logout()', () => {
  it('clears user and isAuthenticated on successful logout', async () => {
    await renderAuthenticated();

    mockedAuthService.logout.mockResolvedValueOnce(true);

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.click(screen.getByTestId('logout-btn'));

    await waitFor(() =>
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('false'),
    );
    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('sets error="Logout failed" when authService.logout throws', async () => {
    await renderAuthenticated();

    mockedAuthService.logout.mockRejectedValueOnce(new Error('Server error'));

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.click(screen.getByTestId('logout-btn'));

    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toBe('Logout failed'),
    );
    // SW BEHAVIOUR: logout catch branch only calls setError — setUser(null) is
    // NOT called, so the user remains authenticated after a failed logout call.
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// clearError()
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthProvider — clearError()', () => {
  it('resets error to null', async () => {
    mockedAuthService.getUserProfile.mockResolvedValueOnce(null);
    renderWithProvider();
    await waitForInit();

    mockedAuthService.login.mockRejectedValueOnce(new Error('Some error'));
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.click(screen.getByTestId('login-btn'));
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toBe('Some error'),
    );

    await user.click(screen.getByTestId('clear-error-btn'));

    expect(screen.getByTestId('error').textContent).toBe('null');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// authenticatedFetch()
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthProvider — authenticatedFetch()', () => {
  it('calls fetch once with correct options when response is 200', async () => {
    await renderAuthenticated();
    mockedFetch.mockResolvedValueOnce(mockResponse({ data: 'ok' }, 200));

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.click(screen.getByTestId('fetch-btn'));

    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });

  it('retries once on 401 when refreshToken succeeds', async () => {
    await renderAuthenticated();
    mockedFetch
      .mockResolvedValueOnce(mockResponse({ detail: 'Unauthorized' }, 401))
      .mockResolvedValueOnce(mockResponse({ data: 'ok' }, 200));
    mockedAuthService.refreshToken.mockResolvedValueOnce(true);

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.click(screen.getByTestId('fetch-btn'));

    expect(mockedFetch).toHaveBeenCalledTimes(2);
    // User is still authenticated after a successful token refresh
    expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
  });

  it('clears user and sets session-expired error when 401 and refresh fails', async () => {
    await renderAuthenticated();
    mockedFetch.mockResolvedValueOnce(mockResponse({ detail: 'Unauthorized' }, 401));
    mockedAuthService.refreshToken.mockResolvedValueOnce(false);

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.click(screen.getByTestId('fetch-btn'));

    await waitFor(() =>
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('false'),
    );
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toBe(
        'Session expired. Please log in again.',
      ),
    );
  });

  it('always sends credentials:include and Content-Type header', async () => {
    await renderAuthenticated();
    mockedFetch.mockResolvedValueOnce(mockResponse({}, 200));

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.click(screen.getByTestId('fetch-btn'));

    expect(mockedFetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Token auto-refresh interval (every 4 minutes)
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthProvider — token refresh interval', () => {
  it('calls refreshToken after 4 minutes when user is logged in', async () => {
    await renderAuthenticated();
    mockedAuthService.refreshToken.mockResolvedValue(true);

    await act(async () => {
      jest.advanceTimersByTime(4 * 60 * 1000);
    });

    await waitFor(() =>
      expect(mockedAuthService.refreshToken).toHaveBeenCalledTimes(1),
    );
  });

  it('clears user and sets session-expired error when interval refresh fails', async () => {
    await renderAuthenticated();
    mockedAuthService.refreshToken.mockResolvedValueOnce(false);

    await act(async () => {
      jest.advanceTimersByTime(4 * 60 * 1000);
    });

    await waitFor(() =>
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('false'),
    );
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toMatch(/Session expired/),
    );
  });

  it('does not start refresh interval when user is null', async () => {
    // SW BEHAVIOUR: the refresh useEffect guards with `if(!user) return` so
    // when the session starts unauthenticated no interval is ever registered.
    mockedAuthService.getUserProfile.mockResolvedValueOnce(null);
    renderWithProvider();
    await waitForInit();

    await act(async () => {
      jest.advanceTimersByTime(4 * 60 * 1000);
    });

    // refreshToken must not have been called by the interval
    expect(mockedAuthService.refreshToken).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// visibilitychange → refreshToken
// ─────────────────────────────────────────────────────────────────────────────

describe('AuthProvider — visibility change refresh', () => {
  it('calls refreshToken when tab becomes visible and user is logged in', async () => {
    await renderAuthenticated();
    mockedAuthService.refreshToken.mockResolvedValue(true);

    await act(async () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });

    expect(mockedAuthService.refreshToken).toHaveBeenCalledTimes(1);
  });

  it('does NOT call refreshToken when tab becomes hidden', async () => {
    await renderAuthenticated();

    await act(async () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });

    expect(mockedAuthService.refreshToken).not.toHaveBeenCalled();
  });

  it('does NOT call refreshToken when visible but user is null', async () => {
    // SW BEHAVIOUR: the visibilitychange handler checks `user` from its
    // closure. When the component mounts unauthenticated, the handler is
    // never registered at all (the effect returns early if !user).
    mockedAuthService.getUserProfile.mockResolvedValueOnce(null);
    renderWithProvider();
    await waitForInit();

    await act(async () => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });

    expect(mockedAuthService.refreshToken).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// useAuth() — hook guard
// ─────────────────────────────────────────────────────────────────────────────

describe('useAuth() outside AuthProvider', () => {
  it('throws a descriptive error when used outside AuthProvider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const ErrorConsumer = () => {
      useAuth();
      return null;
    };

    expect(() => render(<ErrorConsumer />)).toThrow(
      'useAuth must be used within an AuthProvider',
    );
  });
});