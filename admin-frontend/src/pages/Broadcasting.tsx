import React, { useEffect, useMemo, useState } from "react";
import { Send } from "lucide-react";
import { Alert } from "../components/Alert";

import {
  AudienceSelector,
  BroadcastDetailOverlay,
  BroadcastHistoryRow,
  BroadcastPreviewModal,
  ChannelSelector,
  ContentEditor,
  MessageTypeSelector,
  SchedulingOptions,
} from "../components/Broadcasting";
import type { BroadcastRecord, ComposeForm } from "../components/Broadcasting";
import { broadcastingService } from "../services/broadcastingService";
import { useSystemTimezone } from "../hooks/useSystemTimezone";

interface BroadcastStats {
  total: number;
  sent: number;
  scheduled: number;
  failed: number;
}

const emptyForm = (): ComposeForm => ({
  subject: "",
  body: "",
  channel: "both",
  audienceType: "all",
  audienceValue: "",
  messageType: "info",
  scheduleType: "now",
  scheduledAt: "",
});

export const Broadcasting: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"compose" | "history">("compose");

  const [form, setForm] = useState<ComposeForm>(emptyForm());
  const [history, setHistory] = useState<BroadcastRecord[]>([]);
  const [stats, setStats] = useState<BroadcastStats>({
    total: 0,
    sent: 0,
    scheduled: 0,
    failed: 0,
  });

  const [estimatedCount, setEstimatedCount] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<BroadcastRecord | null>(
    null,
  );

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const systemTimezone = useSystemTimezone();

  const isFormValid = useMemo(() => {
    const hasCoreFields =
      form.subject.trim().length > 0 &&
      form.body.trim().length > 0 &&
      (form.audienceType === "all" || form.audienceValue !== "");

    if (!hasCoreFields) {
      return false;
    }

    if (form.scheduleType === "scheduled") {
      return form.scheduledAt.trim().length > 0;
    }

    return true;
  }, [form]);

  const refreshHistoryAndStats = async () => {
    setLoading(true);
    try {
      const [historyData, statsData] = await Promise.all([
        broadcastingService.getHistory(),
        broadcastingService.getStatistics(),
      ]);
      setHistory(historyData);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load broadcasting data", error);
      setErrorMessage("Failed to load broadcasting data");
    } finally {
      setLoading(false);
    }
  };

  const refreshEstimatedCount = async () => {
    try {
      const count = await broadcastingService.getEstimatedRecipients(
        form.audienceType,
        form.audienceValue || undefined,
      );
      setEstimatedCount(count);
    } catch (error) {
      console.error("Failed to estimate recipient count", error);
      setEstimatedCount(0);
    }
  };

  useEffect(() => {
    void refreshHistoryAndStats();
  }, []);

  useEffect(() => {
    void refreshEstimatedCount();
  }, [form.audienceType, form.audienceValue]);

  const updateForm = (updates: Partial<ComposeForm>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const handleSend = async () => {
    if (!isFormValid || sending) {
      return;
    }

    setSending(true);
    setErrorMessage(null);

    try {
      const result = await broadcastingService.sendBroadcast(form);
      setSuccessMessage(
        result.message || "Broadcast request processed successfully",
      );
      setShowPreview(false);
      setForm(emptyForm());
      setActiveTab("history");
      await refreshHistoryAndStats();
      window.setTimeout(() => setSuccessMessage(null), 4000);
    } catch (error) {
      console.error("Failed to send broadcast", error);
      setErrorMessage("Failed to send broadcast");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 pt-4">
      {successMessage && (
        <Alert
          type="success"
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      )}

      {errorMessage && (
        <Alert
          type="error"
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
      )}

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Broadcasts", value: stats.total },
          { label: "Sent", value: stats.sent },
          { label: "Scheduled", value: stats.scheduled },
          { label: "Failed", value: stats.failed },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm px-4 py-3.5"
          >
            <div className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">
              {stat.label}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(["compose", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              activeTab === tab
                ? "bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 dark:text-slate-200"
            }`}
          >
            {tab === "compose" ? "Compose Message" : "Broadcast History"}
          </button>
        ))}
      </div>

      {activeTab === "compose" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
              <MessageTypeSelector
                value={form.messageType}
                onChange={(messageType) => updateForm({ messageType })}
              />
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
              <ContentEditor
                subject={form.subject}
                body={form.body}
                onSubjectChange={(subject) => updateForm({ subject })}
                onBodyChange={(body) => updateForm({ body })}
              />
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
              <SchedulingOptions
                scheduleType={form.scheduleType}
                scheduledAt={form.scheduledAt}
                timezone={systemTimezone}
                onScheduleTypeChange={(scheduleType) =>
                  updateForm({ scheduleType })
                }
                onScheduledAtChange={(scheduledAt) =>
                  updateForm({ scheduledAt })
                }
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
              <ChannelSelector
                value={form.channel}
                onChange={(channel) => updateForm({ channel })}
              />
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
              <AudienceSelector
                audienceType={form.audienceType}
                audienceValue={form.audienceValue}
                onAudienceTypeChange={(audienceType) =>
                  updateForm({ audienceType, audienceValue: "" })
                }
                onAudienceValueChange={(audienceValue) =>
                  updateForm({ audienceValue })
                }
              />

              {estimatedCount > 0 && (
                <div className="mt-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-xs text-blue-700">
                    <span className="font-semibold">
                      ~{estimatedCount.toLocaleString()}
                    </span>{" "}
                    estimated recipients
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowPreview(true)}
              disabled={!isFormValid}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Send size={15} />
              Preview &amp; Send
            </button>

            {!isFormValid && (
              <p className="text-xs text-gray-400 dark:text-slate-500 text-center -mt-2">
                Fill in all required fields to continue
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                Broadcast History
              </h2>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                {history.length} broadcasts total
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-500 dark:text-slate-400">
              Loading history…
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                <Send size={22} className="text-gray-400 dark:text-slate-500" />
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-slate-200">
                No broadcasts yet
              </p>
              <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
                Switch to Compose Message to send your first broadcast.
              </p>
            </div>
          ) : (
            <div>
              {history.map((record) => (
                <BroadcastHistoryRow
                  key={record.id}
                  record={record}
                  timezone={systemTimezone}
                  onViewDetail={setSelectedDetail}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {showPreview && (
        <BroadcastPreviewModal
          form={form}
          estimatedCount={estimatedCount}
          timezone={systemTimezone}
          onClose={() => setShowPreview(false)}
          onSend={handleSend}
          sending={sending}
        />
      )}

      {selectedDetail && (
        <BroadcastDetailOverlay
          record={selectedDetail}
          timezone={systemTimezone}
          onClose={() => setSelectedDetail(null)}
        />
      )}
    </div>
  );
};
