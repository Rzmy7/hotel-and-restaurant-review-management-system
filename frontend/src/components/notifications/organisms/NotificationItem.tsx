import React from "react";
import { X } from "lucide-react";
import NotificationIcon from "../atoms/NotificationIcon";
import type { NotificationType } from "../atoms/NotificationIcon";
import TypeBadge from "../atoms/TypeBadge";
import UnreadIndicator, { UnreadDot } from "../atoms/UnreadIndicator";
import ActionIconBtn from "../atoms/ActionIconBtn";

interface NotificationItemProps {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  id,
  type,
  title,
  message,
  time,
  read,
  onRead,
  onDismiss,
}) => {
  return (
    <div
      onClick={() => !read && onRead(id)}
      className={`
                group relative bg-white dark:bg-slate-800 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden
                ${
                  read
                    ? "border-gray-100 hover:border-gray-200 dark:border-slate-800/80 dark:hover:border-slate-700 hover:shadow-md"
                    : "border-blue-100 dark:border-[#4e80ee]/30 bg-blue-50/10 dark:bg-[#4e80ee]/5 shadow-sm hover:shadow-lg ring-1 ring-blue-50 dark:ring-[#4e80ee]/10"
                }
            `}
    >
      {!read && <UnreadIndicator />}

      <div className="flex items-start gap-5 p-5">
        <NotificationIcon type={type} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1.5">
            <h4
              className={`text-sm tracking-tight m-0 truncate transition-colors duration-300 ${
                read
                  ? "font-bold text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white"
                  : "font-black text-gray-900 dark:text-white"
              }`}
            >
              {title}
            </h4>
            {!read && <UnreadDot />}
            <span className="ml-auto text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider shrink-0">
              {time}
            </span>
          </div>

          <p
            className={`text-[13px] leading-relaxed transition-colors duration-300 ${
              read
                ? "text-gray-500 dark:text-slate-400"
                : "text-gray-600 dark:text-slate-300 font-medium"
            }`}
          >
            {message}
          </p>

          <div className="mt-3 flex items-center justify-between">
            <TypeBadge type={type} />
          </div>
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
          <ActionIconBtn
            icon={<X size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(id);
            }}
            title="Dismiss"
            variant="danger"
          />
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
