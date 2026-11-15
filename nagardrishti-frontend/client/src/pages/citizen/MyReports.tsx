import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Camera, CloudOff, Trash2 } from "lucide-react";
import { issuesApi, type ApiIssue } from "../../lib/api";
import {
  getQueuedSubmissions,
  OFFLINE_QUEUE_UPDATED_EVENT,
  removeQueuedSubmission,
  type QueuedSubmission,
} from "../../pwa/offlineQueue";
import { Button } from "../../components/shared/Button";
import { EmptyState } from "../../components/shared/EmptyState";
import { IssueCard } from "../../components/shared/IssueCard";
import { PageHeader } from "../../components/shared/Primitives";
import {
  categoryNames,
  deriveWardFromCoords,
  formatRelativeTime,
} from "./constants";
import type { Category } from "../../types";

const STATUS_FILTERS = [
  "All",
  "Open",
  "Triaged",
  "Assigned",
  "In Progress",
  "Claimed Resolved",
  "Verified Fixed",
  "Reopened",
];

function toEpochMs(value: unknown): number {
  if (!value) return 0;
  const ms =
    value instanceof Date ? value.getTime() : new Date(String(value)).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export function MyReports() {
  const [filter, setFilter] = useState("All");
  const [apiIssues, setApiIssues] = useState<ApiIssue[]>([]);
  const [queuedItems, setQueuedItems] = useState<QueuedSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supportingIds, setSupportingIds] = useState<Record<string, boolean>>({});
  const [supportedIds, setSupportedIds] = useState<Record<string, boolean>>({});

  const refreshQueue = useCallback(async () => {
    const items = await getQueuedSubmissions();
    setQueuedItems(items);
  }, []);

  const refreshReports = useCallback(async () => {
    try {
      const r = await issuesApi.listMine({ limit: 50 });
      setApiIssues(Array.isArray(r?.items) ? r.items : []);
      setError(null);
    } catch (err: any) {
      const status = err?.status;
      if (status === 401 || status === 403) {
        setError("Please sign in as a citizen to view your submitted reports.");
      } else {
        setError(err?.message || "Unable to load your reports right now.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const syncAll = async () => {
      if (!active) return;
      await Promise.all([refreshReports(), refreshQueue()]);
    };
    void syncAll();
    const timer = window.setInterval(() => void syncAll(), 15000);
    const onQueueUpdate = () => void refreshQueue();
    window.addEventListener("online", syncAll);
    window.addEventListener(OFFLINE_QUEUE_UPDATED_EVENT, onQueueUpdate);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("online", syncAll);
      window.removeEventListener(OFFLINE_QUEUE_UPDATED_EVENT, onQueueUpdate);
    };
  }, [refreshQueue, refreshReports]);

  const handleSupport = async (target: ApiIssue) => {
    if (!target?.id || supportingIds[target.id] || supportedIds[target.id]) {
      return;
    }
    setSupportingIds(prev => ({ ...prev, [target.id]: true }));
    try {
      const updated = await issuesApi.support(target.id);
      const nextCount =
        typeof updated?.supporterCount === "number"
          ? updated.supporterCount
          : (target.supporterCount ?? target.supporters ?? 0) + 1;
      setApiIssues(prev =>
        prev.map(item =>
          item.id === target.id
            ? { ...item, supporterCount: nextCount, supporters: nextCount }
            : item
        )
      );
      setSupportedIds(prev => ({ ...prev, [target.id]: true }));
      toast.success("Thanks for supporting this issue.");
    } catch (err: any) {
      const msg = err?.message || "Could not record support right now.";
      if (msg.toLowerCase().includes("already supporting")) {
        setSupportedIds(prev => ({ ...prev, [target.id]: true }));
        toast.info("You are already supporting this issue.");
      } else {
        toast.error(msg);
      }
    } finally {
      setSupportingIds(prev => ({ ...prev, [target.id]: false }));
    }
  };

  const handleDiscardQueued = async (id: string) => {
    await removeQueuedSubmission(id);
    toast.info("Removed queued report from this device.");
  };

  const data = apiIssues
    .filter(issue => filter === "All" || issue.status === filter)
    .sort((a, b) => toEpochMs(b.createdAt) - toEpochMs(a.createdAt));

  const visibleQueued =
    filter === "All" || filter === "Open" ? queuedItems : [];
  const totalCount = apiIssues.length + queuedItems.length;

  return (
    <div>
      <PageHeader
        eyebrow="Citizen space"
        title="My reports"
        description="Follow the issues you've raised and see what has changed."
        action={
          <span className="border-2 border-[#2A3320] bg-[#D8C9A8] px-3 py-2 text-xs font-black uppercase tracking-wider sm:text-[10px]">
            {totalCount} {totalCount === 1 ? "report" : "reports"}
          </span>
        }
      />
      <div className="mb-5 flex flex-wrap gap-2">
        {STATUS_FILTERS.map(name => (
          <button
            key={name}
            onClick={() => setFilter(name)}
            className={`min-h-[40px] border-2 border-[#2A3320] px-3 py-2 text-xs font-black uppercase tracking-wider sm:min-h-0 sm:text-[9px] ${filter === name ? "bg-[#4F5B2A] text-white shadow-[3px_3px_0px_0px_#2A3320]" : "bg-[#FDFBF7]"}`}
          >
            {name}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-2 border-red-800 bg-red-50 p-4 text-xs font-bold text-red-900">
          <span>{error}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setLoading(true);
              void refreshReports();
            }}
          >
            Retry
          </Button>
        </div>
      )}

      {visibleQueued.length > 0 && (
        <section className="mb-7 space-y-3">
          <div className="flex items-center gap-2 border-b-2 border-[#2A3320] pb-2">
            <CloudOff size={16} className="text-[#B8892D]" />
            <h2 className="text-xs font-black uppercase tracking-wider">
              Pending offline uploads ({visibleQueued.length})
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {visibleQueued.map(item => {
              const catLabel =
                categoryNames[item.payload.category as Category] ||
                item.payload.category;
              const wardLabel = deriveWardFromCoords(
                item.payload.latitude,
                item.payload.longitude
              );
              const isFailed = item.status === "failed";
              return (
                <article
                  key={item.id}
                  className="border-2 border-[#2A3320] bg-[#FDFBF7] p-4 shadow-[4px_4px_0px_0px_#2A3320]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#4F5B2A]">
                      {catLabel} · {wardLabel}
                    </span>
                    <span
                      className={`border-2 border-[#2A3320] px-2 py-0.5 text-[10px] font-black uppercase ${isFailed ? "bg-red-100 text-red-900" : "bg-[#B8892D]/20 text-[#2A3320]"}`}
                    >
                      {isFailed ? "Sync failed" : "Queued offline"}
                    </span>
                  </div>
                  <h3 className="display-title mt-2 text-lg">
                    {item.payload.title}
                  </h3>
                  {item.payload.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-[#2A3320]/75">
                      {item.payload.description}
                    </p>
                  )}
                  {isFailed && item.error && (
                    <p className="mt-2 border border-red-800 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-900">
                      {item.error}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between border-t border-[#E8E0D0] pt-2.5 text-[10px] font-bold uppercase tracking-wider text-[#2A3320]/60">
                    <span>Saved {formatRelativeTime(item.createdAt)}</span>
                    <button
                      type="button"
                      onClick={() => void handleDiscardQueued(item.id)}
                      className="inline-flex items-center gap-1 text-red-900 hover:underline"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {loading ? (
        <div className="border-2 border-[#2A3320] bg-[#FDFBF7] px-5 py-10 text-center text-xs font-black uppercase tracking-widest text-[#2A3320]/60">
          Loading your reports...
        </div>
      ) : data.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2">
          {data.map((issue, index) => (
            <div key={issue.id || issue.publicRef}>
              <IssueCard
                issue={issue}
                index={index}
                onSupport={target => void handleSupport(target)}
              />
              <p className="mt-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#4F5B2A] sm:text-[9px]">
                <i className="h-2 w-2 rounded-full bg-[#4F5B2A]" />
                Synced with public record
              </p>
            </div>
          ))}
        </div>
      ) : (
        !error &&
        visibleQueued.length === 0 && (
          <EmptyState
            icon={Camera}
            title={
              apiIssues.length === 0
                ? "No reports submitted yet"
                : "No reports in this filter"
            }
            description={
              apiIssues.length === 0
                ? "Report a civic issue in your neighbourhood to track progress and community support."
                : "Try a different status filter, or report a new issue in your neighbourhood."
            }
            action={{ label: "Report an issue →", href: "/citizen/report" }}
          />
        )
      )}
    </div>
  );
}
