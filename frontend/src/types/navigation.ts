import type { ReactNode } from "react";

export interface SidebarItemData {
  id: string;
  label: string;
  icon: ReactNode;
  path?: string;
  badge?: string;
  isDanger?: boolean;
}

export interface SidebarGroupData {
  id: string;
  label?: string;
  items: SidebarItemData[];
}

export interface NavigationConfig {
  sections: SidebarGroupData[];
  footer: SidebarItemData[];
}
