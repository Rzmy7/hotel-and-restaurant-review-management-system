import React from 'react';
import { PageHeader } from './ui/PageHeader';

interface SettingsHeaderProps {
    // onMenuClick removed — sidebar toggle is now built into the sidebar itself
}

const SettingsHeader: React.FC<SettingsHeaderProps> = () => {
    return (
        <PageHeader
            title="Settings"
            description="Manage your account and application preferences"
        />
    );
};

export default SettingsHeader;
