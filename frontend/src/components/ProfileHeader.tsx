import React from "react";
import { Menu } from "lucide-react";
import "./ProfileHeader.css";

interface ProfileHeaderProps {
  title: string;
  subtitle: string;
  onMenuClick?: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  title,
  subtitle,
  onMenuClick,
}) => {
  return (
    <div className="profile-header">
      <div className="profile-header-content">
        <button className="menu-btn" onClick={onMenuClick}>
          <Menu size={24} />
        </button>
        <div className="profile-header-text">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
