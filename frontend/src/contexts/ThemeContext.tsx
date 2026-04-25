import React, { createContext, useContext, useEffect, useState } from 'react';
import { featureFlagService } from '../services/featureFlagService';

type Theme = 'dark' | 'light' | 'system';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    darkModeAllowed: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({
    children,
    defaultTheme = 'system',
    storageKey = 'vite-ui-theme'
}: {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
}) {
    const [theme, setThemeState] = useState<Theme>(
        () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
    );
    const [darkModeAllowed, setDarkModeAllowed] = useState(true);

    // Check the dark mode feature flag on mount
    useEffect(() => {
        featureFlagService.isDarkModeEnabled().then((enabled) => {
            setDarkModeAllowed(enabled);
            if (!enabled) {
                // Force light theme when dark mode is disabled by admin
                setThemeState('light');
            }
        });
    }, []);

    // Apply the theme class to the document root
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');

        // If dark mode is not allowed, always use light
        if (!darkModeAllowed) {
            root.classList.add('light');
            return;
        }

        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
                .matches
                ? 'dark'
                : 'light';

            root.classList.add(systemTheme);
            return;
        }

        root.classList.add(theme);
    }, [theme, darkModeAllowed]);

    // Listen to system changes if we are currently using system logic
    useEffect(() => {
        if (!darkModeAllowed || theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = () => {
            const root = window.document.documentElement;
            root.classList.remove('light', 'dark');
            root.classList.add(mediaQuery.matches ? 'dark' : 'light');
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme, darkModeAllowed]);

    const value = {
        theme: darkModeAllowed ? theme : 'light',
        darkModeAllowed,
        setTheme: (newTheme: Theme) => {
            if (!darkModeAllowed) return; // Block theme changes when dark mode is disabled
            localStorage.setItem(storageKey, newTheme);
            setThemeState(newTheme);
        },
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeContext);

    if (context === undefined)
        throw new Error('useTheme must be used within a ThemeProvider');

    return context;
};
