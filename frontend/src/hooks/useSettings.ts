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
    const [organizationRules, setOrganizationRules] = useState<Array<{
        rule_id: string;
        rule_text: string;
        rule_order: number;
        is_embedded: boolean;
        source_filename: string | null;
        created_at?: string | null;
    }>>([]);
    const [isLoadingRules, setIsLoadingRules] = useState<boolean>(false);

    const { showToast } = useToast();
    const currentOrg = useOrganizationStore(state => state.currentOrg);
    const organizationId = currentOrg?.id;

    const loadOrganizationRules = useCallback(async (orgId?: string) => {
        const targetOrgId = orgId || organizationId;
        if (!targetOrgId) {
            setOrganizationRules([]);
            return [];
        }
        setIsLoadingRules(true);
        try {
            const rules = await settingsService.fetchOrganizationRules(targetOrgId);
            setOrganizationRules(rules);
            return rules;
        } catch {
            setOrganizationRules([]);
            return [];
        } finally {
            setIsLoadingRules(false);
        }
    }, [organizationId]);

    const loadSettings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [settings, rules] = await Promise.all([
                settingsService.getSettings(organizationId),
                organizationId ? settingsService.fetchOrganizationRules(organizationId) : Promise.resolve([]),
            ]);
            setData(settings);
            setOrganizationRules(rules);
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

    const uploadRulesFile = useCallback(async (file: File, orgId?: string) => {
        try {
            const targetOrgId = orgId || organizationId;
            const result = await settingsService.uploadRulesFile(file, targetOrgId);
            showToast(`${result.rules_extracted} rules extracted and processed`, 'success');
            await loadOrganizationRules(targetOrgId);
            return result;
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to process rules file', 'error');
            throw err;
        }
    }, [showToast, organizationId, loadOrganizationRules]);

    const fetchOrganizationRules = useCallback(async (orgId?: string) => {
        return await loadOrganizationRules(orgId);
    }, [loadOrganizationRules]);

    const addOrganizationRule = useCallback(async (ruleText: string, orgId?: string) => {
        try {
            const targetOrgId = orgId || organizationId;
            const rule = await settingsService.addOrganizationRule(ruleText, targetOrgId);
            setOrganizationRules(prev => [...prev, rule]);
            showToast('Rule added successfully', 'success');
            return rule;
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to add rule', 'error');
            throw err;
        }
    }, [showToast, organizationId]);

    const deleteOrganizationRule = useCallback(async (ruleId: string, orgId?: string) => {
        try {
            const targetOrgId = orgId || organizationId;
            await settingsService.deleteOrganizationRule(ruleId, targetOrgId);
            setOrganizationRules(prev => prev.filter(r => r.rule_id !== ruleId));
            showToast('Rule deleted successfully', 'success');
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to delete rule', 'error');
            throw err;
        }
    }, [showToast, organizationId]);

    const fetchOrganizationTypes = useCallback(async () => {
        return await settingsService.fetchOrganizationTypes();
    }, []);

    return {
        data,
        loading,
        saving,
        error,
        organizationRules,
        setOrganizationRules,
        isLoadingRules,
        refreshRules: loadOrganizationRules,
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
