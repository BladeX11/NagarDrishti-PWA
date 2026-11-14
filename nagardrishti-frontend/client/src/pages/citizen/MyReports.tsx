import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { issuesApi, type ApiIssue } from "../../lib/api";
import { EmptyState } from "../../components/shared/EmptyState";
import { IssueCard } from "../../components/shared/IssueCard";
import { DemoNote, PageHeader } from "../../components/shared/Primitives";
import { getSubmittedReports, mine } from "./constants";

export function MyReports() {
  const [filter, setFilter] = useState("All");
  const [apiIssues, setApiIssues] = useState<ApiIssue[]>([]);
  const filters = [
    "All",
    "Open",
    "In Progress",
    "Claimed Resolved",
    "Verified Fixed",
    "Reopened",
  ];
  useEffect(() => {
    let active = true;
    const refresh = () =>
      issuesApi
        .listMine({ limit: 50 })
        .then(r => {
          if (active) setApiIssues(r.items);
        })
        .catch(() => {});
    void refresh();
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener("online", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("online", refresh);
    };
  }, []);
  const allReports =
    apiIssues.length > 0 ? apiIssues : [...mine, ...getSubmittedReports()];
  const data = allReports
    .filter((issue: any) => filter === "All" || issue.status === filter)
    .sort((a: any, b: any) =>
      (b.createdAt || "").localeCompare(a.createdAt || "")
    );
  return (
    <div>
      <PageHeader
        eyebrow="Citizen space"
        title="My reports"
        description="Follow the issues you've raised and see what has changed."
        action={
          <span className="border-2 border-[#2A3320] bg-[#D8C9A8] px-3 py-2 text-xs font-black uppercase tracking-wider sm:text-[10px]">
            {allReports.length} reports
          </span>
        }
      />
      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map(name => (
          <button
            key={name}
            onClick={() => setFilter(name)}
            className={`min-h-[40px] border-2 border-[#2A3320] px-3 py-2 text-xs font-black uppercase tracking-wider sm:min-h-0 sm:text-[9px] ${filter === name ? "bg-[#4F5B2A] text-white shadow-[3px_3px_0px_0px_#2A3320]" : "bg-[#FDFBF7]"}`}
          >
            {name}
          </button>
        ))}
      </div>
      {data.length ? (
        <div className="grid gap-5 md:grid-cols-2">
          {data.map((issue: any, index: number) => (
            <div key={issue.id || issue.publicRef}>
              <IssueCard issue={issue} index={index} />
              <p className="mt-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#4F5B2A] sm:text-[9px]">
                <i className="h-2 w-2 rounded-full bg-[#4F5B2A]" />
                {apiIssues.length > 0
                  ? "Live from database"
                  : "Submitted · Synced"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Camera}
          title="No reports in this view"
          description="Try a different status filter, or report the first issue in your neighbourhood."
          action={{ label: "Report an issue →", href: "/citizen/report" }}
        />
      )}
      <DemoNote />
    </div>
  );
}
