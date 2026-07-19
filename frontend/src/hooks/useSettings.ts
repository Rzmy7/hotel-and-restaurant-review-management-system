// Manage all settings-related logic (fetching, updating, uploading, etc.) in one place.

import { useState, useEffect, useCallback } from 'react';
import { settingsService } from '../services/settingsService';
import type { SettingsData } from '../types/settings';
import { useToast } from '../contexts/ToastContext';
import type { PasswordChangePayload } from '../api/settingsApi';
import { useOrganizationStore } from '../stores/useOrganizationStore';

// State Management
export const useSettings = () => {
    const [data, setData] = useState<SettingsData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const { showToast } = useToast();
    const currentOrg = useOrganizationStore(state => state.currentOrg);
    const organizationId = currentOrg?.id;

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
    }, [showToast, organizationId]);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const updateSettings = useCallback(async (updates: Partial<SettingsData>) => {
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
    }, [showToast]);

    const uploadOrganizationLogo = useCallback(async (file: File) => {
        try {
            const logoUrl = await settingsService.uploadOrganizationLogo(file);
            setData((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    organizationInfo: {
                        ...prev.organizationInfo,
                        logoUrl,
                    },
                };
            });
            showToast('Organization logo uploaded successfully', 'success');
            return logoUrl;
        } catch (err) {
            showToast('Failed to upload organization logo', 'error');
            throw err;
        }
    }, [showToast]);

    const changePassword = useCallback(async (payload: PasswordChangePayload) => {
        const message = await settingsService.changePassword(payload);
        return message;
    }, []);

    const uploadRulesFile = useCallback(async (file: File) => {
        try {
            const result = await settingsService.uploadRulesFile(file);
            showToast(`${result.rules_extracted} rules extracted and processed`, 'success');
            return result;
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to process rules file', 'error');
            throw err;
        }
    }, [showToast]);

    const fetchOrganizationRules = useCallback(async () => {
        return await settingsService.fetchOrganizationRules();
    }, []);

    const addOrganizationRule = useCallback(async (ruleText: string) => {
        try {
            const rule = await settingsService.addOrganizationRule(ruleText);
            showToast('Rule added successfully', 'success');
            return rule;
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to add rule', 'error');
            throw err;
        }
    }, [showToast]);

    const deleteOrganizationRule = useCallback(async (ruleId: string) => {
        try {
            await settingsService.deleteOrganizationRule(ruleId);
            showToast('Rule deleted successfully', 'success');
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to delete rule', 'error');
            throw err;
        }
    }, [showToast]);

    const fetchOrganizationTypes = useCallback(async () => {
        return await settingsService.fetchOrganizationTypes();
    }, []);

    return {
        data,
        loading,
        saving,
        error,
        refreshData: loadSettings,
        updateSettings,
        uploadOrganizationLogo,
        changePassword,
        uploadRulesFile,
        fetchOrganizationRules,
        addOrganizationRule,
        deleteOrganizationRule,
        fetchOrganizationTypes,
    };
};
