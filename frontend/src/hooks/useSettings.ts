import { useState, useEffect, useCallback } from 'react';
import { settingsService } from '../services/settingsService';
import type { SettingsData } from '../types/settings';
import { useToast } from '../contexts/ToastContext';

export const useSettings = () => {
    const [data, setData] = useState<SettingsData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const { showToast } = useToast();

    const loadSettings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const settings = await settingsService.getSettings();
            setData(settings);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            showToast('Failed to load settings', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const updateSettings = async (updates: Partial<SettingsData>) => {
        setSaving(true);
        try {
            const newSettings = await settingsService.updateSettings(updates);
            setData(newSettings);
            showToast('Settings saved successfully', 'success');
            return true;
        } catch (err) {
            showToast('Failed to save settings', 'error');
            return false;
        } finally {
            setSaving(false);
        }
    };

    return {
        data,
        loading,
        saving,
        error,
        refreshData: loadSettings,
        updateSettings
    };
};
