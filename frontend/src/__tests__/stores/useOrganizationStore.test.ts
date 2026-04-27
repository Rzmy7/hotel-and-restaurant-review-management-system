/**
 * Unit tests for useOrganizationStore (Zustand store).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useOrganizationStore } from '../../stores/useOrganizationStore';


describe('useOrganizationStore', () => {
    beforeEach(() => {
        // Reset store state
        useOrganizationStore.setState({
            organizations: [],
            currentOrg: null,
            loading: true,
            error: null,
            hasOrganization: false,
        });
        localStorage.clear();
    });

    // ── Initial state ────────────────────────────────────────────

    it('has empty initial organizations', () => {
        const state = useOrganizationStore.getState();
        expect(state.organizations).toEqual([]);
    });

    it('has null initial currentOrg', () => {
        const state = useOrganizationStore.getState();
        expect(state.currentOrg).toBeNull();
    });

    it('is initially loading', () => {
        const state = useOrganizationStore.getState();
        expect(state.loading).toBe(true);
    });

    it('has no initial error', () => {
        const state = useOrganizationStore.getState();
        expect(state.error).toBeNull();
    });

    it('initially has no organization', () => {
        const state = useOrganizationStore.getState();
        expect(state.hasOrganization).toBe(false);
    });


    // ── fetchOrganizations ───────────────────────────────────────

    it('loads organizations from localStorage', async () => {
        const orgs = [
            { organization_id: 'org-1', organization_name: 'Hotel Alpha', status: 'Active' },
            { organization_id: 'org-2', organization_name: 'Hotel Beta', status: 'Active' },
        ];
        localStorage.setItem('organizations', JSON.stringify(orgs));

        await useOrganizationStore.getState().fetchOrganizations();

        const state = useOrganizationStore.getState();
        expect(state.organizations).toHaveLength(2);
        expect(state.organizations[0].id).toBe('org-1');
        expect(state.organizations[0].name).toBe('Hotel Alpha');
        expect(state.hasOrganization).toBe(true);
        expect(state.loading).toBe(false);
    });

    it('selects first org as current when none saved', async () => {
        const orgs = [
            { organization_id: 'org-1', organization_name: 'Hotel Alpha' },
        ];
        localStorage.setItem('organizations', JSON.stringify(orgs));

        await useOrganizationStore.getState().fetchOrganizations();

        const state = useOrganizationStore.getState();
        expect(state.currentOrg?.id).toBe('org-1');
    });

    it('restores saved current organization', async () => {
        const orgs = [
            { organization_id: 'org-1', organization_name: 'Alpha' },
            { organization_id: 'org-2', organization_name: 'Beta' },
        ];
        localStorage.setItem('organizations', JSON.stringify(orgs));
        localStorage.setItem('current_organization', 'org-2');

        await useOrganizationStore.getState().fetchOrganizations();

        expect(useOrganizationStore.getState().currentOrg?.id).toBe('org-2');
    });

    it('handles empty localStorage gracefully', async () => {
        await useOrganizationStore.getState().fetchOrganizations();

        const state = useOrganizationStore.getState();
        expect(state.organizations).toEqual([]);
        expect(state.currentOrg).toBeNull();
        expect(state.hasOrganization).toBe(false);
        expect(state.loading).toBe(false);
    });

    it('handles corrupt JSON gracefully', async () => {
        localStorage.setItem('organizations', 'NOT_VALID_JSON');

        await useOrganizationStore.getState().fetchOrganizations();

        const state = useOrganizationStore.getState();
        expect(state.organizations).toEqual([]);
        expect(state.hasOrganization).toBe(false);
    });


    // ── switchOrganization ───────────────────────────────────────

    it('switches to a valid organization', async () => {
        const orgs = [
            { organization_id: 'org-1', organization_name: 'Alpha' },
            { organization_id: 'org-2', organization_name: 'Beta' },
        ];
        localStorage.setItem('organizations', JSON.stringify(orgs));
        await useOrganizationStore.getState().fetchOrganizations();

        useOrganizationStore.getState().switchOrganization('org-2');

        expect(useOrganizationStore.getState().currentOrg?.id).toBe('org-2');
        expect(localStorage.getItem('current_organization')).toBe('org-2');
    });

    it('does nothing for non-existent org ID', async () => {
        const orgs = [{ organization_id: 'org-1', organization_name: 'Alpha' }];
        localStorage.setItem('organizations', JSON.stringify(orgs));
        await useOrganizationStore.getState().fetchOrganizations();

        useOrganizationStore.getState().switchOrganization('non-existent');

        expect(useOrganizationStore.getState().currentOrg?.id).toBe('org-1');
    });
});
