import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface NavigationBlockerContextType {
    isDirty: boolean;
    setIsDirty: (isDirty: boolean) => void;
    // When a navigation is attempted, it calls this. If it returns false, the navigation shouldn't proceed.
    attemptNavigation: (targetPath: string) => boolean;
    // Callback to register a handler that shows the modal
    registerBlockHandler: (handler: (targetPath: string) => void) => void;
    unregisterBlockHandler: () => void;
}

const NavigationBlockerContext = createContext<NavigationBlockerContextType | undefined>(undefined);

export const NavigationBlockerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isDirty, setIsDirty] = useState(false);
    const [blockHandler, setBlockHandler] = useState<((targetPath: string) => void) | null>(null);

    const attemptNavigation = useCallback((targetPath: string) => {
        if (isDirty && blockHandler) {
            blockHandler(targetPath);
            return false; // Prevent immediate navigation
        }
        return true; // Allow navigation
    }, [isDirty, blockHandler]);

    const registerBlockHandler = useCallback((handler: (targetPath: string) => void) => {
        setBlockHandler(() => handler);
    }, []);

    const unregisterBlockHandler = useCallback(() => {
        setBlockHandler(null);
    }, []);

    return (
        <NavigationBlockerContext.Provider value={{
            isDirty,
            setIsDirty,
            attemptNavigation,
            registerBlockHandler,
            unregisterBlockHandler
        }}>
            {children}
        </NavigationBlockerContext.Provider>
    );
};

export const useNavigationBlocker = () => {
    const context = useContext(NavigationBlockerContext);
    if (context === undefined) {
        throw new Error('useNavigationBlocker must be used within a NavigationBlockerProvider');
    }
    return context;
};
