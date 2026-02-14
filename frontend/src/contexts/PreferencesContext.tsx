import React, { createContext, useState, useEffect, useContext, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'en' | 'es' | 'fr' | 'de';
  timezone: string;
  date_format: 'mdy' | 'dmy' | 'ymd';
  time_format: '12' | '24';
  default_location: number | null;
  default_location_name?: string;
  default_booking_duration: number;
}

interface PreferencesContextType {
  preferences: UserPreferences | null;
  loading: boolean;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  formatDate: (date: Date) => string;
  formatTime: (date: Date) => string;
}

const PreferencesContext = createContext<PreferencesContextType | null>(null);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const defaultPreferences: UserPreferences = {
  theme: 'auto',
  language: 'en',
  timezone: 'UTC',
  date_format: 'mdy',
  time_format: '12',
  default_location: null,
  default_booking_duration: 8,
};

export const PreferencesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { authenticatedFetch, user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    } else {
      setPreferences(defaultPreferences);
      setLoading(false);
    }
  }, [user]);

  // Apply theme when preferences change
  useEffect(() => {
    if (preferences) {
      applyTheme(preferences.theme);
    }
  }, [preferences?.theme]);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await authenticatedFetch(`${API_BASE_URL}/preferences/me/`);
      const data = await response.json();
      setPreferences(data);
    } catch (error) {
      console.error('Error fetching preferences:', error);
      setPreferences(defaultPreferences);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/preferences/update_preferences/`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      } else {
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  };

  const applyTheme = (theme: 'light' | 'dark' | 'auto') => {
    const root = document.documentElement;
    
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', theme);
    }
  };

  const formatDate = (date: Date): string => {
    if (!preferences) return date.toLocaleDateString();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    switch (preferences.date_format) {
      case 'mdy':
        return `${month}/${day}/${year}`;
      case 'dmy':
        return `${day}/${month}/${year}`;
      case 'ymd':
        return `${year}-${month}-${day}`;
      default:
        return date.toLocaleDateString();
    }
  };

  const formatTime = (date: Date): string => {
    if (!preferences) return date.toLocaleTimeString();

    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');

    if (preferences.time_format === '24') {
      return `${String(hours).padStart(2, '0')}:${minutes}`;
    } else {
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes} ${period}`;
    }
  };

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        loading,
        updatePreferences,
        formatDate,
        formatTime,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return context;
};