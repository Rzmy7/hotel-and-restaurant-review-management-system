import React from "react";
import NotificationsHeader from "../organisms/NotificationsHeader";
import NotificationsToolbar from "../organisms/NotificationsToolbar";
import NotificationItem from "../organisms/NotificationItem";
import EmptyState from "../molecules/EmptyState";
import type { NotificationType } from "../atoms/NotificationIcon";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  date: string;
  read: boolean;
}

interface NotificationsTemplateProps {
  notifications: Notification[];
  activePrimaryFilter: "all" | "unread";
  activeCategoryFilter: "all-types" | "announcement" | "alert" | "system";
  onPrimaryFilterChange: (filter: "all" | "unread") => void;
  onCategoryFilterChange: (
    filter: "all-types" | "announcement" | "alert" | "system",
  ) => void;
  isFiltered: boolean;
  activeFilterLabel: string;
  counts: Record<string, number>;
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

const NotificationsTemplate: React.FC<NotificationsTemplateProps> = ({
  notifications,
  activePrimaryFilter,
  activeCategoryFilter,
  onPrimaryFilterChange,
  onCategoryFilterChange,
  isFiltered,
  activeFilterLabel,
  counts,
  unreadCount,
  onMarkAsRead,
  onDismiss,
  onMarkAllRead,
  onClearAll,
}) => {
  // Group by date
  const grouped = notifications.reduce<Record<string, Notification[]>>(
    (acc, n) => {
      (acc[n.date] ??= []).push(n);
      return acc;
    },
    {},
  );

  return (
    <div className="min-h-screen bg-[#fcfcfd] dark:bg-slate-900 flex flex-col">
      <NotificationsHeader />

      <main className="flex-1 w-full max-w-[1200px] mx-auto px-8 py-8 space-y-8">
        <NotificationsToolbar
          activePrimaryFilter={activePrimaryFilter}
          activeCategoryFilter={activeCategoryFilter}
          onPrimaryFilterChange={onPrimaryFilterChange}
          onCategoryFilterChange={onCategoryFilterChange}
          counts={counts}
          unreadCount={unreadCount}
          totalCount={notifications.length}
          onMarkAllRead={onMarkAllRead}
          onClearAll={onClearAll}
        />

        {notifications.length === 0 ? (
          <EmptyState
            isFiltered={isFiltered}
            activeFilterLabel={activeFilterLabel}
            onReset={() => {
              onPrimaryFilterChange("all");
              onCategoryFilterChange("all-types");
            }}
          />
        ) : (
          <div className="space-y-10">
            {Object.entries(grouped).map(([date, items]) => (
              <section key={date} className="space-y-4">
                <div className="flex items-center gap-4 px-2">
                  <h5 className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[2px] whitespace-nowrap">
                    {date}
                  </h5>
                  <div className="flex-1 h-px bg-gray-100 dark:bg-slate-800" />
                </div>

                <div className="grid gap-3">
                  {items.map((notif) => (
                    <NotificationItem
                      key={notif.id}
                      {...notif}
                      onRead={onMarkAsRead}
                      onDismiss={onDismiss}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Subtle Footer for spacing */}
      <div className="h-20 shrink-0" />
    </div>
  );
};

export default NotificationsTemplate;
