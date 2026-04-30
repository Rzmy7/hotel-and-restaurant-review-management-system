import { useEffect, useState } from 'react';

import {
    SYSTEM_TIMEZONE_STORAGE_KEY,
    SYSTEM_TIMEZONE_UPDATED_EVENT,
    getStoredSystemTimezone,
} from '../services/settingsService';

export const useSystemTimezone = (): string => {
    const [timezone, setTimezone] = useState<string>(getStoredSystemTimezone());

    useEffect(() => {
        const onTimezoneUpdated: EventListener = (event) => {
            const customEvent = event as CustomEvent<string>;
            setTimezone((customEvent.detail || Intl.DateTimeFormat().resolvedOptions().timeZone).trim() || Intl.DateTimeFormat().resolvedOptions().timeZone);
        };

        const onStorageUpdated = (event: StorageEvent) => {
            if (event.key === SYSTEM_TIMEZONE_STORAGE_KEY) {
                setTimezone((event.newValue || Intl.DateTimeFormat().resolvedOptions().timeZone).trim() || Intl.DateTimeFormat().resolvedOptions().timeZone);
            }
        };

        window.addEventListener(SYSTEM_TIMEZONE_UPDATED_EVENT, onTimezoneUpdated);
        window.addEventListener('storage', onStorageUpdated);

        return () => {
            window.removeEventListener(SYSTEM_TIMEZONE_UPDATED_EVENT, onTimezoneUpdated);
            window.removeEventListener('storage', onStorageUpdated);
        };
    }, []);

    return timezone;
};
