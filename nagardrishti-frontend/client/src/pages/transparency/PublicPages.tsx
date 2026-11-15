import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Building2, Check, Eye, MapPin, ShieldCheck } from 'lucide-react';
import { issues as seedIssues, statusEvents } from '../../data/seed';
import {
  auditApi,
  issuesApi,
  mapApi,
  transparencyApi,
  type ApiIssue,
  type ChainVerificationResult,
  type MapMarker,
  type ScorecardData,
  type ScorecardGroupMetrics,
  type ScorecardSnapshotItem,
  type WeeklyMetricPoint,
  TIER_COLORS,
} from '../../lib/api';
import { loadSubmittedIssues } from '../../data/localDemo';
import type { IssueStatus } from '../../types';
import { FilterBar } from '../../components/shared/FilterBar';
import { IssueCard } from '../../components/shared/IssueCard';
import { MapView } from '../../components/shared/MapView';
import { PageHeader, Panel } from '../../components/shared/Primitives';
import { ActivityTimeline } from '../../components/shared/ActivityTimeline';
import { StatusBadge } from '../../components/shared/StatusBadge';

const tip = { contentStyle: { backgroundColor: '#2A3320', border: 0, borderRadius: 0, color: '#fff', fontSize: 10 }, itemStyle: { color: '#fff' } };

const DEPARTMENT_LABELS: Record<string, string> = {
  roads: 'Roads & Infrastructure',
  waste: 'Solid Waste Management',
  water: 'Water Supply',
  drainage: 'Drainage & Sewage',
  electrical: 'Electrical & Streetlights',
  animals: 'Stray Animal Control',
  'civic-works': 'Civic Works',
};

function formatWardLabel(ward?: string | null, wardId?: string | null) {
  if (ward && ward.trim()) return ward;
  if (wardId && wardId.trim()) {
    const num = wardId.replace(/^ward-/i, '');
    return /^ward\b/i.test(wardId) ? wardId : `Ward ${num}`;
  }
  return 'Pune';
}

function formatDepartmentLabel(department?: string | null, departmentId?: string | null) {
  if (department && department.trim()) return department;
  if (departmentId && departmentId.trim()) return DEPARTMENT_LABELS[departmentId] ?? departmentId;
  return null;
}

function toWardSlug(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

function formatDateSafe(value?: string | null) {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleDateString();
}

function getOverdueDays(slaDeadline?: string | null): number | null {
  if (!slaDeadline) return null;
  const ms = new Date(slaDeadline).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.max(1, Math.floor((Date.now() - ms) / 86400000));
}

function getSafePublicMediaUrl(media?: { publicPath?: string | null }): string | null {
  const url = media?.publicPath;
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('s3://')) return null;
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('data:image/')
  ) {
    return trimmed;
  }
  return null;
}

export function PublicMap() {
  const [filter, setFilter] = useState({ ward: 'All', category: 'All', status: 'All' });
  const [selected, setSelected] = useState<any>(null);
  const [mapIssues, setMapIssues] = useState<MapMarker[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [neglectZones, setNeglectZones] = useState<string[]>([]);
  const [submittedIssues] = useState(loadSubmittedIssues);

  const refresh = useCallback(() => {
    void mapApi
      .getMarkers()
      .then(data => {
        setMapIssues(Array.isArray(data) ? data : []);
        setMapError(null);
        setLoaded(true);
      })
      .catch((err: any) => {
        setMapError(err?.message || 'Unable to load live public map markers.');
        setLoaded(true);
      });
    void transparencyApi
      .getNeglectZones()
      .then(d => setNeglectZones(d.wardIds))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener('online', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', refresh);
    };
  }, [refresh]);

  const allIssues = useMemo(() => {
    if (loaded && !mapError) return mapIssues;
    return mapIssues.length > 0 ? mapIssues : [...seedIssues, ...submittedIssues];
  }, [loaded, mapError, mapIssues, submittedIssues]);

  const filtered = useMemo(() => {
    const selectedWardSlug = toWardSlug(filter.ward);
    return (allIssues as any[]).filter(issue => {
      const issueWardLabel = formatWardLabel(issue.ward, issue.wardId);
      const matchesWard =
        filter.ward === 'All' ||
        issue.ward === filter.ward ||
        (issue.wardId && toWardSlug(String(issue.wardId)) === selectedWardSlug) ||
        toWardSlug(issueWardLabel) === selectedWardSlug;
      const matchesCategory = filter.category === 'All' || issue.category === filter.category;
      const matchesStatus = filter.status === 'All' || issue.status === filter.status;
      return matchesWard && matchesCategory && matchesStatus;
    });
  }, [filter, allIssues]);

  const metrics = [
    ['' + allIssues.filter((i: any) => i.status === 'Open').length, 'Open'],
    ['' + allIssues.filter((i: any) => i.status === 'In Progress' || i.status === 'Assigned').length, 'In progress'],
    ['' + allIssues.filter((i: any) => i.status === 'Verified Fixed').length, 'Resolved'],
    ['' + allIssues.filter((i: any) => i.status === 'Reopened').length, 'Reopened'],
  ];

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <PageHeader
        eyebrow="Public information · No login required"
        title="Public issue map — Pune"
        description="Privacy-coarsened locations. Explore issue status and service patterns across Pune."
        action={
          <span className="inline-flex min-h-[38px] items-center gap-2 border-2 border-[#2A3320] bg-[#D8C9A8] px-3 py-2 text-xs font-black uppercase tracking-wider sm:text-[9px]">
            <ShieldCheck size={14} />
            Redacted public view
          </span>
        }
      />
      {mapError && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-2 border-[#8B4513] bg-[#8B4513]/10 px-4 py-3 text-xs font-bold text-[#8B4513]">
          <span>{mapError} Showing fallback data.</span>
          <button
            type="button"
            onClick={refresh}
            className="border-2 border-[#2A3320] bg-[#FDFBF7] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#2A3320]"
          >
            Retry
          </button>
        </div>
      )}
      <div className="mb-3 grid grid-cols-4 gap-1.5 sm:hidden">
        {metrics.map(([value, label]) => (
          <div key={label} className="border-2 border-[#2A3320] bg-[#FDFBF7] px-2 py-2 text-center">
            <span className="display-title block text-lg leading-none">{value}</span>
            <span className="mt-1 block text-[11px] font-bold text-[#2A3320]/70">{label}</span>
          </div>
        ))}
      </div>
      {neglectZones.length > 0 && (
        <div className="mb-3 border-2 border-[#2A3320] bg-[#8B0000]/10 px-3 py-2 text-xs font-black uppercase tracking-wider text-[#8B0000] sm:hidden">
          <AlertTriangle size={14} className="mr-1.5 inline" />
          {neglectZones.length} Neglect Zone{neglectZones.length > 1 ? 's' : ''} flagged
        </div>
      )}
      <div className="mb-4 border-2 border-[#2A3320] bg-[#FDFBF7] p-2.5 sm:p-3">
        <FilterBar
          filters={[
            { key: 'ward', label: 'Ward', options: ['All', 'Ward 11', 'Ward 12', 'Ward 14', 'Ward 15'] },
            {
              key: 'category',
              label: 'Category',
              options: [
                'All',
                'pothole/road',
                'garbage/waste',
                'drainage/sewage',
                'water supply',
                'streetlight/electrical',
                'stray animals',
                'encroachment',
                'other',
              ],
            },
            {
              key: 'status',
              label: 'Status',
              options: ['All', 'Open', 'Triaged', 'Assigned', 'In Progress', 'Claimed Resolved', 'Verified Fixed', 'Reopened'],
            },
          ]}
          onFilterChange={(key, value) => setFilter(old => ({ ...old, [key]: value }))}
        />
      </div>
      <div className="relative">
        <MapView
          issues={filtered}
          selectedId={selected?.id}
          onSelectIssue={setSelected}
          height="min(62dvh, 740px)"
          publicView
          neglectZoneWards={neglectZones}
        />
        {loaded && filtered.length === 0 && (
          <div className="pointer-events-none absolute inset-0 z-[450] flex items-center justify-center p-4">
            <div className="border-4 border-[#2A3320] bg-[#FDFBF7]/95 px-5 py-4 text-center shadow-[4px_4px_0px_0px_#2A3320]">
              <p className="display-title text-sm">No matching issues</p>
              <p className="mt-1 text-xs text-[#2A3320]/70">
                {allIssues.length === 0
                  ? 'No public issues have been recorded yet.'
                  : 'Try clearing one of the ward, category, or status filters.'}
              </p>
            </div>
          </div>
        )}
        <div className="absolute right-3 top-14 z-[500] hidden w-40 border-4 border-[#2A3320] bg-[#FDFBF7] shadow-[4px_4px_0px_0px_#2A3320] sm:block">
          {metrics.map(([value, label]) => (
            <div key={label} className="flex justify-between border-b-2 border-[#E8E0D0] px-3 py-2.5 last:border-0">
              <span className="display-title text-xl">{value}</span>
              <span className="self-center text-[9px] font-black uppercase tracking-wider">{label}</span>
            </div>
          ))}
          {neglectZones.length > 0 && (
            <div className="border-t-2 border-[#2A3320] bg-[#8B0000]/10 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-[#8B0000]">
              <AlertTriangle size={12} className="mr-1 inline" />
              {neglectZones.length} Neglect Zone{neglectZones.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
      <div className="mt-5 flex flex-col justify-between gap-2 border-t-2 border-[#D8C9A8] pt-4 text-xs font-bold uppercase tracking-wider text-[#2A3320]/60 sm:flex-row sm:text-[9px]">
        <span>⌖ All locations are coarsened. No personal data is displayed.</span>
        <span>{loaded && !mapError ? 'Live coarsened records from public map API.' : 'Showing fallback snapshot.'}</span>
      </div>
      {selected && (
        <div className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[600] mx-auto max-w-lg border-2 border-[#2A3320] bg-[#FDFBF7] p-4 shadow-[5px_5px_0px_0px_#2A3320] sm:border-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="eyebrow">Approximate issue preview</p>
            <button
              onClick={() => setSelected(null)}
              aria-label="Close issue preview"
              className="inline-flex min-h-[40px] items-center border-2 border-[#2A3320] bg-white px-3 text-xs font-black"
            >
              CLOSE ×
            </button>
          </div>
          <IssueCard issue={selected} variant="compact" publicView />
          <Link
            to={`/transparency/issue/${selected.publicRef || selected.id}`}
            className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center border-2 border-[#2A3320] bg-[#4F5B2A] px-4 text-xs font-black uppercase tracking-wider text-white"
          >
            View redacted issue →
          </Link>
        </div>
      )}
    </div>
  );
}

function toScorecardRow(name: string, metrics: ScorecardGroupMetrics) {
  return {
    name,
    total: metrics.totalIssues,
    resolved: metrics.resolvedIssues,
    active: metrics.activeIssues,
    sla: Math.round(metrics.slaCompliance),
    days: metrics.medianResolutionDays.toFixed(1),
    reopen: Math.round(metrics.reopenRate),
    weeklyMetrics: metrics.weeklyMetrics ?? [],
  };
}

export function Scorecards() {
  const [view, setView] = useState<'ward' | 'department'>('ward');
  const [apiScorecard, setApiScorecard] = useState<ScorecardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [scorecardError, setScorecardError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    transparencyApi
      .getScorecard()
      .then(d => {
        if (cancelled) return;
        setApiScorecard(d);
        setScorecardError(null);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setScorecardError(err?.message || 'Unable to fetch live system scorecard.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    if (!apiScorecard) return [];

    const directRows =
      view === 'ward'
        ? (apiScorecard.byWard ?? []).map(item =>
            toScorecardRow(item.wardName || item.ward || item.wardId, item)
          )
        : (apiScorecard.byDepartment ?? []).map(item =>
            toScorecardRow(item.departmentName || item.department || item.departmentId, item)
          );

    if (directRows.length > 0) {
      return [...directRows].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    }

    const snapshots = apiScorecard.snapshots ?? [];
    const groups = new Map<string, ScorecardSnapshotItem[]>();
    snapshots.forEach(card => {
      const key =
        view === 'ward'
          ? card.wardName || card.ward || card.wardId
          : card.departmentName || card.department || card.departmentId;
      groups.set(key, [...(groups.get(key) || []), card]);
    });

    const result: Array<ReturnType<typeof toScorecardRow>> = [];
    groups.forEach((rows, name) => {
      const total = rows.reduce((sum, row) => sum + row.totalIssues, 0);
      const resolved = rows.reduce((sum, row) => sum + row.resolvedIssues, 0);
      const active = rows.reduce((sum, row) => sum + row.activeIssues, 0);
      const weightSum = rows.reduce((sum, row) => sum + Math.max(row.totalIssues, 1), 0);
      const weighted = (pick: (row: ScorecardSnapshotItem) => number) =>
        weightSum > 0
          ? rows.reduce((sum, row) => sum + pick(row) * Math.max(row.totalIssues, 1), 0) / weightSum
          : 0;
      result.push({
        name,
        total,
        resolved,
        active,
        sla: Math.round(weighted(row => row.slaCompliance)),
        days: weighted(row => row.medianResolutionDays).toFixed(1),
        reopen: Math.round(weighted(row => row.reopenRate)),
        weeklyMetrics: [],
      });
    });
    return result.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [apiScorecard, view]);

  const trends: WeeklyMetricPoint[] = apiScorecard?.weeklyMetrics ?? [];
  const liveTotal = Number(apiScorecard?.total ?? 0);
  const liveResolved = Number(apiScorecard?.resolved ?? 0);
  const livePastSla = Number(apiScorecard?.pastSLA ?? 0);
  const liveRate = Number(apiScorecard?.resolutionRate ?? 0);
  const periodLabel = apiScorecard?.period || 'Live snapshot';

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
      <PageHeader
        eyebrow="Public accountability"
        title="Ward & department scorecards"
        description="System-level performance signals. No individual officers are named."
      />
      {scorecardError ? (
        <Panel className="mb-6 border-4 border-[#8B4513] bg-[#8B4513]/10">
          <p className="text-xs font-bold text-[#8B4513]">{scorecardError}</p>
        </Panel>
      ) : apiScorecard ? (
        <Panel className="mb-7 border-4 bg-[#FDFBF7]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="eyebrow">Live system totals</p>
              <h2 className="display-title mt-1 text-lg">Citywide accountability snapshot</h2>
            </div>
            <span className="border-2 border-[#2A3320] bg-[#D8C9A8]/50 px-3 py-1 text-[10px] font-black uppercase tracking-wider">
              Updated {formatDateSafe(apiScorecard.timestamp)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [String(liveTotal), 'Total issues'],
              [String(liveResolved), 'Verified fixed'],
              [String(livePastSla), 'Past SLA'],
              [`${Number.isFinite(liveRate) ? liveRate.toFixed(1) : '0.0'}%`, 'Resolution rate'],
            ].map(([val, lbl]) => (
              <div key={lbl} className="border-2 border-[#2A3320] bg-[#D8C9A8]/30 p-3">
                <p className="display-title text-2xl">{val}</p>
                <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-[#2A3320]/70">{lbl}</p>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <div className="mb-6 flex gap-2">
        {(['ward', 'department'] as const).map(key => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={`min-h-[44px] border-2 border-[#2A3320] px-4 py-2.5 text-xs font-black uppercase tracking-wider sm:text-[10px] ${
              view === key ? 'bg-[#4F5B2A] text-white shadow-[4px_4px_0px_0px_#2A3320]' : 'bg-[#FDFBF7]'
            }`}
          >
            By {key}
          </button>
        ))}
      </div>
      {loading && !apiScorecard ? (
        <Panel className="mb-9 border-2 md:border-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#2A3320]/70">
            Loading live {view} scorecards...
          </p>
        </Panel>
      ) : grouped.length === 0 ? (
        <Panel className="mb-9 border-2 md:border-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#2A3320]/70">
            {scorecardError
              ? 'Live breakdown unavailable while scorecard service is unreachable.'
              : `No live ${view} scorecard records available yet.`}
          </p>
        </Panel>
      ) : (
        <div className="mb-9 grid gap-5 md:grid-cols-2">
          {grouped.map((item, index) => (
            <Panel key={item.name} className="relative border-2 md:border-4">
              <span
                className={`absolute right-5 top-5 h-3 w-3 ${index % 3 === 0 ? 'rounded-full' : index % 3 === 1 ? 'rotate-45' : ''} ${
                  ['bg-[#4F5B2A]', 'bg-[#B8892D]', 'bg-[#D8C9A8]'][index % 3]
                }`}
              />
              <div className="flex items-center gap-2 pr-6">
                {view === 'ward' ? <MapPin size={17} /> : <Building2 size={17} />}
                <h2 className="display-title text-lg sm:text-xl">{item.name}</h2>
              </div>
              <div className="mt-4 grid grid-cols-3 border-2 border-[#2A3320] bg-[#D8C9A8]/45">
                {[
                  [`${item.sla}%`, 'SLA met'],
                  [`${item.days}d`, 'Median resolve'],
                  [`${item.reopen}%`, 'Reopen rate'],
                ].map(([value, label]) => (
                  <div key={label} className="border-r-2 border-[#2A3320] px-2.5 py-3 last:border-0 sm:px-3">
                    <p className="display-title text-xl sm:text-2xl">{value}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-wider sm:text-[8px] sm:tracking-widest">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between text-xs font-bold">
                <span>{item.active} active · {item.resolved} resolved</span>
                <span className="text-[11px] text-[#2A3320]/60 sm:text-[9px]">{periodLabel}</span>
              </div>
              <div className="mt-4 h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={(item.weeklyMetrics.length > 0 ? item.weeklyMetrics : trends).slice(-6)}>
                    <Line
                      type="monotone"
                      dataKey="days"
                      stroke={index % 2 ? '#B8892D' : '#4F5B2A'}
                      strokeWidth={3}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#2A3320]/55 sm:text-[9px]">
                {item.weeklyMetrics.length > 0 ? '6-week resolution trend · Live DB series' : 'Citywide 6-week resolution trend · Live breakdown'}
              </p>
            </Panel>
          ))}
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-2">
        <Chart title="Issues filed over time" subtitle="12-week live view" type="filed" data={trends} loading={loading && !apiScorecard} />
        <Chart title="Resolution time trend" subtitle="Median resolution · days (12-week live view)" type="days" data={trends} loading={loading && !apiScorecard} />
      </div>
      <div className="mt-6">
        <Chart title="Filed vs. resolved volume" subtitle="Reports filed and resolved by week (live DB)" type="area" data={trends} loading={loading && !apiScorecard} />
      </div>
    </div>
  );
}

function Chart({
  title,
  subtitle,
  type,
  data,
  loading,
}: {
  title: string;
  subtitle: string;
  type: 'filed' | 'days' | 'area';
  data: WeeklyMetricPoint[];
  loading: boolean;
}) {
  return (
    <Panel className="chart-panel border-4">
      <div className="mb-4">
        <p className="eyebrow">Public trend</p>
        <h3 className="display-title mt-1 text-lg">{title}</h3>
        <p className="mt-1 text-[10px] text-[#2A3320]/55">{subtitle}</p>
      </div>
      {data.length === 0 ? (
        <div className="flex h-[270px] items-center justify-center border-2 border-dashed border-[#2A3320]/25 bg-[#D8C9A8]/15 px-4 text-center text-xs font-bold uppercase tracking-wider text-[#2A3320]/60">
          {loading ? 'Loading live 12-week trend...' : 'Live 12-week trend unavailable.'}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={270}>
          {type === 'area' ? (
            <AreaChart data={data}>
              <CartesianGrid stroke="#E8E0D0" strokeDasharray="4 4" />
              <XAxis dataKey="week" tick={{ fontSize: 9, fontWeight: 700 }} />
              <YAxis tick={{ fontSize: 9, fontWeight: 700 }} />
              <Tooltip {...tip} />
              <Area dataKey="filed" name="Filed" stackId="1" stroke="#4F5B2A" fill="#4F5B2A" fillOpacity={0.65} isAnimationActive={false} />
              <Area dataKey="resolved" name="Resolved" stackId="1" stroke="#B8892D" fill="#B8892D" fillOpacity={0.65} isAnimationActive={false} />
            </AreaChart>
          ) : type === 'filed' ? (
            <LineChart data={data}>
              <CartesianGrid stroke="#E8E0D0" strokeDasharray="4 4" />
              <XAxis dataKey="week" tick={{ fontSize: 9, fontWeight: 700 }} />
              <YAxis tick={{ fontSize: 9, fontWeight: 700 }} />
              <Tooltip {...tip} />
              <Line dataKey="filed" name="Filed" stroke="#4F5B2A" strokeWidth={3} dot={{ r: 3, fill: '#4F5B2A' }} isAnimationActive={false} />
              <Line dataKey="resolved" name="Resolved" stroke="#B8892D" strokeWidth={3} dot={{ r: 3, fill: '#B8892D' }} isAnimationActive={false} />
            </LineChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid stroke="#E8E0D0" strokeDasharray="4 4" />
              <XAxis dataKey="week" tick={{ fontSize: 9, fontWeight: 700 }} />
              <YAxis tick={{ fontSize: 9, fontWeight: 700 }} />
              <Tooltip {...tip} />
              <Line dataKey="days" name="Median days" stroke="#4F5B2A" strokeWidth={3} dot={{ r: 3, fill: '#4F5B2A' }} isAnimationActive={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      )}
    </Panel>
  );
}

export function SLABreachWall() {
  const [sort, setSort] = useState('Most overdue');
  const [items, setItems] = useState<ApiIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBreaches = useCallback(() => {
    setLoading(true);
    setError(null);
    transparencyApi
      .getSLABreaches()
      .then(d => {
        setItems(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch((err: any) => {
        setError(err?.message || 'Unable to load SLA breaches.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadBreaches();
  }, [loadBreaches]);

  const ordered = useMemo(() => {
    return [...items].sort((a, b) => {
      if (sort === 'Most supporters') {
        return (b.supporterCount ?? b.supporters ?? 0) - (a.supporterCount ?? a.supporters ?? 0);
      }
      if (sort === 'Newest') {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
      }
      const aOverdue = getOverdueDays(a.slaDeadline) ?? 0;
      const bOverdue = getOverdueDays(b.slaDeadline) ?? 0;
      return bOverdue - aOverdue;
    });
  }, [items, sort]);

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-10 sm:px-6 lg:px-8">
      <section className="-mx-4 mb-7 border-b-4 border-[#2A3320] bg-[#B8892D] px-5 py-8 sm:-mx-6 sm:px-8 lg:-mx-8 lg:px-10">
        <p className="text-xs font-black uppercase tracking-[.16em] sm:text-[10px] sm:tracking-[.2em]">Public accountability · Pune</p>
        <h1 className="display-title mt-2 text-3xl md:text-4xl">SLA breach wall</h1>
        <p className="mt-3 max-w-2xl text-sm">
          Issues that have exceeded their service-level deadline. No personal data. Department and ward accountability only.
        </p>
      </section>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {['Most overdue', 'Most supporters', 'Newest'].map(name => (
          <button
            key={name}
            type="button"
            onClick={() => setSort(name)}
            className={`min-h-[40px] border-2 border-[#2A3320] px-3 py-2 text-xs font-black uppercase tracking-wider sm:min-h-0 sm:text-[9px] ${
              sort === name ? 'bg-[#4F5B2A] text-white' : 'bg-[#FDFBF7]'
            }`}
          >
            {name}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex animate-pulse space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-20 rounded bg-[#D8C9A8]" />
            <div className="h-20 rounded bg-[#D8C9A8]" />
          </div>
        </div>
      ) : error ? (
        <Panel className="border-4 border-[#8B4513] bg-[#8B4513]/10 text-center">
          <h2 className="display-title text-xl text-[#8B4513]">Unable to load SLA breaches</h2>
          <p className="mt-2 text-sm text-[#2A3320]/80">{error}</p>
          <button
            type="button"
            onClick={loadBreaches}
            className="mt-4 border-2 border-[#2A3320] bg-[#FDFBF7] px-4 py-2 text-xs font-black uppercase tracking-wider"
          >
            Retry
          </button>
        </Panel>
      ) : ordered.length ? (
        <div className="grid gap-5 md:grid-cols-2">
          {ordered.map(issue => {
            const overdue = getOverdueDays(issue.slaDeadline);
            const wardLabel = formatWardLabel(issue.ward, issue.wardId);
            const departmentLabel = formatDepartmentLabel((issue as any).department, issue.departmentId);
            const supporters = issue.supporterCount ?? issue.supporters ?? 0;
            return (
              <article
                key={issue.id}
                className="min-w-0 border-2 border-l-8 border-[#2A3320] border-l-[#B8892D] bg-[#FDFBF7] p-4 shadow-[4px_4px_0px_0px_#2A3320] sm:border-4 sm:p-5 sm:shadow-[6px_6px_0px_0px_#2A3320]"
              >
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#B8892D] sm:text-[10px]">
                  <AlertTriangle size={16} />
                  {overdue !== null ? `${overdue} days overdue` : 'SLA breached'}
                </p>
                <h2 className="display-title mt-3 break-words text-lg sm:mt-4 sm:text-xl">{issue.title}</h2>
                <p className="mt-2 break-words text-xs font-bold uppercase tracking-wider text-[#2A3320]/60 sm:text-[10px]">
                  {issue.category} · {wardLabel}
                  {departmentLabel ? ` · ${departmentLabel}` : ''}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold">
                  <span>{supporters} supporters</span>
                  <span>Filed {formatDateSafe(issue.createdAt)}</span>
                  <StatusBadge status={issue.status as IssueStatus} />
                </div>
                <p className="mt-4 border-t-2 border-[#E8E0D0] pt-3 text-xs">
                  Exceeded by <b>{overdue !== null ? `${overdue} days` : 'deadline passed'}</b>
                </p>
                <Link
                  to={`/transparency/issue/${issue.publicRef || issue.id}`}
                  className="mt-3 inline-flex min-h-[40px] items-center text-xs font-black uppercase tracking-widest text-[#4F5B2A] underline sm:text-[9px]"
                >
                  View issue →
                </Link>
              </article>
            );
          })}
        </div>
      ) : (
        <Panel className="border-4 text-center">
          <CheckIcon />
          <h2 className="display-title mt-4 text-xl">No SLA breaches currently</h2>
          <p className="mt-2 text-sm text-[#2A3320]/60">All issues are within their service deadline.</p>
        </Panel>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-4 border-[#2A3320] bg-[#4F5B2A] text-white">
      <Check size={22} strokeWidth={3} />
    </span>
  );
}

export function ForgottenIssues() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadForgotten = useCallback(() => {
    setLoading(true);
    setError(null);
    transparencyApi
      .getForgottenIssues()
      .then(d => {
        setList(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch((err: any) => {
        setError(err?.message || 'Unable to load forgotten issues.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadForgotten();
  }, [loadForgotten]);

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-10 sm:px-6 lg:px-8">
      <section className="-mx-4 mb-8 border-b-4 border-[#2A3320] bg-[#4F5B2A] px-5 py-8 text-white sm:-mx-6 sm:px-8 lg:-mx-8 lg:px-10">
        <p className="text-xs font-black uppercase tracking-[.16em] text-[#D8C9A8] sm:text-[10px] sm:tracking-[.2em]">Public accountability · Pune</p>
        <h1 className="display-title mt-2 text-3xl">Forgotten issues</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/80">Issues ranked by inaction tier, age, and community support.</p>
        <p className="mt-2 text-xs font-bold uppercase tracking-wider text-[#D8C9A8] sm:text-[10px]">
          A prioritisation aid, not a legal ranking.
        </p>
      </section>
      {loading ? (
        <div className="flex animate-pulse space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-16 rounded bg-[#D8C9A8]" />
            <div className="h-16 rounded bg-[#D8C9A8]" />
          </div>
        </div>
      ) : error ? (
        <Panel className="border-4 border-[#8B4513] bg-[#8B4513]/10 text-center">
          <h2 className="display-title text-xl text-[#8B4513]">Unable to load forgotten issues</h2>
          <p className="mt-2 text-sm text-[#2A3320]/80">{error}</p>
          <button
            type="button"
            onClick={loadForgotten}
            className="mt-4 border-2 border-[#2A3320] bg-[#FDFBF7] px-4 py-2 text-xs font-black uppercase tracking-wider"
          >
            Retry
          </button>
        </Panel>
      ) : list.length === 0 ? (
        <Panel className="border-4 text-center">
          <CheckIcon />
          <h2 className="display-title mt-4 text-xl">No forgotten issues</h2>
          <p className="mt-2 text-sm text-[#2A3320]/60">No active issues are currently flagged for prolonged inaction.</p>
        </Panel>
      ) : (
        <div className="space-y-4">
          {list.map((issue, index) => {
            const tier =
              typeof issue.tier === 'number' && issue.tier >= 0 && issue.tier < TIER_COLORS.length
                ? issue.tier
                : null;
            const tierColor = tier !== null ? TIER_COLORS[tier] : '#4F5B2A';
            const wardLabel = formatWardLabel(issue.ward, issue.wardId);
            const departmentLabel = formatDepartmentLabel(issue.department, issue.departmentId);
            return (
              <article
                key={issue.id}
                className={`grid grid-cols-[52px_1fr] gap-3.5 border-2 border-[#2A3320] bg-[#FDFBF7] p-4 shadow-[4px_4px_0px_0px_#2A3320] sm:grid-cols-[76px_1fr] sm:gap-6 sm:border-4 sm:p-5 sm:shadow-[5px_5px_0px_0px_#2A3320] ${
                  tier === 4 ? 'border-[#8B0000]' : ''
                }`}
              >
                <div className="flex items-center justify-center">
                  <div
                    className="flex h-11 w-11 rotate-45 items-center justify-center border-2 border-[#2A3320] bg-[#4F5B2A] text-white sm:h-14 sm:w-14"
                    style={{ backgroundColor: tierColor }}
                  >
                    <span className="-rotate-45 display-title text-base sm:text-lg">#{index + 1}</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="eyebrow" style={{ color: tier !== null ? tierColor : undefined }}>
                      T{tier ?? 0} · {issue.inactionDays ?? 0}d
                    </span>
                    <StatusBadge status={issue.status} />
                  </div>
                  <h2 className="display-title mt-2 break-words text-lg sm:text-xl">{issue.title}</h2>
                  <p className="mt-2 break-words text-xs font-bold uppercase tracking-wider text-[#2A3320]/60 sm:text-[10px]">
                    {issue.category} · {wardLabel} · {formatDateSafe(issue.createdAt)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-[#2A3320]/70">
                    <span>{issue.supporterCount ?? issue.supporters ?? 0} supporters</span>
                    <span>{issue.assignedTo ? 'Assigned for review' : 'Never assigned'}</span>
                    <span>{departmentLabel ?? 'Unassigned department'}</span>
                  </div>
                  <Link
                    to={`/transparency/issue/${issue.publicRef || issue.id}`}
                    className="mt-2.5 inline-flex min-h-[40px] items-center text-xs font-black uppercase tracking-wider text-[#4F5B2A] underline sm:text-[9px]"
                  >
                    View issue →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PublicIssueDetail() {
  const { id } = useParams();
  const [liveIssue, setLiveIssue] = useState<ApiIssue | null>(null);
  const [liveTimeline, setLiveTimeline] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);
  const [chain, setChain] = useState<ChainVerificationResult | null>(null);
  const [chainLoading, setChainLoading] = useState(true);

  const seedMatch = useMemo(() => {
    if (!id) return null;
    return (
      seedIssues.find(item => item.id === id) ||
      loadSubmittedIssues().find(item => item.id === id) ||
      null
    );
  }, [id]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setChainLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setLiveIssue(null);
    setLiveTimeline(null);
    setIsFallback(false);
    setChain(null);
    setChainLoading(true);

    void issuesApi
      .get(id)
      .then(async issue => {
        if (!active) return;
        setLiveIssue(issue);
        if (Array.isArray(issue.events) && issue.events.length > 0) {
          setLiveTimeline(issue.events);
        } else {
          const timeline = await issuesApi.getTimeline(issue.id).catch(() => []);
          if (active) setLiveTimeline(timeline);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setIsFallback(Boolean(seedMatch));
        setLoading(false);
      });

    void auditApi
      .verifyIssue(id)
      .then(d => {
        if (active) {
          setChain(d);
          setChainLoading(false);
        }
      })
      .catch(() => {
        if (active) setChainLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, seedMatch]);

  const issue: any = liveIssue ?? (isFallback ? seedMatch : null);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
        <Panel className="animate-pulse border-4">
          <div className="h-6 w-1/3 bg-[#D8C9A8]" />
          <div className="mt-4 h-4 w-2/3 bg-[#E8E0D0]" />
        </Panel>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
        <Link
          to="/transparency"
          className="mb-5 inline-flex min-h-[40px] items-center gap-2 text-xs font-black uppercase tracking-wider text-[#4F5B2A] hover:underline sm:text-[10px]"
        >
          ← Back to public map
        </Link>
        <Panel className="border-4">
          <h1 className="display-title text-2xl">Issue not found</h1>
          <p className="mt-2 text-sm text-[#2A3320]/70">
            This issue reference could not be located in the public database.
          </p>
        </Panel>
      </div>
    );
  }

  const issueRef = issue.publicRef || issue.id;
  const wardLabel = formatWardLabel(issue.ward, issue.wardId);
  const supportersCount = issue.supporterCount ?? issue.supporters ?? 0;
  const departmentLabel = formatDepartmentLabel(issue.department, issue.departmentId) ?? 'Civic Works';
  const ageLabel = issue.age || (issue.ageInDays !== undefined ? `${issue.ageInDays}d ago` : 'Recent');
  const events = liveTimeline ?? (isFallback ? statusEvents.filter(event => event.issueId === issue.id) : []);
  const publicMedia = Array.isArray(issue.media) ? issue.media.find((m: any) => getSafePublicMediaUrl(m)) : null;
  const publicMediaUrl = getSafePublicMediaUrl(publicMedia);
  const checkedAtText =
    chain?.checkedAt && !Number.isNaN(new Date(chain.checkedAt).getTime())
      ? new Date(chain.checkedAt).toLocaleTimeString()
      : 'Recently';

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
      <div className="mb-5 border-2 border-[#2A3320] bg-[#D8C9A8]/40 p-4 sm:border-4">
        <div className="flex items-center gap-2">
          <Eye size={16} />
          <p className="text-xs font-black uppercase tracking-wider sm:text-[10px] sm:tracking-widest">
            You are viewing a public, redacted view of this issue.
          </p>
        </div>
        <p className="mt-1 text-xs text-[#2A3320]/65">
          Reporter identity and exact coordinates are not shown.{isFallback ? ' (Offline demo record)' : ''}
        </p>
      </div>
      <Link
        to="/transparency"
        className="mb-5 inline-flex min-h-[40px] items-center gap-2 text-xs font-black uppercase tracking-wider text-[#4F5B2A] hover:underline sm:text-[10px]"
      >
        ← Back to public map
      </Link>
      <div className="border-b-4 border-[#2A3320] pb-5">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className="eyebrow">{issue.category}</span>
          <StatusBadge status={issue.status} />
        </div>
        <h1 className="display-title break-words text-2xl md:text-4xl">{issue.title}</h1>
        <p className="mt-3 text-xs font-medium text-[#2A3320]/60">
          Issue {issueRef} · {ageLabel} · {wardLabel} · {supportersCount} supporters · {departmentLabel}
        </p>
      </div>
      <div className="mt-6 grid gap-7 md:grid-cols-[1.05fr_.95fr]">
        <div className="min-w-0 space-y-6">
          <section>
            <p className="eyebrow mb-3">Approximate location</p>
            <MapView issues={[issue]} selectedId={issue.id} height="260px" publicView />
          </section>
          <section>
            <p className="eyebrow mb-3">Public description</p>
            <Panel className="border-4">
              <p className="text-sm leading-relaxed">{issue.description || 'No description provided.'}</p>
              <p className="mt-3 border-t-2 border-[#E8E0D0] pt-3 text-[9px] font-black uppercase tracking-wider text-[#2A3320]/55">
                Public preview · redacted derivative
              </p>
            </Panel>
          </section>
          <Panel className="overflow-hidden border-4 !p-0">
            {publicMediaUrl ? (
              <img src={publicMediaUrl} alt={`Public preview for ${issue.title}`} className="h-44 w-full object-cover" />
            ) : (
              <div className="flex h-44 items-center justify-center bg-[#D8C9A8]/40">
                <MapPin size={42} />
              </div>
            )}
            <p className="border-t-4 border-[#2A3320] bg-[#FDFBF7] px-4 py-3 text-[9px] font-black uppercase tracking-widest">
              Public preview · personal data removed
            </p>
          </Panel>
        </div>
        <div className="space-y-6">
          <section>
            <p className="eyebrow mb-3">Public activity · names withheld</p>
            <Panel className="border-4">
              <ActivityTimeline events={events} redacted />
            </Panel>
          </section>
          <section>
            <p className="eyebrow mb-3">Audit chain verification</p>
            {chainLoading ? (
              <Panel className="animate-pulse border-4">
                <div className="h-4 w-32 rounded bg-[#D8C9A8]" />
                <div className="mt-2 h-3 w-48 rounded bg-[#D8C9A8]" />
              </Panel>
            ) : chain ? (
              <Panel className={`border-4 ${chain.chainValid ? 'border-[#4F5B2A] bg-[#4F5B2A]/10' : 'border-red-500 bg-red-50'}`}>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className={chain.chainValid ? 'text-[#4F5B2A]' : 'text-red-500'} />
                  <p className="text-sm font-black">
                    {chain.chainValid ? 'Chain intact — no tampering detected' : 'CHAIN BROKEN — possible tampering'}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="eyebrow">Events verified</p>
                    <p className="mt-1 text-lg font-black">{chain.eventCount}</p>
                  </div>
                  <div>
                    <p className="eyebrow">Latest hash</p>
                    <p className="mt-1 break-all font-mono text-[10px] text-[#2A3320]/70">
                      {chain.latestHash ? chain.latestHash.slice(0, 16) + '...' : '—'}
                    </p>
                  </div>
                </div>
                {chain.brokenAt && <p className="mt-2 text-[10px] font-bold text-red-600">Broken at event: {chain.brokenAt}</p>}
                <p className="mt-3 border-t-2 border-[#E8E0D0] pt-2 text-[9px] font-bold uppercase tracking-wider text-[#2A3320]/45">
                  Checked {checkedAtText}
                </p>
              </Panel>
            ) : (
              <Panel className="border-4">
                <p className="text-xs text-[#2A3320]/60">Chain data unavailable — issue not yet in database.</p>
              </Panel>
            )}
          </section>
          {issue.status === 'Claimed Resolved' && (
            <Panel className="border-4 border-[#B8892D] bg-[#B8892D]/10">
              <p className="display-title text-sm">Have a registered account?</p>
              <p className="mt-2 text-xs leading-relaxed text-[#2A3320]/65">
                Sign in to help verify whether this claimed fix is complete.
              </p>
              <Link to={`/citizen/issue/${issueRef}/verify`} className="mt-4 inline-flex text-[9px] font-black uppercase text-[#4F5B2A] underline">
                Login to vote →
              </Link>
            </Panel>
          )}
          <Panel className="border-4 bg-[#D8C9A8]/30">
            <p className="eyebrow">Privacy promise</p>
            <p className="mt-2 text-xs leading-relaxed">
              No reporter name, exact coordinates, or original photo metadata is available in this public view.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
