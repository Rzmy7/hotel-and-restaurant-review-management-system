import { useEffect, useState } from "react";

import {
  SYSTEM_TIMEZONE_STORAGE_KEY,
  SYSTEM_TIMEZONE_UPDATED_EVENT,
  getStoredSystemTimezone,
} from "../services/settingsService";

export const useSystemTimezone = (): string => {
  const [timezone, setTimezone] = useState<string>(getStoredSystemTimezone());

  useEffect(() => {
    const onTimezoneUpdated: EventListener = (event) => {
      const customEvent = event as CustomEvent<string>;
      setTimezone((customEvent.detail || "UTC").trim() || "UTC");
    };

    const onStorageUpdated = (event: StorageEvent) => {
      if (event.key === SYSTEM_TIMEZONE_STORAGE_KEY) {
        setTimezone((event.newValue || "UTC").trim() || "UTC");
      }
    };

    window.addEventListener(SYSTEM_TIMEZONE_UPDATED_EVENT, onTimezoneUpdated);
    window.addEventListener("storage", onStorageUpdated);

    return () => {
      window.removeEventListener(
        SYSTEM_TIMEZONE_UPDATED_EVENT,
        onTimezoneUpdated,
      );
      window.removeEventListener("storage", onStorageUpdated);
    };
  }, []);

  return timezone;
};
