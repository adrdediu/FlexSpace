import React, { createContext, useState, useEffect, useContext, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';

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
  getTimezoneAbbreviation: (date: Date) => string;
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
  const { setTheme } = useTheme();
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

  // Sync theme with ThemeContext when preferences change
  useEffect(() => {
    if (preferences?.theme) {
      setTheme(preferences.theme);
    }
  }, [preferences?.theme, setTheme]);

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

  const formatDate = (date: Date): string => {
    if (!preferences) return date.toLocaleDateString();

    try {
      // Convert to user's timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: preferences.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });

      const parts = formatter.formatToParts(date);
      const year = parts.find(p => p.type === 'year')?.value || '';
      const month = parts.find(p => p.type === 'month')?.value || '';
      const day = parts.find(p => p.type === 'day')?.value || '';

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
    } catch (error) {
      console.error('Error formatting date:', error);
      return date.toLocaleDateString();
    }
  };

  const formatTime = (date: Date): string => {
    if (!preferences) return date.toLocaleTimeString();

    try {
      // Convert to user's timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: preferences.timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: preferences.time_format === '12',
      });

      return formatter.format(date);
    } catch (error) {
      console.error('Error formatting time:', error);
      return date.toLocaleTimeString();
    }
  };

  const getTimezoneAbbreviation = (date: Date): string => {
    if (!preferences) return '';

    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: preferences.timezone,
        timeZoneName: 'short',
      });

      const parts = formatter.formatToParts(date);
      const timeZonePart = parts.find(p => p.type === 'timeZoneName');
      return timeZonePart?.value || '';
    } catch (error) {
      console.error('Error getting timezone:', error);
      return '';
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
        getTimezoneAbbreviation,
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