import React from "react";
import { X, Mail, Bell } from "lucide-react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { MESSAGE_TYPES } from "./types";
import type {
  BroadcastRecord,
  Channel,
  BroadcastStatus,
  MessageType,
} from "./types";
import { formatDateTime } from "../../utils/dateTime";

interface DetailOverlayProps {
  record: BroadcastRecord;
  timezone: string;
  onClose: () => void;
}

const channelMeta = (ch: Channel) => {
  if (ch === "email")
    return {
      label: "Email",
      icon: <Mail size={12} />,
      color: "text-blue-600 bg-blue-50 border-blue-200",
    };
  if (ch === "notification")
    return {
      label: "Notification",
      icon: <Bell size={12} />,
      color: "text-violet-600 bg-violet-50 border-violet-200",
    };
  return {
    label: "Email + Notif",
    icon: (
      <span className="flex gap-0.5">
        <Mail size={10} />
        <Bell size={10} />
      </span>
    ),
    color: "text-teal-600 bg-teal-50 border-teal-200",
  };
};

const statusMeta = (s: BroadcastStatus) => {
  if (s === "sent")
    return {
      label: "Sent",
      icon: <CheckCircle2 size={13} />,
      color: "text-green-600 bg-green-50 border-green-200",
    };
  if (s === "failed")
    return {
      label: "Failed",
      icon: <XCircle size={13} />,
      color: "text-red-600 bg-red-50 border-red-200",
    };
  return {
    label: "Scheduled",
    icon: <Clock size={13} />,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  };
};

const msgTypeMeta = (t: MessageType) =>
  MESSAGE_TYPES.find((m) => m.value === t)!;

export const BroadcastDetailOverlay: React.FC<DetailOverlayProps> = ({
  record,
  timezone,
  onClose,
}) => {
  const mt = msgTypeMeta(record.messageType);
  const ch = channelMeta(record.channel);
  const st = statusMeta(record.status);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 w-full sm:w-[420px] h-full sm:h-auto sm:max-h-[90vh] sm:rounded-l-2xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Broadcast Detail
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${mt.bg} ${mt.color}`}
            >
              {mt.icon} {mt.label}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${st.color}`}
            >
              {st.icon} {st.label}
            </span>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">
              Subject
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {record.subject}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">
              Message
            </p>
            <p className="text-sm text-gray-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {record.body}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-slate-700">
            <div>
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">
                Channel
              </p>
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${ch.color}`}
              >
                {ch.icon} {ch.label}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">
                Audience
              </p>
              <p className="text-sm text-gray-800 dark:text-slate-100 font-medium">
                {record.audienceLabel}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">
                Recipients
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {record.recipientCount.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">
                Sent by
              </p>
              <p className="text-sm text-gray-800 dark:text-slate-100">
                {record.sentBy}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">
                Sent at
              </p>
              <p className="text-sm text-gray-800 dark:text-slate-100">
                {formatDateTime(record.sentAt, timezone)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
