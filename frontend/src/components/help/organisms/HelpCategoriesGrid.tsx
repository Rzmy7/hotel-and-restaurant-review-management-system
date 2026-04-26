import React from "react";
import { Layout, Shield, Zap, BarChart3, Users, Settings } from "lucide-react";
import HelpCategoryCard from "../molecules/HelpCategoryCard";

const categories = [
  {
    icon: <Layout size={28} />,
    title: "Dashboard Basics",
    description:
      "Learn how to navigate and customize your main analytics view.",
    count: 12,
  },
  {
    icon: <Shield size={28} />,
    title: "Auth & Security",
    description: "Manage your account, permissions, and session security.",
    count: 8,
  },
  {
    icon: <Zap size={28} />,
    title: "Automation",
    description: "Set up AI auto-replies and scheduled review scraping.",
    count: 15,
  },
  {
    icon: <BarChart3 size={28} />,
    title: "Advanced Insights",
    description: "Deep dive into sentiment analysis and trend reporting.",
    count: 20,
  },
  {
    icon: <Users size={28} />,
    title: "Team Management",
    description: "Collaborate with staff and manage organizational roles.",
    count: 6,
  },
  {
    icon: <Settings size={28} />,
    title: "API & Integrations",
    description: "Connect external sources and export your review data.",
    count: 14,
  },
];

const HelpCategoriesGrid: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {categories.map((cat, i) => (
        <HelpCategoryCard key={i} {...cat} onClick={() => {}} />
      ))}
    </div>
  );
};

export default HelpCategoriesGrid;
