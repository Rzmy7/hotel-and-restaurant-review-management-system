import { useOrganizationStore } from './useOrganizationStore';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('useOrganizationStore', () => {
  const mockOrgs = [
    { organization_id: '1', organization_name: 'Org 1', status: 'Active' },
    { organization_id: '2', organization_name: 'Org 2', status: 'Active' },
  ];

  beforeEach(() => {
    localStorage.clear();
    // Reset store state manually because Zustand stores are singletons
    useOrganizationStore.setState({
      organizations: [],
      currentOrg: null,
      loading: true,
      error: null,
      hasOrganization: false,
    });
  });

  it('should initialize with default state', () => {
    const state = useOrganizationStore.getState();
    expect(state.organizations).toEqual([]);
    expect(state.loading).toBe(true);
  });

  it('should fetch organizations from localStorage', async () => {
    localStorage.setItem('organizations', JSON.stringify(mockOrgs));
    localStorage.setItem('current_organization', '1');

    await useOrganizationStore.getState().fetchOrganizations();

    const state = useOrganizationStore.getState();
    expect(state.organizations).toHaveLength(2);
    expect(state.currentOrg?.id).toBe('1');
    expect(state.hasOrganization).toBe(true);
    expect(state.loading).toBe(false);
  });

  it('should handle missing current_organization by selecting the first one', async () => {
    localStorage.setItem('organizations', JSON.stringify(mockOrgs));

    await useOrganizationStore.getState().fetchOrganizations();

    const state = useOrganizationStore.getState();
    expect(state.currentOrg?.id).toBe('1');
  });

  it('should switch organization and update localStorage', () => {
    localStorage.setItem('organizations', JSON.stringify(mockOrgs));
    useOrganizationStore.setState({
      organizations: mockOrgs.map(o => ({ id: o.organization_id, name: o.organization_name, status: o.status })),
    });

    useOrganizationStore.getState().switchOrganization('2');

    expect(useOrganizationStore.getState().currentOrg?.id).toBe('2');
    expect(localStorage.getItem('current_organization')).toBe('2');
  });

  it('should handle fetch errors', async () => {
    // Malformed JSON in localStorage
    localStorage.setItem('organizations', 'invalid-json');

    await useOrganizationStore.getState().fetchOrganizations();

    const state = useOrganizationStore.getState();
    expect(state.organizations).toEqual([]);
    expect(state.hasOrganization).toBe(false);
  });
});
