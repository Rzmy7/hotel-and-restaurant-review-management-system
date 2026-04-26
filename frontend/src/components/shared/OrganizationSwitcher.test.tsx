import { render, screen, fireEvent } from '@testing-library/react';
import OrganizationSwitcher from './OrganizationSwitcher';
import { describe, it, expect, vi } from 'vitest';

describe('OrganizationSwitcher Component', () => {
  const currentOrg = { id: '1', name: 'Org 1', status: 'Active' };
  const organizations = [
    { id: '1', name: 'Org 1', status: 'Active' },
    { id: '2', name: 'Org 2', status: 'Active' },
  ];
  const onSwitch = vi.fn();
  const onAdd = vi.fn();

  it('renders the current organization name', () => {
    render(
      <OrganizationSwitcher
        currentOrg={currentOrg}
        organizations={organizations}
        onSwitch={onSwitch}
        onAdd={onAdd}
      />
    );
    expect(screen.getByText('Org 1')).toBeInTheDocument();
  });

  it('opens dropdown when clicked', () => {
    render(
      <OrganizationSwitcher
        currentOrg={currentOrg}
        organizations={organizations}
        onSwitch={onSwitch}
        onAdd={onAdd}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /org 1/i }));
    expect(screen.getByText('Your Organizations')).toBeInTheDocument();
    expect(screen.getByText('Org 2')).toBeInTheDocument();
  });

  it('calls onSwitch when an organization is selected', () => {
    render(
      <OrganizationSwitcher
        currentOrg={currentOrg}
        organizations={organizations}
        onSwitch={onSwitch}
        onAdd={onAdd}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /org 1/i }));
    fireEvent.click(screen.getByText('Org 2'));
    expect(onSwitch).toHaveBeenCalledWith('2');
  });

  it('calls onAdd when "Add New Organization" is clicked', () => {
    render(
      <OrganizationSwitcher
        currentOrg={currentOrg}
        organizations={organizations}
        onSwitch={onSwitch}
        onAdd={onAdd}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /org 1/i }));
    fireEvent.click(screen.getByText('Add New Organization'));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
