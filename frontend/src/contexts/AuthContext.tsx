import React, { createContext, useState, useEffect, useContext, type ReactNode, useRef} from 'react';
import authService from '../services/authService';

interface UserInfo {
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    is_staff: boolean;
    is_superuser: boolean;
    is_location_manager: boolean;
    is_room_manager: boolean;
    is_any_manager: boolean;
    role: string;
    groups: string[];
}

interface AuthContextType {
    user: UserInfo | null;
    loading: boolean;
    error: string | null;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => Promise<boolean>;
    isAuthenticated : boolean;
    authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType |null >(null);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({children}) => {
    const [user, setUser] = useState<UserInfo |null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [ error, setError] = useState<string|null>(null);

    const hasInitialized = useRef(false);

    useEffect(() => {
        if(hasInitialized.current) {
            return;
        }
        hasInitialized.current = true;
        const initAuth = async() => {
            try{
                setLoading(true);

                const userProfile = await authService.getUserProfile();

                if(userProfile) {
                    setUser( {
                        username: userProfile.username,
                        first_name: userProfile.first_name,
                        last_name: userProfile.last_name,
                        email: userProfile.email,
                        is_staff: userProfile.is_staff,
                        is_superuser: userProfile.is_superuser,
                        is_location_manager: userProfile.is_location_manager || false,
                        is_room_manager: userProfile.is_room_manager || false,
                        is_any_manager: userProfile.is_any_manager || false,
                        role: userProfile.role,
                        groups: userProfile.groups
                    });
                } else {
                    setUser(null);
                }
            } catch(err) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    },[user]);

    // Auto refresh access token before it expires

    useEffect(() => {
        if(!user) return;

        let refreshIntervalId: number |undefined;
        let isRefreshing = false;

        const refreshAccessToken = async() => {
            if (isRefreshing) return;

            isRefreshing = true;
            try {
                const refreshed = await authService.refreshToken();

                if(!refreshed) {
                    setUser(null);
                    setError('Session expired. Please log in again.');
                } else {
                    // Nothing, token worked
                }
            } catch(err) {
                setUser(null);
                setError('Session expired. Please log in again');
            } finally {
                isRefreshing = false;
            }
        };

        const REFRESH_INTERVAL_MS = 4*60*1000;
        refreshIntervalId = window.setInterval(refreshAccessToken, REFRESH_INTERVAL_MS);

        const handleVisibilityChange = () => {
            if(document.visibilityState === 'visible' && user) {
                /// <reference path="" />
                refreshAccessToken();
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if(refreshIntervalId) {
                window.clearInterval(refreshIntervalId);
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        }
    },[user]);

    const authenticatedFetch = async (
        url:string,
        options: RequestInit = {}
    ) : Promise<Response> => {
        const fetchOptions: RequestInit = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            credentials: 'include',
        };
        let response = await fetch(url, fetchOptions);

        // If unauthorised try to refresh token again once
        if(response.status === 401){
            const refreshed = await authService.refreshToken();

            if(refreshed) {
                response = await fetch(url, fetchOptions);
            } else {
                setUser(null);
                setError('Session expired. Please log in again.');
                throw new Error('Authentication failed');
            }
        }

        return response;
    };

    const login = async (username: string, password: string): Promise<boolean> => {
        try {
            setError(null);
            setLoading(true);

            const data = await authService.login(username,password);

            setUser({
                username: data.username,
                first_name: data.first_name,
                last_name: data.last_name,
                email: data.email,
                is_staff: data.is_staff,
                is_superuser: data.is_superuser,
                is_location_manager: data.is_location_manager || false,
                is_room_manager: data.is_room_manager || false,
                is_any_manager: data.is_any_manager || false,
                role: data.role,
                groups: data.groups
            });
            return true;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message: 'Login failed.Please check your credentials';
            setError(errorMessage);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const logout = async (): Promise<boolean> => {
        try{
            setLoading(true);
            await authService.logout();

            setUser(null);
            setError(null);

            return true;
        } catch (err){
            setError('Logout failed');
            return false;
        } finally {
            setLoading(false);
        }
    };

    const clearError = () => {
        setError(null);
    };

    const value: AuthContextType = {
        user,
        loading,
        error,
        login,
        logout,
        isAuthenticated: !!user,
        authenticatedFetch,
        clearError,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if(!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}