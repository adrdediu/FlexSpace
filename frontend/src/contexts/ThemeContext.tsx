import React, {createContext, useContext, useState, useEffect, type ReactNode} from 'react';
import { myLightTheme, myDarkTheme} from '../theme/themeConfig';

type ThemeMode = 'light' | 'dark';

export interface ThemeContextType {
    theme: any;
    themeMode: string;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({children}) => {

    const getInitialTheme = (): ThemeMode => {
        const savedTheme = localStorage.getItem('theme') as ThemeMode;
        if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
            return savedTheme;
        }

        if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }

        return 'light';
    };

    const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialTheme);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', themeMode);
        localStorage.setItem('theme', themeMode);

        document.body.style.backgroundColor =
            themeMode === 'dark' ? myDarkTheme.colorNeutralBackground1 : myLightTheme.colorNeutralBackground1;
        document.body.style.color =
            themeMode === 'dark' ? myDarkTheme.colorNeutralForeground1: myLightTheme.colorNeutralForeground1;
    }, [themeMode]);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = () => {
            if(localStorage.getItem('theme')) return;
            setThemeMode(mediaQuery.matches ? 'dark': 'light');
        }

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const toggleTheme = () => {
        setThemeMode(prev => (prev === 'light' ? 'dark' : 'light'));
    };

    const theme = themeMode === 'dark' ? myDarkTheme : myLightTheme;

    return (
        <ThemeContext.Provider value={{ themeMode, toggleTheme, theme}}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if(context === undefined) {
        throw new Error('useTheme must be used within Theme Provider');
    }
    return context;
}