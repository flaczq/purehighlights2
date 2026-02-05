import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SettingsContextType {
    isSpoilerFree: boolean;
    toggleSpoilerFree: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [isSpoilerFree, setIsSpoilerFree] = useState(true);

    const toggleSpoilerFree = () => {
        setIsSpoilerFree(prev => !prev);
    };

    return (
        <SettingsContext.Provider value={{
            isSpoilerFree,
            toggleSpoilerFree
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
