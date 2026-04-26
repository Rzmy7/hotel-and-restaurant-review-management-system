import React from "react";
import { Zap, Award, Crown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface PlanIconProps {
  tier: "starter" | "professional" | "enterprise";
  className?: string;
}

const icons: Record<string, LucideIcon> = {
  starter: Zap,
  professional: Award,
  enterprise: Crown,
};

const colors: Record<string, string> = {
  starter: "text-blue-500 bg-blue-50 dark:bg-blue-900/40 dark:text-blue-400",
  professional:
    "text-purple-500 bg-purple-50 dark:bg-purple-900/40 dark:text-purple-400",
  enterprise:
    "text-amber-500 bg-amber-50 dark:bg-amber-900/40 dark:text-amber-400",
};

/**
 * PlanIcon Atom.
 * Renders a stylized icon container for a specific pricing tier.
 */
export const PlanIcon: React.FC<PlanIconProps> = ({ tier, className = "" }) => {
  const Icon = icons[tier];

  return (
    <div
      className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border border-current opacity-90 ${colors[tier]} ${className}`}
    >
      <Icon size={28} />
    </div>
  );
};
