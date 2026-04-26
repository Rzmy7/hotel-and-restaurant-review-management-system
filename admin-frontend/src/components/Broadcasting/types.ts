// Broadcasting types and constants

export type Channel = "email" | "notification" | "both";
export type AudienceType = "all" | "role" | "plan";
export type MessageType = "info" | "warning" | "maintenance" | "announcement";
export type BroadcastStatus = "sent" | "failed" | "pending";

export interface BroadcastRecord {
  id: string;
  subject: string;
  body: string;
  channel: Channel;
  audienceType: AudienceType;
  audienceLabel: string;
  messageType: MessageType;
  recipientCount: number;
  status: BroadcastStatus;
  sentAt: string;
  sentBy: string;
}

export interface ComposeForm {
  subject: string;
  body: string;
  channel: Channel;
  audienceType: AudienceType;
  audienceValue: string;
  messageType: MessageType;
  scheduleType: "now" | "scheduled";
  scheduledAt: string;
}

export const CHANNELS: {
  value: Channel;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "email",
    label: "Email",
    description: "Delivered to user inbox",
    icon: null,
  },
  {
    value: "notification",
    label: "In-App Notification",
    description: "Bell notification in panel",
    icon: null,
  },
  {
    value: "both",
    label: "Email + Notification",
    description: "Send via both channels",
    icon: null,
  },
];

export const MESSAGE_TYPES: {
  value: MessageType;
  label: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "info",
    label: "Info",
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    icon: null,
  },
  {
    value: "announcement",
    label: "Announcement",
    color: "text-violet-600",
    bg: "bg-violet-50 border-violet-200",
    icon: null,
  },
  {
    value: "warning",
    label: "Warning",
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    icon: null,
  },
  {
    value: "maintenance",
    label: "Maintenance",
    color: "text-slate-600",
    bg: "bg-slate-50 border-slate-200",
    icon: null,
  },
];

export const AUDIENCE_OPTIONS: {
  value: AudienceType;
  label: string;
  icon: React.ReactNode;
  subOptions?: { value: string; label: string }[];
}[] = [
  {
    value: "all",
    label: "All Users",
    icon: null,
  },
  {
    value: "role",
    label: "By Role",
    icon: null,
    subOptions: [
      { value: "admin", label: "Admins only" },
      { value: "user", label: "Users (non-admin)" },
    ],
  },
  {
    value: "plan",
    label: "By Plan",
    icon: null,
    subOptions: [
      { value: "free", label: "Free plan" },
      { value: "starter", label: "Starter plan" },
      { value: "professional", label: "Professional plan" },
      { value: "enterprise", label: "Enterprise plan" },
    ],
  },
];
