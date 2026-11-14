import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { issues as seedIssues } from "../../data/seed";
import { loadSubmittedIssues } from "../../data/localDemo";
import type { Issue } from "../../types";
import { Button } from "../../components/shared/Button";
import { FilterBar } from "../../components/shared/FilterBar";
import { IssueCard } from "../../components/shared/IssueCard";
import { MapView } from "../../components/shared/MapView";

export function ExploreMap() {
  const [filters, setFilters] = useState({
    status: "All",
    category: "All",
    ward: "All",
  });
  const [selected, setSelected] = useState<Issue | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [submittedIssues] = useState(loadSubmittedIssues);
  const allIssues = useMemo(
    () => [...seedIssues, ...submittedIssues],
    [submittedIssues]
  );
  const filtered = useMemo(
    () =>
      allIssues.filter(
        issue =>
          (filters.status === "All" || issue.status === filters.status) &&
          (filters.category === "All" || issue.category === filters.category) &&
          (filters.ward === "All" || issue.ward === filters.ward)
      ),
    [filters, allIssues]
  );

  return (
    <div className="-mx-4 -mt-5 sm:-mx-6 lg:-mx-8 lg:-mt-9">
      <div className="sticky top-14 z-20 border-b-2 border-[#2A3320] bg-[#FDFBF7] px-4 py-2.5 sm:px-6 lg:top-[72px] lg:border-b-4 lg:py-3 lg:px-8">
        <FilterBar
          filters={[
            {
              key: "status",
              label: "Status",
              options: [
                "All",
                "Open",
                "Triaged",
                "Assigned",
                "In Progress",
                "Claimed Resolved",
                "Verified Fixed",
                "Reopened",
              ],
            },
            {
              key: "category",
              label: "Category",
              options: [
                "All",
                "pothole/road",
                "garbage/waste",
                "drainage/sewage",
                "water supply",
                "streetlight/electrical",
                "stray animals",
                "encroachment",
                "other",
              ],
            },
            {
              key: "ward",
              label: "Ward",
              options: ["All", "Ward 11", "Ward 12", "Ward 14", "Ward 15"],
            },
          ]}
          onFilterChange={(key, value) =>
            setFilters(old => ({ ...old, [key]: value }))
          }
          mobileRightSlot={
            <div className="inline-flex border-2 border-[#2A3320] bg-white p-0.5 text-xs font-black uppercase">
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={`min-h-[38px] px-3 ${viewMode === "map" ? "bg-[#4F5B2A] text-white" : "text-[#2A3320]"}`}
              >
                Map
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`min-h-[38px] px-3 ${viewMode === "list" ? "bg-[#4F5B2A] text-white" : "text-[#2A3320]"}`}
              >
                List
              </button>
            </div>
          }
        />
      </div>
      <div className="relative px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="mb-3 flex items-center justify-between gap-2 sm:mb-4">
          <div>
            <p className="eyebrow">Explore Pune</p>
            <p className="mt-0.5 text-xs font-medium text-[#2A3320]/70">
              {filtered.length} public reports in the area
            </p>
          </div>
          <Link to="/citizen/report" className="hidden sm:inline-block">
            <Button variant="gold" size="sm">
              ＋ Report issue
            </Button>
          </Link>
        </div>
        {viewMode === "map" ? (
          <MapView
            issues={filtered}
            selectedId={selected?.id}
            onSelectIssue={setSelected}
            height="min(64dvh, 700px)"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((issue, idx) => (
              <IssueCard key={issue.id} issue={issue} index={idx} />
            ))}
          </div>
        )}
        <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#2A3320]/60 sm:text-[10px]">
          ⌖ Public pins are coarsened for privacy
        </p>
        {selected && viewMode === "map" && (
          <div className="fixed inset-x-0 bottom-[calc(62px+env(safe-area-inset-bottom))] z-[600] max-h-[52dvh] overflow-auto border-t-4 border-[#2A3320] bg-[#F5EFE3] p-4 shadow-[0px_-6px_0px_0px_#2A3320] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[410px] sm:border-4 sm:shadow-[6px_6px_0px_0px_#2A3320]">
            <div className="mb-3 flex items-center justify-between">
              <p className="eyebrow">Issue preview</p>
              <button
                aria-label="Close preview"
                className="flex h-11 w-11 items-center justify-center border-2 border-[#2A3320] bg-white"
                onClick={() => setSelected(null)}
              >
                <X size={18} />
              </button>
            </div>
            <IssueCard issue={selected} index={1} />
            <Link to={`/citizen/issue/${selected.id}`} className="mt-3 block">
              <Button className="min-h-[44px] w-full">View full detail →</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
