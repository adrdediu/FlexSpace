import React, {createContext, useContext, useState, useEffect, type ReactNode} from 'react';
import { myLightTheme, myDarkTheme} from '../theme/themeConfig';

type ThemeMode = 'light' | 'dark' | 'auto';

export interface ThemeContextType {
    theme: any;
    themeMode: ThemeMode;
    effectiveMode: 'light' | 'dark'; // The actual applied theme (auto resolved)
    toggleTheme: () => void;
    setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({children}) => {

    const getInitialTheme = (): ThemeMode => {
        const savedTheme = localStorage.getItem('theme') as ThemeMode;
        if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
            return savedTheme;
        }
        return 'auto';
    };

    const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialTheme);
    const [systemPrefersDark, setSystemPrefersDark] = useState(() => 
        window.matchMedia('(prefers-color-scheme: dark)').matches
    );

    // Compute the effective theme (resolve 'auto' to 'light' or 'dark')
    const effectiveMode: 'light' | 'dark' = themeMode === 'auto' 
        ? (systemPrefersDark ? 'dark' : 'light')
        : themeMode;

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', effectiveMode);
        localStorage.setItem('theme', themeMode);

        const appliedTheme = effectiveMode === 'dark' ? myDarkTheme : myLightTheme;
        document.body.style.backgroundColor = appliedTheme.colorNeutralBackground1;
        document.body.style.color = appliedTheme.colorNeutralForeground1;
    }, [effectiveMode, themeMode]);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e: MediaQueryListEvent) => {
            setSystemPrefersDark(e.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const toggleTheme = () => {
        setThemeMode(prev => {
            if (prev === 'light') return 'dark';
            if (prev === 'dark') return 'auto';
            return 'light';
        });
    };

    const setTheme = (mode: ThemeMode) => {
        setThemeMode(mode);
    };

    const theme = effectiveMode === 'dark' ? myDarkTheme : myLightTheme;

    return (
        <ThemeContext.Provider value={{ themeMode, effectiveMode, toggleTheme, setTheme, theme}}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if(context === undefined) {
        throw new Error('useTheme must be used within Theme Provider');
    }
    return context;
}