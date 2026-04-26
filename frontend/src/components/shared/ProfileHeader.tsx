import React from "react";
import { PageHeader } from "../ui/PageHeader";

interface ProfileHeaderProps {
  title: string;
  subtitle: string;
  // onMenuClick removed — sidebar toggle is now built into the sidebar itself
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ title, subtitle }) => {
  return <PageHeader title={title} description={subtitle} />;
};

export default ProfileHeader;
