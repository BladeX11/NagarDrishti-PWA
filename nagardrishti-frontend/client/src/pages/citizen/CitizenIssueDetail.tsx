import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Camera, FileCheck2, ThumbsUp } from "lucide-react";
import { issues as seedIssues, statusEvents } from "../../data/seed";
import { issuesApi, type ApiIssue } from "../../lib/api";
import { ActivityTimeline } from "../../components/shared/ActivityTimeline";
import { Button } from "../../components/shared/Button";
import { MapView } from "../../components/shared/MapView";
import { CategoryIcon, DemoNote, Panel } from "../../components/shared/Primitives";
import { StatusBadge } from "../../components/shared/StatusBadge";
import {
  formatWardLabel,
  getSafeMediaUrl,
  getSubmittedReports,
} from "./constants";

export function CitizenIssueDetail() {
  const { id = "ND-104" } = useParams();
  const matchedSeed =
    seedIssues.find(item => item.id === id) ||
    getSubmittedReports().find(item => item.id === id);
  const [apiIssue, setApiIssue] = useState<ApiIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [supported, setSupported] = useState(false);
  const [supporting, setSupporting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setApiIssue(null);
    setSupported(false);
    setSupporting(false);
    setLoading(true);
    issuesApi
      .get(id)
      .then(r => {
        if (active && r) setApiIssue(r);
      })
      .catch(err => {
        console.error("Failed to fetch issue:", err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const issue: any = apiIssue || matchedSeed;
  if (loading)
    return (
      <div className="p-8 text-center">
        <span className="border-4 border-[#2A3320] bg-[#D8C9A8] px-5 py-4 text-xs font-black uppercase tracking-widest shadow-[4px_4px_0px_0px_#2A3320]">
          Loading issue...
        </span>
      </div>
    );
  if (!issue)
    return (
      <div className="p-8 text-center">
        <p className="display-title text-xl text-[#2A3320]">Issue not found</p>
        <p className="mt-2 text-xs text-[#2A3320]/60">
          Could not find issue details for "{id}".
        </p>
        <Link
          to="/citizen/my-reports"
          className="mt-4 inline-flex min-h-[44px] items-center border-2 border-[#2A3320] bg-[#4F5B2A] px-4 py-2 text-xs font-black uppercase text-white"
        >
          Back to my reports
        </Link>
      </div>
    );

  const rawEvents =
    apiIssue?.events && apiIssue.events.length > 0
      ? apiIssue.events
      : statusEvents.filter(
          (event: any) =>
            event.issueId === issue.id || event.issueId === issue.publicRef
        );
  const events = rawEvents.map((e: any) => ({
    ...e,
    timestamp: e.timestamp || e.createdAt || new Date().toISOString(),
    actor:
      e.actor ||
      (e.actorRole === "system"
        ? "System"
        : e.actorRole === "officer"
          ? "Officer"
          : "Citizen"),
  }));

  const beforeMedia = apiIssue?.media?.find(m => m.type === "before");
  const afterMedia = apiIssue?.media?.find(
    m => m.type === "proof" || m.type === "after"
  );
  const beforeUrl = getSafeMediaUrl(beforeMedia);
  const afterUrl = getSafeMediaUrl(afterMedia);
  const hasProof =
    issue.proofState === "submitted" ||
    issue.proofState === "accepted" ||
    Boolean(issue.proofSubmitted) ||
    Boolean(afterMedia);
  const votes = issue.verificationVotes ?? { fixed: 0, notFixed: 0, unsure: 0 };
  const supportersCount = apiIssue?.supporterCount ?? issue.supporters ?? 0;
  const wardLabel = formatWardLabel(issue.ward, issue.wardId);

  const handleSupport = async () => {
    if (supporting || supported) return;
    setSupporting(true);
    try {
      const updated = await issuesApi.support(issue.id);
      setSupported(true);
      if (apiIssue) {
        const nextCount =
          typeof updated?.supporterCount === "number"
            ? updated.supporterCount
            : (apiIssue.supporterCount ?? 0) + 1;
        setApiIssue(prev =>
          prev
            ? {
                ...prev,
                supporterCount: nextCount,
                supporters: nextCount,
              }
            : prev
        );
      }
      toast.success("Thanks for supporting this issue.");
    } catch (err: any) {
      const msg = err?.message || "Could not record support right now.";
      if (msg.toLowerCase().includes("already supporting")) {
        setSupported(true);
        toast.info("You are already supporting this issue.");
      } else {
        toast.error(msg);
      }
    } finally {
      setSupporting(false);
    }
  };

  return (
    <div>
      <Link
        to="/citizen/my-reports"
        className="mb-4 inline-flex min-h-[40px] items-center gap-2 text-xs font-black uppercase tracking-wider text-[#4F5B2A] hover:underline sm:text-[10px]"
      >
        <ArrowLeft size={15} />
        Back to my reports
      </Link>
      <div className="mb-5 border-b-2 border-[#2A3320] pb-5 sm:border-b-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#4F5B2A] sm:text-[10px]">
            <CategoryIcon category={issue.category} />
            {issue.category}
          </span>
          <StatusBadge status={issue.status} />
        </div>
        <h1 className="display-title max-w-4xl text-2xl md:text-4xl">
          {issue.title}
        </h1>
        <p className="mt-3 text-xs font-medium text-[#2A3320]/65">
          Issue {issue.publicRef || issue.id} · Registered{" "}
          {issue.age || "Recently"} · Updated{" "}
          {issue.updatedAge || issue.age || "Recently"} · {wardLabel}{" "}
          <span className="mx-1">·</span>
          {supportersCount} supporters
        </p>
      </div>
      <div className="grid gap-7 lg:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-7">
          <section>
            <p className="eyebrow mb-3">Approximate location</p>
            <MapView issues={[issue]} selectedId={issue.id} height="240px" />
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[#2A3320]/60 sm:text-[9px]">
              ⌖ Public pins are coarsened
            </p>
          </section>
          <section>
            <p className="eyebrow mb-3">Description</p>
            <Panel className="border-2 md:border-4">
              <p className="text-sm leading-relaxed">
                {issue.description || "No description provided."}
              </p>
            </Panel>
          </section>
          <section>
            <p className="eyebrow mb-3">Report media</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="overflow-hidden border-2 border-[#2A3320] bg-[#D8C9A8] md:border-4">
                {beforeUrl ? (
                  <img
                    src={beforeUrl}
                    alt="Before report"
                    className="h-40 w-full object-cover grayscale transition-all hover:grayscale-0"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center">
                    <Camera size={36} />
                  </div>
                )}
                <p className="border-t-2 border-[#2A3320] bg-[#FDFBF7] px-3 py-2 text-[10px] font-black uppercase tracking-widest sm:text-[9px]">
                  Before · Citizen photo
                </p>
              </div>
              {hasProof && (
                <div className="overflow-hidden border-2 border-[#2A3320] bg-[#D8C9A8] md:border-4">
                  {afterUrl ? (
                    <img
                      src={afterUrl}
                      alt="After fix"
                      className="h-40 w-full object-cover grayscale transition-all hover:grayscale-0"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center">
                      <FileCheck2 size={36} />
                    </div>
                  )}
                  <p className="border-t-2 border-[#2A3320] bg-[#FDFBF7] px-3 py-2 text-[10px] font-black uppercase tracking-widest sm:text-[9px]">
                    After · Claimed
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
        <div className="space-y-7">
          <section>
            <p className="eyebrow mb-3">Verification</p>
            <Panel className="border-2 border-[#B8892D] bg-[#B8892D]/10 md:border-4">
              <p className="display-title text-sm">
                {issue.status === "Claimed Resolved"
                  ? "This issue was claimed resolved. Is it fixed?"
                  : "Community verification"}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold">
                <span>✓ {votes.fixed ?? 0} fixed</span>
                <span>✕ {votes.notFixed ?? 0} not fixed</span>
                <span>? {votes.unsure ?? 0} unsure</span>
              </div>
              {issue.status === "Claimed Resolved" && (
                <Link
                  to={`/citizen/issue/${issue.id}/verify`}
                  className="mt-4 inline-block w-full sm:w-auto"
                >
                  <Button variant="gold" className="min-h-[44px] w-full sm:w-auto">Verify now →</Button>
                </Link>
              )}
              <p className="mt-3 text-xs text-[#2A3320]/65 sm:text-[10px]">
                2 nearby “not fixed” votes will reopen the issue.
              </p>
            </Panel>
          </section>
          <section>
            <p className="eyebrow mb-3">Activity timeline</p>
            <Panel className="border-2 md:border-4">
              <ActivityTimeline events={events} />
            </Panel>
          </section>
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={supporting || supported}
              onClick={() => void handleSupport()}
              variant={supported ? "sand" : "olive"}
              className="min-h-[44px]"
            >
              <ThumbsUp size={15} />
              {supporting
                ? "Supporting..."
                : supported
                  ? "Supported"
                  : "Support issue"}
            </Button>
            <Button
              variant="ghost"
              className="min-h-[44px]"
              onClick={() =>
                toast.info("Moderation note recorded for this session.")
              }
            >
              ⚑ Report abuse
            </Button>
          </div>
        </div>
      </div>
      {!apiIssue && <DemoNote>Demo data · Synthetic records</DemoNote>}
    </div>
  );
}
