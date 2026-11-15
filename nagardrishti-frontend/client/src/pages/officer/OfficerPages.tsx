import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Check,
  ClipboardList,
  Clock3,
  FileCheck2,
  MapPin,
  Search,
  Upload,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { issues as seedIssues, statusEvents } from "../../data/seed";
import {
  authApi,
  issuesApi,
  adversarialApi,
  type ApiIssue,
  type AdversarialFlag,
} from "../../lib/api";
import { categories, type IssueStatus } from "../../types";
import { ActivityTimeline } from "../../components/shared/ActivityTimeline";
import { Button } from "../../components/shared/Button";
import { FilterBar } from "../../components/shared/FilterBar";
import { IssueCard } from "../../components/shared/IssueCard";
import { MapView } from "../../components/shared/MapView";
import { MetricCard } from "../../components/shared/MetricCard";
import {
  PageHeader,
  Panel,
  CategoryIcon,
} from "../../components/shared/Primitives";
import { StatusBadge } from "../../components/shared/StatusBadge";
import {
  filterAndSortQueueIssues,
  formatQueueIssue,
} from "./triageQueueUtils";

const COLORS = ["#4F5B2A", "#B8892D", "#D8C9A8", "#6B7A3A"];
const smallTip = {
  contentStyle: {
    backgroundColor: "#2A3320",
    border: 0,
    borderRadius: 0,
    color: "#fff",
    fontSize: 11,
  },
  itemStyle: { color: "#fff" },
};

const DEPARTMENT_OPTIONS: Array<{ id: string; label: string }> = [
  { id: "roads", label: "Roads & Infrastructure" },
  { id: "waste", label: "Solid Waste Management" },
  { id: "water", label: "Water Supply" },
  { id: "drainage", label: "Drainage & Sewage" },
  { id: "electrical", label: "Electrical & Streetlights" },
  { id: "animals", label: "Stray Animal Control" },
  { id: "civic-works", label: "Civic Works" },
];

const DEPARTMENT_LABELS: Record<string, string> = Object.fromEntries(
  DEPARTMENT_OPTIONS.map(item => [item.id, item.label])
);

const CATEGORY_SHORT_LABELS: Record<string, string> = {
  "pothole/road": "Roads",
  "garbage/waste": "Waste",
  "drainage/sewage": "Drainage",
  "water supply": "Water",
  "streetlight/electrical": "Electrical",
  "stray animals": "Animals",
  encroachment: "Encroach",
  other: "Other",
};

const OFFICER_TRANSITIONS: Record<string, IssueStatus[]> = {
  Open: ["Triaged"],
  Triaged: ["Assigned"],
  Assigned: ["In Progress"],
  "In Progress": ["Claimed Resolved"],
  "Claimed Resolved": [],
  "Verified Fixed": [],
  Reopened: ["Triaged", "Assigned", "In Progress"],
};

function formatWardName(ward?: string | null, wardId?: string | null) {
  if (ward && ward.trim()) return ward;
  if (wardId && wardId.trim()) {
    const cleaned = wardId.replace(/^ward-/i, "");
    return /^ward\b/i.test(wardId) ? wardId : `Ward ${cleaned}`;
  }
  return "Unassigned ward";
}

function formatDepartmentName(department?: string | null, departmentId?: string | null) {
  if (department && department.trim()) return department;
  if (departmentId && departmentId.trim()) {
    return DEPARTMENT_LABELS[departmentId] ?? departmentId;
  }
  return "Unassigned";
}

function getSafeMediaUrl(media?: { publicPath?: string | null }): string | null {
  const url = media?.publicPath;
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("s3://")) return null;
  if (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("data:image/")
  ) {
    return trimmed;
  }
  return null;
}

function formatFlagDetails(flag: AdversarialFlag): string {
  const d = (flag.details ?? {}) as Record<string, unknown>;
  switch (flag.rule) {
    case "PHOTO_REUSE":
      return `Perceptual overlap with issue ${String(d.matchedIssueId ?? "another report")} (Hamming distance ${String(d.hammingDistance ?? "N/A")}).`;
    case "TEMPORAL":
      return `Claimed resolved in ${String(d.resolutionHours ?? "?")}h against ${String(d.medianHours ?? "?")}h category median (${String(d.ratioToMedian ?? "?")}x).`;
    case "GPS_MISMATCH":
      return `Photo EXIF location is ${String(d.distanceMeters ?? "?")}m away from reported issue coordinates.`;
    case "BULK_CLOSURE":
      return `${String(d.closuresToday ?? "?")} closures today (baseline median ${String(d.officerMedian ?? "?")} / SD ${String(d.officerStddev ?? "?")}).`;
    default: {
      const pairs = Object.entries(d).map(([k, v]) => `${k}: ${String(v)}`);
      return pairs.length ? pairs.join(" · ") : "Flagged for manual verification.";
    }
  }
}

export function OfficerOverview() {
  const [liveIssues, setLiveIssues] = useState<ApiIssue[]>([]);
  const [liveLoaded, setLiveLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [officerName, setOfficerName] = useState("Officer");

  const loadOverview = useCallback(() => {
    void issuesApi
      .list({ limit: 100 })
      .then(result => {
        setLiveIssues(result.items);
        setLiveLoaded(true);
        setLoadError(null);
      })
      .catch((err: any) => {
        setLoadError(err?.message || "Unable to load live issues.");
      });
  }, []);

  useEffect(() => {
    loadOverview();
    void authApi
      .me()
      .then(user => {
        if (user?.name) setOfficerName(user.name);
      })
      .catch(() => undefined);
  }, [loadOverview]);

  const records: any[] = liveLoaded ? liveIssues : seedIssues;

  const wards = useMemo(() => {
    const counts = new Map<string, number>([
      ["Ward 11", 0],
      ["Ward 12", 0],
      ["Ward 14", 0],
      ["Ward 15", 0],
    ]);
    records.forEach(issue => {
      if (issue.status !== "Verified Fixed") {
        const label = formatWardName(issue.ward, issue.wardId);
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
    });
    return Array.from(counts.entries()).map(([ward, open]) => ({ ward, open }));
  }, [records]);

  const cats = useMemo(() => {
    if (records.length === 0) return [];
    const counts = new Map<string, number>();
    records.forEach(issue => {
      const label = CATEGORY_SHORT_LABELS[issue.category] ?? "Other";
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 3);
    const restCount = sorted.slice(3).reduce((sum, [, c]) => sum + c, 0);
    if (restCount > 0) {
      const existingOther = top.find(([name]) => name === "Other");
      if (existingOther) existingOther[1] += restCount;
      else top.push(["Other", restCount]);
    }
    const total = records.length;
    return top.map(([name, count]) => ({
      name,
      value: Math.round((count / total) * 100),
    }));
  }, [records]);

  const priorityAlerts = useMemo(() => {
    const items: Array<{ title: string; desc: string; linkTo?: string }> = [];
    const breaches = records.filter(i => i.slaBreach && i.status !== "Verified Fixed");
    if (breaches.length > 0) {
      const top = breaches[0];
      items.push({
        title: `${breaches.length} issue${breaches.length > 1 ? "s" : ""} past SLA deadline`,
        desc: `${top.title} — ${top.supporterCount ?? top.supporters ?? 0} supporters, status ${top.status}`,
        linkTo: `/officer/issue/${top.publicRef || top.id}`,
      });
    }
    const reopened = records.filter(i => i.status === "Reopened");
    if (reopened.length > 0) {
      const top = reopened[0];
      items.push({
        title: `${reopened.length} reopened issue${reopened.length > 1 ? "s" : ""} need re-attention`,
        desc: `${top.title} — community verification reopened this report`,
        linkTo: `/officer/issue/${top.publicRef || top.id}`,
      });
    }
    const critical = records.filter(i => i.priority === 1 && i.status !== "Verified Fixed");
    if (critical.length > 0) {
      const top = critical[0];
      items.push({
        title: `${critical.length} critical priority issue${critical.length > 1 ? "s" : ""} in queue`,
        desc: `${top.title} — ${formatWardName(top.ward, top.wardId)}`,
        linkTo: `/officer/issue/${top.publicRef || top.id}`,
      });
    }
    return items;
  }, [records]);

  const latest = useMemo(() => {
    if (!liveLoaded) {
      return [...statusEvents]
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
        .slice(0, 5);
    }
    return [...liveIssues]
      .sort((a, b) => {
        const tb = new Date(b.updatedAt || b.createdAt).getTime();
        const ta = new Date(a.updatedAt || a.createdAt).getTime();
        return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
      })
      .slice(0, 5)
      .map(item => ({
        id: item.id,
        issueId: item.publicRef || item.id,
        fromStatus: item.status === "Open" ? null : ("Open" as IssueStatus),
        toStatus: item.status as IssueStatus,
        actor: (item as any).assignedOfficer || "Officer",
        actorRole: (item.status === "Open" ? "citizen" : "officer") as "citizen" | "officer",
        timestamp: item.updatedAt || item.createdAt,
        reason: `${item.publicRef || item.id} · ${item.title}`,
      }));
  }, [liveLoaded, liveIssues]);

  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div>
      <PageHeader
        eyebrow="Officer workspace"
        title={`Welcome, ${officerName}.`}
        description="Operational summary computed from current ward queues."
        action={
          <span className="border-2 border-[#2A3320] bg-[#FDFBF7] px-3 py-2 text-[9px] font-black uppercase tracking-wider">
            {todayLabel}
          </span>
        }
      />
      {loadError && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-2 border-[#8B4513] bg-[#8B4513]/10 p-4 text-xs font-bold text-[#8B4513]">
          <span>{loadError} Showing fallback snapshot.</span>
          <Button size="sm" variant="outline" onClick={loadOverview}>
            Retry
          </Button>
        </div>
      )}
      <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MetricCard
          value={String(records.filter(issue => issue.status === "Open").length)}
          label="Open queue"
          sublabel={liveLoaded ? "Live database count" : "Fallback snapshot"}
          icon={ClipboardList}
          accentColor="olive"
        />
        <MetricCard
          value={String(records.filter(issue => issue.status === "In Progress").length)}
          label="In progress"
          sublabel={liveLoaded ? "Live database count" : "Fallback snapshot"}
          icon={Clock3}
          accentColor="gold"
        />
        <MetricCard
          value={String(records.filter(issue => issue.status === "Claimed Resolved").length)}
          label="Claimed resolved"
          sublabel="Awaiting verification"
          icon={FileCheck2}
          accentColor="sand"
        />
        <MetricCard
          value={String(records.filter(issue => issue.slaBreach).length)}
          label="SLA breaches"
          sublabel="Needs attention"
          icon={AlertTriangle}
          accentColor="olive"
        />
      </div>
      <div className="mb-8 grid gap-6 xl:grid-cols-2">
        <Panel className="chart-panel border-4">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <p className="eyebrow">Operational load</p>
              <h2 className="display-title mt-1 text-lg">Ward workload</h2>
            </div>
            <BarChart3 size={19} />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={wards}
              margin={{ top: 6, right: 12, left: -18, bottom: 2 }}
            >
              <CartesianGrid
                stroke="#E8E0D0"
                strokeDasharray="4 4"
                vertical={false}
              />
              <XAxis
                dataKey="ward"
                tick={{ fill: "#2A3320", fontWeight: 700, fontSize: 10 }}
                axisLine={{ stroke: "#2A3320" }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "#2A3320", fontWeight: 700, fontSize: 9 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip {...smallTip} />
              <Bar
                dataKey="open"
                name="Active issues"
                fill="#4F5B2A"
                radius={0}
                barSize={32}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-[#2A3320]/50">
            {liveLoaded ? "Active issues · live database" : "Active issues · fallback snapshot"}
          </p>
        </Panel>
        <Panel className="chart-panel border-4">
          <div className="mb-3">
            <p className="eyebrow">Incoming reports</p>
            <h2 className="display-title mt-1 text-lg">Category breakdown</h2>
          </div>
          {cats.length === 0 ? (
            <p className="py-12 text-center text-xs font-bold text-[#2A3320]/60">
              No issue records available for category breakdown.
            </p>
          ) : (
            <div className="grid items-center gap-2 sm:grid-cols-[1fr_1fr]">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={cats}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={82}
                    innerRadius={0}
                    labelLine={false}
                    label={({ percent }) =>
                      `${Math.round((percent || 0) * 100)}%`
                    }
                    stroke="#2A3320"
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {cats.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...smallTip} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {cats.map((item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider"
                  >
                    <i
                      className="h-3 w-3 border border-[#2A3320]"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    {item.name}
                    <span className="ml-auto">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>
      <section className="mb-8 border-4 border-[#B8892D] bg-[#B8892D]/10 p-5 md:p-6">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle size={18} />
          <h2 className="display-title text-lg">Priority alerts</h2>
        </div>
        {priorityAlerts.length === 0 ? (
          <p className="border-t-2 border-[#B8892D]/30 pt-3 text-xs font-medium text-[#2A3320]/70">
            No SLA breaches, reopened tickets, or critical alerts in the active queue.
          </p>
        ) : (
          priorityAlerts.map(alert => (
            <div key={alert.title} className="border-t-2 border-[#B8892D]/30 py-3">
              <p className="flex items-center gap-2 text-xs font-black">
                <AlertTriangle size={14} className="shrink-0 text-[#B8892D]" />
                {alert.title}
              </p>
              <p className="mt-1 text-xs text-[#2A3320]/75">
                {alert.desc}
                {alert.linkTo && (
                  <>
                    {" "}
                    <Link to={alert.linkTo} className="font-black text-[#4F5B2A] underline">
                      Inspect →
                    </Link>
                  </>
                )}
              </p>
            </div>
          ))
        )}
      </section>
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <section>
          <div className="mb-3 flex items-end justify-between border-b-4 border-[#2A3320] pb-3">
            <div>
              <p className="eyebrow">Latest changes</p>
              <h2 className="display-title mt-1 text-lg">Recent activity</h2>
            </div>
            <Link
              to="/officer/queue"
              className="text-[9px] font-black uppercase tracking-wider text-[#4F5B2A] underline"
            >
              Full queue →
            </Link>
          </div>
          <Panel className="border-4">
            <ActivityTimeline events={latest} />
          </Panel>
        </section>
        <aside className="grid grid-cols-2 gap-3 lg:w-64 lg:grid-cols-1">
          <Link to="/officer/queue">
            <Button className="w-full">View full queue →</Button>
          </Link>
          <Link to="/transparency">
            <Button variant="outline" className="w-full">
              Public map ↗
            </Button>
          </Link>
          <div className="border-2 border-[#2A3320] bg-[#D8C9A8]/40 p-4">
            <p className="eyebrow">Active wards</p>
            <p className="display-title mt-2 text-2xl">{wards.length}</p>
            <p className="mt-1 text-[10px] text-[#2A3320]/60">
              {records.length} total issues tracked
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function TriageQueue() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    status: "All",
    category: "All",
    ward: "All",
  });
  const [sort, setSort] = useState("Newest");
  const [query, setQuery] = useState("");
  const [apiIssues, setApiIssues] = useState<ApiIssue[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    return issuesApi
      .list({ limit: 100 })
      .then(r => {
        setApiIssues(r.items);
        setLoaded(true);
        setLoadError(null);
      })
      .catch((err: any) => {
        setLoadError(err?.message || "Unable to load live triage queue.");
      });
  }, []);

  useEffect(() => {
    let active = true;
    const sync = () => {
      if (!active) return;
      void refresh();
    };
    sync();
    const timer = window.setInterval(sync, 15000);
    window.addEventListener("online", sync);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("online", sync);
    };
  }, [refresh]);

  const source = loaded ? apiIssues : seedIssues;
  const data = useMemo(
    () => filterAndSortQueueIssues(source as any[], filters, query, sort),
    [filters, sort, query, source]
  );

  return (
    <div>
      <PageHeader
        eyebrow="Officer workspace"
        title="Triage queue"
        description="Filter, prioritise, and route incoming civic issues."
        action={
          <span className="border-2 border-[#2A3320] bg-[#D8C9A8] px-3 py-2 text-[10px] font-black uppercase tracking-wider">
            {data.length} issues
          </span>
        }
      />
      {loadError && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-2 border-[#8B4513] bg-[#8B4513]/10 p-4 text-xs font-bold text-[#8B4513]">
          <span>{loadError} {loaded ? "Showing last loaded issues." : "Showing fallback demo queue."}</span>
          <Button size="sm" variant="outline" onClick={() => void refresh()}>
            Retry
          </Button>
        </div>
      )}
      <div className="mb-5 flex flex-col gap-4 border-2 border-[#2A3320] bg-[#FDFBF7] p-4">
        <div className="flex flex-wrap gap-2">
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
                options: ["All", ...categories],
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
          />
        </div>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <label className="flex max-w-sm items-center gap-2 border-2 border-[#2A3320] bg-white px-3 py-2">
            <Search size={14} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search title or issue ID"
              className="w-full bg-transparent text-xs outline-none"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {["Newest", "Oldest", "Most supporters", "SLA deadline"].map(
              name => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSort(name)}
                  className={`border-2 border-[#2A3320] px-2.5 py-2 text-[9px] font-black uppercase tracking-wider ${sort === name ? "bg-[#4F5B2A] text-white shadow-[3px_3px_0px_0px_#2A3320]" : "bg-white"}`}
                >
                  {name}
                </button>
              )
            )}
          </div>
        </div>
      </div>
      {data.length === 0 ? (
        <Panel className="border-4 text-center">
          <p className="display-title text-lg">No matching issues</p>
          <p className="mt-2 text-xs text-[#2A3320]/65">
            {loaded && apiIssues.length === 0
              ? "There are currently no issues in the database."
              : "Adjust your filters or search query to see issues."}
          </p>
        </Panel>
      ) : (
        <>
          <div className="hidden overflow-x-auto border-4 border-[#2A3320] bg-[#FDFBF7] md:block">
            <table className="data-table">
              <thead>
                <tr>
                  {[
                    "ID",
                    "Issue",
                    "Category",
                    "Ward",
                    "Age",
                    "Support",
                    "Priority",
                    "Status",
                    "SLA",
                  ].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(issue => {
                  const {
                    displayId,
                    displayWard,
                    priorityNum,
                    priorityLabel,
                    supporters,
                    ageDisplay,
                    overdueDays,
                  } = formatQueueIssue(issue);

                  return (
                    <tr
                      key={issue.id}
                      onClick={() => navigate(`/officer/issue/${displayId}`)}
                      className={`cursor-pointer ${issue.slaBreach ? "bg-[#B8892D]/10" : ""}`}
                    >
                      <td className="font-black">{displayId}</td>
                      <td>
                        <span className="font-black">{issue.title}</span>
                        {(issue.reopenCount ?? 0) > 0 && (
                          <p className="mt-1 flex items-center gap-1 text-[9px] font-black uppercase text-[#B8892D]">
                            <AlertTriangle size={11} /> Reopened ({issue.reopenCount}x)
                          </p>
                        )}
                      </td>
                      <td>
                        <span className="flex items-center gap-2">
                          <CategoryIcon category={issue.category} size={14} />
                          {issue.category}
                        </span>
                      </td>
                      <td>{displayWard}</td>
                      <td>{ageDisplay}</td>
                      <td className="font-black">{supporters}</td>
                      <td>
                        <span
                          className={
                            priorityNum === 1
                              ? "font-black text-[#8B4513]"
                              : "font-bold"
                          }
                        >
                          {priorityNum === 1 ? "P1" : priorityNum === 2 ? "P2" : priorityNum === 3 ? "P3" : "P4"} · {priorityLabel}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={issue.status} />
                      </td>
                      <td>
                        {issue.slaBreach ? (
                          <span className="font-black text-[#8B4513]">
                            {overdueDays}d overdue
                          </span>
                        ) : (
                          "On track"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="divide-y-2 divide-[#E8E0D0] border-4 border-[#2A3320] bg-[#FDFBF7] md:hidden">
            {data.map(issue => (
              <IssueCard
                key={issue.id}
                issue={issue}
                variant="compact"
                basePath="/officer/issue"
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function OfficerIssueDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [live, setLive] = useState<ApiIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<IssueStatus>("Open");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [assigned, setAssigned] = useState("Unassigned");
  const [flags, setFlags] = useState<AdversarialFlag[]>([]);
  const [similarIssues, setSimilarIssues] = useState<ApiIssue[]>([]);
  const [proofNote, setProofNote] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);

  const syncFromLive = useCallback((issue: ApiIssue) => {
    setLive(issue);
    const transitions = OFFICER_TRANSITIONS[issue.status] ?? [];
    setStatus(transitions[0] ?? (issue.status as IssueStatus));
    setDepartmentId(issue.departmentId ?? "");
    const assignedName = (issue as any).assignedOfficer;
    const assignedId = (issue as any).assignedTo;
    setAssigned(
      assignedName
        ? String(assignedName)
        : assignedId
          ? `Officer (${String(assignedId).slice(0, 8)})`
          : "Unassigned"
    );
  }, []);

  const reloadIssue = useCallback(
    async (targetId: string) => {
      const fresh = await issuesApi.get(targetId);
      syncFromLive(fresh);
      return fresh;
    },
    [syncFromLive]
  );

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setLoadError("No issue ID specified.");
      return;
    }
    let active = true;
    setLoading(true);
    setLoadError(null);
    setLive(null);
    setAssigned("Unassigned");
    setDepartmentId("");
    setFlags([]);
    setSimilarIssues([]);
    setReason("");
    setProofNote("");
    setProofFile(null);

    void issuesApi
      .get(id)
      .then(issue => {
        if (!active) return;
        syncFromLive(issue);
        setLoading(false);
      })
      .catch((err: any) => {
        if (!active) return;
        setLoadError(err?.message || "Unable to load issue.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, syncFromLive]);

  useEffect(() => {
    if (!live?.id) return;
    let active = true;
    void adversarialApi
      .getFlags(live.id)
      .then(data => {
        if (active) setFlags(data);
      })
      .catch(() => {
        if (active) setFlags([]);
      });
    void issuesApi
      .list({ category: live.category, limit: 5 })
      .then(res => {
        if (active) {
          setSimilarIssues(res.items.filter(item => item.id !== live.id).slice(0, 2));
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [live?.id, live?.category]);

  if (loading) {
    return (
      <div>
        <button
          type="button"
          onClick={() => navigate("/officer/queue")}
          className="mb-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#4F5B2A] hover:underline"
        >
          <ArrowLeft size={14} />
          Back to triage queue
        </button>
        <Panel className="animate-pulse border-4">
          <div className="h-6 w-1/3 bg-[#D8C9A8]" />
          <div className="mt-4 h-4 w-2/3 bg-[#E8E0D0]" />
        </Panel>
      </div>
    );
  }

  if (loadError || !live) {
    return (
      <div>
        <button
          type="button"
          onClick={() => navigate("/officer/queue")}
          className="mb-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#4F5B2A] hover:underline"
        >
          <ArrowLeft size={14} />
          Back to triage queue
        </button>
        <Panel className="border-4 border-[#8B4513] bg-[#8B4513]/10">
          <p className="display-title text-lg text-[#8B4513]">Issue unavailable</p>
          <p className="mt-2 text-sm text-[#2A3320]/80">
            {loadError || "The requested issue could not be found."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {id && (
              <Button
                variant="outline"
                onClick={() => {
                  setLoading(true);
                  setLoadError(null);
                  void reloadIssue(id)
                    .then(() => setLoading(false))
                    .catch((err: any) => {
                      setLoadError(err?.message || "Unable to load issue.");
                      setLoading(false);
                    });
                }}
              >
                Retry
              </Button>
            )}
            <Link to="/officer/queue">
              <Button>Return to queue</Button>
            </Link>
          </div>
        </Panel>
      </div>
    );
  }

  const activeFlags = flags.filter(f => !f.resolvedAt);
  const allowedTransitions = OFFICER_TRANSITIONS[live.status] ?? [];
  const hasProof = live.proofState === "submitted" || live.proofState === "accepted";
  const allEvents = live.events ?? [];
  const rawConfidence = (live as any).aiConfidence;
  const confidencePct =
    typeof rawConfidence === "number" && Number.isFinite(rawConfidence)
      ? Math.round(rawConfidence * 100)
      : null;
  const departmentLabel = formatDepartmentName((live as any).department, live.departmentId);
  const wardLabel = formatWardName(live.ward, live.wardId);
  const beforeMedia = live.media?.find(m => m.type === "before") ?? live.media?.[0];
  const beforeMediaUrl = getSafeMediaUrl(beforeMedia);

  const updateStatus = async () => {
    if (!live.id) return;
    if (!allowedTransitions.includes(status)) {
      toast.error(`Cannot transition from ${live.status} to ${status}.`);
      return;
    }
    if (status === "Claimed Resolved" && !hasProof) {
      toast.error("Submit proof of fix before claiming resolved.");
      return;
    }
    try {
      await issuesApi.updateStatus(live.id, status, reason);
      await reloadIssue(live.id);
      toast.success(`Status updated to ${status}.`);
      setReason("");
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
    }
  };

  const assignToMe = async () => {
    if (!live.id) return;
    try {
      await issuesApi.assign(live.id);
      await reloadIssue(live.id);
      toast.success("Issue assigned to you.");
    } catch (e: any) {
      toast.error(e.message || "Assignment failed");
    }
  };

  const updateDepartment = async (value: string) => {
    if (!live.id || !value) return;
    const previous = departmentId;
    setDepartmentId(value);
    try {
      await issuesApi.update(live.id, { departmentId: value });
      await reloadIssue(live.id);
      toast.success("Department updated.");
    } catch (e: any) {
      setDepartmentId(previous);
      toast.error(e.message || "Department update failed");
    }
  };

  const handleSubmitProof = async () => {
    if (!live.id || submittingProof) return;
    setSubmittingProof(true);
    try {
      let uploadedMediaId: string | undefined;
      if (proofFile) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("Unable to read selected image."));
          reader.readAsDataURL(proofFile);
        });
        const uploaded = await issuesApi.uploadMedia(live.id, dataUrl, "after");
        if (uploaded?.id) uploadedMediaId = String(uploaded.id);
      }

      await issuesApi.submitProof(
        live.id,
        proofNote || undefined,
        undefined,
        uploadedMediaId
      );
      await reloadIssue(live.id);
      setProofNote("");
      setProofFile(null);
      toast.success("Proof of fix submitted.");
    } catch (e: any) {
      toast.error(e.message || "Failed to submit proof");
    } finally {
      setSubmittingProof(false);
    }
  };

  const dismissFlag = async (flagId: string) => {
    try {
      await adversarialApi.resolveFlag(flagId, "dismissed");
      setFlags(old =>
        old.map(f =>
          f.id === flagId ? { ...f, resolvedAt: new Date().toISOString() } : f
        )
      );
      toast.success("Flag dismissed");
    } catch {
      toast.error("Failed to dismiss flag");
    }
  };

  const priorityNum =
    typeof live.priority === "number" && live.priority >= 1 && live.priority <= 4
      ? live.priority
      : 3;

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/officer/queue")}
        className="mb-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#4F5B2A] hover:underline"
      >
        <ArrowLeft size={14} />
        Back to triage queue
      </button>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <div className="space-y-6">
          <div className="border-b-4 border-[#2A3320] pb-5">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <p className="eyebrow">
                {live.publicRef || live.id} · {wardLabel}
              </p>
              <StatusBadge status={live.status} />
            </div>
            <h1 className="display-title text-2xl md:text-3xl">{live.title}</h1>
            <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#2A3320]/60">
              <CategoryIcon category={live.category} size={15} />
              {live.category}
              <span>·</span>
              {departmentLabel}
              <span>·</span>
              {live.age || (live.ageInDays !== undefined ? `${live.ageInDays}d ago` : "Recent")}
              <span>·</span>
              {live.supporterCount ?? live.supporters ?? 0} supporters
            </p>
          </div>
          <section>
            <p className="eyebrow mb-3">Issue description</p>
            <Panel className="border-4">
              <p className="text-sm leading-relaxed">
                {live.description || "No description provided."}
              </p>
            </Panel>
          </section>
          <section>
            <p className="eyebrow mb-3">Evidence & location</p>
            <div className="grid gap-4 md:grid-cols-2">
              <Panel className="flex min-h-52 flex-col items-center justify-center overflow-hidden border-4 bg-[#D8C9A8]/40 !p-0">
                {beforeMediaUrl ? (
                  <>
                    <img
                      src={beforeMediaUrl}
                      alt={`Citizen photo for ${live.title}`}
                      className="h-44 w-full object-cover"
                    />
                    <p className="w-full border-t-2 border-[#2A3320] bg-[#FDFBF7] px-3 py-2 text-[9px] font-black uppercase tracking-wider">
                      Citizen photo · Public preview
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-5 text-center">
                    <CameraGlyph />
                    <p className="mt-4 text-[9px] font-black uppercase tracking-wider">
                      {beforeMedia ? "Citizen photo · Private storage" : "No citizen photo attached"}
                    </p>
                  </div>
                )}
              </Panel>
              <MapView
                issues={[live]}
                selectedId={live.id}
                height="210px"
                linkBasePath="/officer/issue"
              />
            </div>
          </section>
          <section>
            <p className="eyebrow mb-3">Model suggestions · M1</p>
            <Panel className="border-4 border-[#B8892D] bg-[#B8892D]/10">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="eyebrow">Category</p>
                  <p className="mt-1 text-sm font-black">{live.category}</p>
                </div>
                <div>
                  <p className="eyebrow">Department</p>
                  <p className="mt-1 text-sm font-black">{departmentLabel}</p>
                </div>
                <div>
                  <p className="eyebrow">Urgency</p>
                  <p className="mt-1 text-sm font-black">
                    Tier {priorityNum} · {["Critical", "High", "Medium", "Low"][priorityNum - 1]}
                  </p>
                </div>
              </div>
              <p className="mt-4 border-t-2 border-[#B8892D]/30 pt-3 text-xs">
                <b>Confidence:</b> {confidencePct !== null ? `${confidencePct}%` : "N/A"} · review
                recommendations, not decisions.
              </p>
            </Panel>
          </section>
          <section>
            <p className="eyebrow mb-3">Adversarial checks</p>
            {activeFlags.length === 0 ? (
              <div className="flex items-center gap-2 border-2 border-[#4F5B2A] bg-[#4F5B2A]/10 p-3 text-xs font-bold text-[#4F5B2A]">
                <Check size={15} /> No active adversarial flags detected
              </div>
            ) : (
              <div className="space-y-3">
                {activeFlags.map(f => (
                  <div
                    key={f.id}
                    className={`border-4 bg-white p-4 ${f.severity === "high" ? "border-[#B22222]" : f.severity === "medium" ? "border-[#C0621A]" : "border-[#4F5B2A]"}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle
                          size={16}
                          className={
                            f.severity === "high"
                              ? "text-[#B22222]"
                              : "text-[#C0621A]"
                          }
                        />
                        <span className="text-[10px] font-black uppercase tracking-wider">
                          {f.rule.replaceAll("_", " ")}
                        </span>
                      </div>
                      <span className="bg-[#2A3320] px-2 py-1 text-[9px] font-bold uppercase text-white">
                        {f.severity}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-[#2A3320]/80">
                      {formatFlagDetails(f)}
                    </p>
                    <Button
                      variant="outline"
                      className="mt-3 text-[9px]"
                      onClick={() => void dismissFlag(f.id)}
                    >
                      Dismiss flag
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section>
            <p className="eyebrow mb-3">Why prioritised</p>
            <div className="border-4 border-[#2A3320] bg-[#D8C9A8]/30 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                <p className="text-sm leading-relaxed">
                  {live.urgencyExplanation ||
                    "Priority calculated from category risk, age, community support, and SLA deadline."}
                </p>
              </div>
            </div>
          </section>
          <section>
            <p className="eyebrow mb-3">Full timeline</p>
            <Panel className="border-4">
              <ActivityTimeline events={allEvents} />
            </Panel>
          </section>
        </div>
        <aside>
          <Panel className="sticky top-24 border-4">
            <p className="eyebrow">Officer actions</p>
            <h2 className="display-title mt-1 text-xl">Manage issue</h2>
            <div className="mt-5 border-t-2 border-[#E8E0D0] pt-5">
              <label className="eyebrow block">Assignment</label>
              <p className="mt-2 text-xs font-bold">
                Current owner: {assigned}
              </p>
              <Button
                className="mt-3 w-full"
                variant="outline"
                onClick={() => void assignToMe()}
              >
                Assign to me
              </Button>
              <label
                htmlFor="department"
                className="mt-4 block text-[9px] font-black uppercase tracking-widest"
              >
                Department
              </label>
              <select
                id="department"
                value={departmentId}
                onChange={event => void updateDepartment(event.target.value)}
                className="input-block mt-2 border-2 py-2 text-xs"
              >
                <option value="" disabled>
                  Select department
                </option>
                {DEPARTMENT_OPTIONS.map(dep => (
                  <option key={dep.id} value={dep.id}>
                    {dep.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-5 border-t-2 border-[#E8E0D0] pt-5">
              <label className="eyebrow block">Status update</label>
              {allowedTransitions.length === 0 ? (
                <p className="mt-2 border-2 border-[#E8E0D0] bg-[#F5EFE3] p-3 text-xs text-[#2A3320]/75">
                  Current status is <b>{live.status}</b>. No officer status transitions are available from this state.
                </p>
              ) : (
                <>
                  <select
                    value={status}
                    onChange={event => setStatus(event.target.value as IssueStatus)}
                    className="input-block mt-2 border-2 py-2 text-xs"
                  >
                    {allowedTransitions.map(value => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  {status === "Claimed Resolved" && !hasProof && (
                    <p className="mt-2 text-[11px] font-bold text-[#8B4513]">
                      Submit resolution proof below before marking Claimed Resolved.
                    </p>
                  )}
                  <textarea
                    value={reason}
                    onChange={event => setReason(event.target.value)}
                    placeholder="Reason for status update"
                    className="input-block mt-3 min-h-24 border-2 text-xs"
                  />
                  <Button
                    className="mt-3 w-full"
                    disabled={status === "Claimed Resolved" && !hasProof}
                    onClick={() => void updateStatus()}
                  >
                    Update status →
                  </Button>
                </>
              )}
            </div>
            <div className="mt-5 border-t-2 border-[#E8E0D0] pt-5">
              <p className="eyebrow">Proof of fix</p>
              <p className="mt-2 text-xs text-[#2A3320]/65">
                Current proof state: <b>{live.proofState || "none"}</b>
              </p>
              <textarea
                value={proofNote}
                onChange={event => setProofNote(event.target.value)}
                placeholder="Resolution note for citizen verification"
                className="input-block mt-3 min-h-20 border-2 text-xs"
              />
              <label className="mt-2 flex cursor-pointer items-center gap-2 border-2 border-dashed border-[#2A3320] bg-[#F5EFE3] px-3 py-2 text-[10px] font-bold uppercase tracking-wider">
                <Upload size={14} />
                <span className="truncate">
                  {proofFile ? proofFile.name : "Attach after photo (optional)"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={e => setProofFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <Button
                className="mt-3 w-full"
                variant="outline"
                disabled={submittingProof}
                onClick={() => void handleSubmitProof()}
              >
                {submittingProof ? "Submitting proof..." : "Submit proof of fix"}
              </Button>
              <Link
                to={`/officer/issue/${live.publicRef || live.id}/proof`}
                className="mt-3 block"
              >
                <Button variant="gold" className="w-full">
                  + Review proof flow
                </Button>
              </Link>
            </div>
            <div className="mt-5 border-t-2 border-[#E8E0D0] pt-5">
              <p className="eyebrow">Similar issues</p>
              {similarIssues.length === 0 ? (
                <p className="mt-2 text-xs text-[#2A3320]/60">No similar active issues found.</p>
              ) : (
                similarIssues.map(item => (
                  <Link
                    key={item.id}
                    to={`/officer/issue/${item.publicRef || item.id}`}
                    className="mt-3 block border-2 border-[#2A3320] bg-[#D8C9A8]/25 p-3 text-xs font-bold hover:bg-[#D8C9A8]/50"
                  >
                    {item.title}
                    <span className="mt-1 block text-[9px] font-black uppercase text-[#4F5B2A]">
                      {item.publicRef || item.id} · {item.status} ↗
                    </span>
                  </Link>
                ))
              )}
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function CameraGlyph() {
  return (
    <div className="flex h-16 w-20 items-center justify-center border-4 border-[#2A3320] bg-[#FDFBF7] shadow-[4px_4px_0px_0px_#2A3320]">
      <MapPin size={28} />
    </div>
  );
}

export function ProofReview() {
  const { id } = useParams();
  const [live, setLive] = useState<ApiIssue | null>(null);
  const [flags, setFlags] = useState<AdversarialFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<"accepted" | "rejected" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadProofData = useCallback(async (targetId: string) => {
    setLoading(true);
    setLoadError(null);
    setLive(null);
    setFlags([]);
    setReviewed(null);
    try {
      const issue = await issuesApi.get(targetId);
      setLive(issue);
      const fetchedFlags = await adversarialApi.getFlags(issue.id).catch(() => []);
      setFlags(fetchedFlags);
    } catch (err: any) {
      setLoadError(err?.message || "Unable to load proof review data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setLoadError("No issue ID provided.");
      return;
    }
    void loadProofData(id);
  }, [id, loadProofData]);

  const review = async (decision: "accepted" | "rejected") => {
    if (!live?.id || submitting) {
      if (!live?.id) toast.error("Live issue not loaded.");
      return;
    }
    setSubmitting(true);
    try {
      await issuesApi.reviewProof(live.id, decision);
      const refreshed = await issuesApi.get(live.id);
      setLive(refreshed);
      setReviewed(decision);
      toast.success(
        decision === "accepted" ? "Proof accepted." : "Re-submission requested."
      );
    } catch (error: any) {
      toast.error(error?.message || "Proof review failed");
    } finally {
      setSubmitting(false);
    }
  };

  const dismissFlag = async (flagId: string) => {
    try {
      await adversarialApi.resolveFlag(flagId, "dismissed");
      setFlags(old =>
        old.map(f =>
          f.id === flagId ? { ...f, resolvedAt: new Date().toISOString() } : f
        )
      );
      toast.success("Flag dismissed.");
    } catch {
      toast.error("Failed to dismiss flag.");
    }
  };

  if (loading) {
    return (
      <Panel className="animate-pulse border-4">
        <div className="h-6 w-1/3 bg-[#D8C9A8]" />
        <div className="mt-4 h-4 w-2/3 bg-[#E8E0D0]" />
      </Panel>
    );
  }

  if (loadError || !live) {
    return (
      <Panel className="border-4 border-[#8B4513] bg-[#8B4513]/10">
        <p className="display-title text-lg text-[#8B4513]">Proof review unavailable</p>
        <p className="mt-2 text-sm text-[#2A3320]/80">
          {loadError || "The requested issue could not be loaded."}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {id && (
            <Button variant="outline" onClick={() => void loadProofData(id)}>
              Retry
            </Button>
          )}
          <Link to="/officer/queue">
            <Button>Back to queue</Button>
          </Link>
        </div>
      </Panel>
    );
  }

  const beforeMedia = live.media?.find(m => m.type === "before");
  const afterMedia = live.media?.find(m => m.type === "after" || m.type === "proof");
  const beforeUrl = getSafeMediaUrl(beforeMedia);
  const afterUrl = getSafeMediaUrl(afterMedia);

  const activeFlags = flags.filter(f => !f.resolvedAt);
  const ruleLabels: Array<{ rule: AdversarialFlag["rule"]; label: string }> = [
    { rule: "GPS_MISMATCH", label: "Location match" },
    { rule: "TEMPORAL", label: "Time plausibility" },
    { rule: "PHOTO_REUSE", label: "Image reuse check" },
    { rule: "BULK_CLOSURE", label: "Bulk closure check" },
  ];
  const checkRows = ruleLabels.map(({ rule, label }) => {
    const active = activeFlags.find(f => f.rule === rule);
    return {
      label,
      flag: active ?? null,
      result: active ? `FLAGGED (${active.severity.toUpperCase()})` : "PASS",
    };
  });

  const votes = (live as any).verificationVotes ?? { fixed: 0, notFixed: 0, unsure: 0 };
  const fixedVotes = Number(votes.fixed ?? 0);
  const notFixedVotes = Number(votes.notFixed ?? 0);
  const unsureVotes = Number(votes.unsure ?? 0);
  const totalDirectional = fixedVotes + notFixedVotes;
  const fixedPct = totalDirectional > 0 ? Math.round((fixedVotes / totalDirectional) * 100) : 0;
  const notFixedPct = totalDirectional > 0 ? 100 - fixedPct : 0;

  return (
    <div>
      <PageHeader
        eyebrow={`Issue ${live.publicRef || live.id} · Proof state: ${live.proofState || "none"}`}
        title="Proof of fix review"
        description="Review officer evidence alongside the original report and community verification signals."
      />
      <div className="mb-7 grid gap-4 md:grid-cols-2">
        <Panel className="overflow-hidden border-4 !p-0">
          {beforeUrl ? (
            <img
              src={beforeUrl}
              alt={`Before photo for ${live.title}`}
              className="h-64 w-full object-cover"
            />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center bg-[#D8C9A8]/40 text-center">
              <MapPin size={45} />
              <p className="mt-2 text-xs font-bold text-[#2A3320]/65">
                {beforeMedia ? "Private media only" : "No before photo uploaded"}
              </p>
            </div>
          )}
          <p className="border-t-4 border-[#2A3320] bg-[#2A3320] px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white">
            Before · Citizen report
          </p>
        </Panel>
        <Panel className="overflow-hidden border-4 !p-0">
          {afterUrl ? (
            <img
              src={afterUrl}
              alt={`After evidence photo for ${live.title}`}
              className="h-64 w-full object-cover"
            />
          ) : (
            <div className="flex h-64 flex-col items-center justify-center bg-[#D8C9A8]/70 text-center">
              <FileCheck2 size={45} />
              <p className="mt-2 text-xs font-bold text-[#2A3320]/65">
                {afterMedia ? "Private media only" : "No after photo uploaded"}
              </p>
            </div>
          )}
          <p className="border-t-4 border-[#2A3320] bg-[#2A3320] px-4 py-3 text-[9px] font-black uppercase tracking-widest text-white">
            After · Officer evidence
          </p>
        </Panel>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <section>
          <p className="eyebrow mb-3">Issue summary</p>
          <Panel className="mb-6 border-4 bg-[#D8C9A8]/30">
            <p className="text-sm font-bold">{live.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-[#2A3320]/80">
              {live.description || "Status: " + live.status}
            </p>
          </Panel>
          <p className="eyebrow mb-3">Automated evidence checks</p>
          <Panel
            className={`border-4 ${
              activeFlags.length > 0
                ? "border-[#B8892D] bg-[#B8892D]/10"
                : "border-[#4F5B2A] bg-[#4F5B2A]/10"
            }`}
          >
            <h2 className="display-title text-lg">
              {activeFlags.length > 0 ? "Needs review" : "Checks passed"}
            </h2>
            {checkRows.map(({ label, flag, result }) => (
              <div
                key={label}
                className="border-b border-[#E8E0D0] py-3 last:border-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs font-bold">
                    {flag ? (
                      <AlertTriangle size={16} className="text-[#B8892D]" />
                    ) : (
                      <Check size={16} className="text-[#4F5B2A]" />
                    )}
                    {label}
                  </span>
                  <span
                    className={`text-[9px] font-black uppercase tracking-widest ${
                      flag ? "text-[#B8892D]" : "text-[#4F5B2A]"
                    }`}
                  >
                    {result}
                  </span>
                </div>
                {flag && (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pl-6">
                    <p className="text-xs text-[#2A3320]/80">{formatFlagDetails(flag)}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void dismissFlag(flag.id)}
                    >
                      Dismiss flag
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </Panel>
        </section>
        <aside>
          <Panel className="border-4">
            <p className="eyebrow">Community verification</p>
            <h2 className="display-title mt-2 text-lg">Current votes</h2>
            <div className="mt-5 flex h-5 overflow-hidden border-2 border-[#2A3320] bg-[#E8E0D0]">
              {totalDirectional > 0 && (
                <>
                  <div className="bg-[#4F5B2A]" style={{ width: `${fixedPct}%` }} />
                  <div className="bg-[#B8892D]" style={{ width: `${notFixedPct}%` }} />
                </>
              )}
            </div>
            <div className="mt-3 flex flex-wrap justify-between gap-2 text-[10px] font-black uppercase">
              <span className="inline-flex items-center gap-1">
                <Check size={12} className="text-[#4F5B2A]" /> {fixedVotes} fixed
              </span>
              <span className="inline-flex items-center gap-1">
                <X size={12} className="text-[#8B4513]" /> {notFixedVotes} not fixed
              </span>
              {unsureVotes > 0 && <span>{unsureVotes} unsure</span>}
            </div>
            {fixedVotes + notFixedVotes + unsureVotes === 0 && (
              <p className="mt-3 text-xs text-[#2A3320]/60">
                No citizen verification votes recorded yet.
              </p>
            )}
            <p className="mt-4 text-xs leading-relaxed text-[#2A3320]/65">
              Reopen threshold: 2 nearby “not fixed” votes.
            </p>
            <p className="mt-5 border-t-2 border-[#E8E0D0] pt-4 text-[10px] font-bold uppercase tracking-wider text-[#2A3320]/60">
              Issue: {live.title}
            </p>
          </Panel>
          <div className="mt-5 space-y-3">
            <Button
              className="w-full"
              disabled={submitting}
              onClick={() => void review("accepted")}
            >
              Accept claim →
            </Button>
            <Button
              className="w-full"
              variant="gold"
              disabled={submitting}
              onClick={() => void review("rejected")}
            >
              Request re-submission
            </Button>
            <Link to={`/officer/issue/${live.publicRef || live.id}`} className="block">
              <Button variant="outline" className="w-full">
                ← Back to issue
              </Button>
            </Link>
            {reviewed && (
              <p className="border-2 border-[#4F5B2A] bg-[#4F5B2A]/10 p-3 text-center text-[9px] font-black uppercase tracking-widest">
                Review recorded: {reviewed}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
