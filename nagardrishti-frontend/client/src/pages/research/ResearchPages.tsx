import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
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
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Database,
  FileCheck2,
  Fingerprint,
  Gauge,
  Layers3,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import {
  duplicatePairs as seedDuplicates,
  issues as seedIssues,
  ledgerEvents as seedLedgerEvents,
  predictions as seedPredictions,
} from '../../data/seed';
import {
  auditApi,
  issuesApi,
  researchApi,
  type AdversarialFlag,
  type DuplicateCandidate,
  type GlobalChainVerificationResult,
  type ModelPrediction,
} from '../../lib/api';
import { Button } from '../../components/shared/Button';
import { MetricCard } from '../../components/shared/MetricCard';
import { PageHeader, Panel } from '../../components/shared/Primitives';
import { StatusBadge } from '../../components/shared/StatusBadge';

const API = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '') || '/api';
const palette = ['#4F5B2A', '#B8892D', '#D8C9A8', '#6B7A3A', '#2A3320'];
const tip = {
  contentStyle: {
    backgroundColor: '#2A3320',
    border: 0,
    borderRadius: 0,
    color: '#fff',
    fontSize: 10,
  },
  itemStyle: { color: '#fff' },
};

const quick = [
  {
    title: 'Models',
    desc: 'Inspect classification, routing, abstention, and proof models.',
    href: '/research/models',
    icon: Layers3,
  },
  {
    title: 'Duplicates',
    desc: 'Compare spatial and semantic match performance.',
    href: '/research/duplicates',
    icon: Target,
  },
  {
    title: 'Proof audit',
    desc: 'Review automated proof plausibility signals and flags.',
    href: '/research/proof-audit',
    icon: FileCheck2,
  },
  {
    title: 'Metrics',
    desc: 'Explore evaluation metrics and data splits.',
    href: '/research/metrics',
    icon: Activity,
  },
  {
    title: 'Audit ledger',
    desc: 'Verify event integrity and trace status changes.',
    href: '/research/audit-ledger',
    icon: Fingerprint,
  },
  {
    title: 'Dataset info',
    desc: 'Benchmark contract, splits, and fairness metrics.',
    href: '/research/metrics#dataset',
    icon: Database,
  },
];

type MetricsResponse = {
  activeExperiments: number;
  totalImpact: number;
  ai?: {
    version?: string;
    modules?: Array<{ id: string; name?: string; version?: string; status?: string }>;
  };
  counts?: {
    predictions?: number;
    abstentions?: number;
    issues?: number;
    duplicates?: number;
    adversarialFlags?: number;
    unresolvedFlags?: number;
    annotations?: number;
  };
  avgConfidence?: number;
  evaluation?: {
    benchmarkVersion?: string;
    benchmarkCases?: number;
    duplicatePairs?: number;
    fullMacroF1?: number | null;
    fullEce?: number | null;
    duplicateF1?: number | null;
    priorityAccuracy?: number;
    generatedAt?: string;
  };
};

type AIMetadata = {
  version?: string;
  modules?: Array<{ id?: string; name?: string; version?: string; status?: string }>;
  calibration?: Record<string, unknown>;
};

type ProofAuditSignals = {
  locationMatch: string;
  timePlausibility: string;
  reuseDetection: string;
  bulkClosure?: string;
  visualChange?: string;
};

type NormalizedProofAudit = {
  issueId: string;
  publicRef: string;
  title: string;
  status: string;
  proofState: string;
  confidence: number;
  modelVersion: string;
  signals: ProofAuditSignals;
  flags: AdversarialFlag[];
  verificationVotes: { fixed: number; notFixed: number; unsure: number; total: number };
  media: Array<{ id: string; type: string; publicPath?: string | null }>;
};

type NormalizedPrediction = {
  id: string;
  issueId: string;
  module: string;
  predictionText: string;
  rawPrediction: unknown;
  confidence: number;
  rawConfidence?: number;
  calibratedConfidence?: number;
  statusLabel: 'Abstained' | 'Needs review' | 'Accepted';
  abstained: boolean;
  abstentionReason?: string | null;
  modelVersion: string;
  explanation: string;
  timestamp: string;
  wasOverridden: boolean;
};

type AuditRow = {
  seq: number;
  issueId: string;
  action: string;
  actor: string;
  timestamp: string;
  reason: string;
  hash: string;
};

function formatPredictionValue(prediction: unknown): string {
  if (prediction == null) return '—';
  if (typeof prediction === 'string' || typeof prediction === 'number' || typeof prediction === 'boolean') {
    return String(prediction);
  }
  if (Array.isArray(prediction)) {
    return prediction.map((item) => formatPredictionValue(item)).join(', ') || '—';
  }
  if (typeof prediction === 'object') {
    const record = prediction as Record<string, unknown>;
    if (record.band != null && record.score != null) {
      return `${String(record.band)} (${String(record.score)})`;
    }
    if (record.state != null) return String(record.state);
    if (record.category != null) return String(record.category);
    if (record.departmentId != null) return String(record.departmentId);
    if (record.label != null) return String(record.label);
    const parts = Object.entries(record)
      .filter(([, value]) => value != null && typeof value !== 'object')
      .map(([key, value]) => `${key}: ${String(value)}`);
    if (parts.length > 0) return parts.join(' · ');
    try {
      return JSON.stringify(prediction);
    } catch {
      return '[prediction]';
    }
  }
  return String(prediction);
}

function clampConfidence(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(1, num));
}

function normalizePrediction(item: ModelPrediction, index: number): NormalizedPrediction {
  const confidence = clampConfidence(item.calibratedConfidence ?? item.confidence);
  const abstained = Boolean(item.abstained) || item.status === 'abstained';
  const statusLabel: NormalizedPrediction['statusLabel'] = abstained
    ? 'Abstained'
    : item.wasOverridden || confidence < 0.75 || item.status === 'Needs review'
    ? 'Needs review'
    : 'Accepted';

  return {
    id: item.id || `${item.issueId}-${item.module}-${index}`,
    issueId: item.issueId,
    module: item.module || 'M1',
    predictionText: formatPredictionValue(item.prediction),
    rawPrediction: item.prediction,
    confidence,
    rawConfidence: item.rawConfidence,
    calibratedConfidence: item.calibratedConfidence,
    statusLabel,
    abstained,
    abstentionReason: item.abstentionReason,
    modelVersion: item.modelVersion || 'v0.1',
    explanation:
      item.explanation ||
      item.abstentionReason ||
      'No model explanation recorded for this prediction.',
    timestamp: item.createdAt || '',
    wasOverridden: Boolean(item.wasOverridden),
  };
}

function normalizeSeedPredictions(): NormalizedPrediction[] {
  return seedPredictions.map((item, index) => ({
    id: `seed-${item.issueId}-${item.module}-${index}`,
    issueId: item.issueId,
    module: item.module,
    predictionText: item.prediction,
    rawPrediction: item.prediction,
    confidence: clampConfidence(item.confidence),
    statusLabel: item.status === 'Needs review' ? 'Needs review' : 'Accepted',
    abstained: false,
    modelVersion: item.model,
    explanation: item.explanation,
    timestamp: item.timestamp,
    wasOverridden: false,
  }));
}

function formatNullableMetric(value: unknown, digits = 2, suffix = ''): string {
  if (value == null || value === '') return '—';
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return `${num.toFixed(digits)}${suffix}`;
}

function formatTimestamp(ts?: string | null): string {
  if (!ts) return '—';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return String(ts);
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function getSafeMediaUrl(path?: string | null): string | null {
  if (!path || typeof path !== 'string') return null;
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('/') ||
    path.startsWith('data:image/')
  ) {
    return path;
  }
  return null;
}

function ConfidenceBar({ value }: { value: number }) {
  const safe = clampConfidence(value);
  return (
    <div className="flex min-w-24 items-center gap-2">
      <div className="h-2 w-16 border border-[#2A3320] bg-[#E8E0D0]">
        <div className="h-full bg-[#4F5B2A]" style={{ width: `${safe * 100}%` }} />
      </div>
      <span className="text-[10px] font-bold">{safe.toFixed(2)}</span>
    </div>
  );
}

function StatusSignalPill({ status }: { status: 'Abstained' | 'Needs review' | 'Accepted' }) {
  if (status === 'Abstained') {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-[#8B4513]">
        <ShieldAlert size={12} /> Abstained
      </span>
    );
  }
  if (status === 'Needs review') {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-[#B8892D]">
        <AlertTriangle size={12} /> Needs review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-[#4F5B2A]">
      <Check size={12} /> Accepted
    </span>
  );
}

export function ResearchOverview() {
  const [livePredictions, setLivePredictions] = useState<NormalizedPrediction[]>([]);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [aiMeta, setAiMeta] = useState<AIMetadata | null>(null);
  const [abstentionCount, setAbstentionCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setUsingFallback(false);
    const [predRes, metricsRes, aiRes, abstRes] = await Promise.allSettled([
      researchApi.getPredictions(),
      researchApi.getMetrics(),
      researchApi.getAIMetadata(),
      researchApi.getAbstentions(),
    ]);

    if (predRes.status === 'fulfilled') {
      setLivePredictions(predRes.value.map(normalizePrediction));
    } else {
      setLivePredictions(normalizeSeedPredictions());
      setUsingFallback(true);
      setError(
        predRes.reason instanceof Error
          ? predRes.reason.message
          : 'Unable to reach live prediction service.'
      );
    }

    if (metricsRes.status === 'fulfilled') {
      setMetrics(metricsRes.value as MetricsResponse);
    }
    if (aiRes.status === 'fulfilled') {
      setAiMeta(aiRes.value as AIMetadata);
    }
    if (abstRes.status === 'fulfilled') {
      setAbstentionCount(abstRes.value.length);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const latest = livePredictions.slice(0, 5);
  const totalPreds = metrics?.counts?.predictions ?? livePredictions.length;
  const computedAvgConfidence = useMemo(() => {
    if (metrics?.avgConfidence != null && Number.isFinite(metrics.avgConfidence)) {
      return metrics.avgConfidence;
    }
    if (livePredictions.length === 0) return 0;
    const sum = livePredictions.reduce((acc, item) => acc + item.confidence, 0);
    return sum / livePredictions.length;
  }, [metrics, livePredictions]);

  const activeModulesCount =
    metrics?.activeExperiments ?? aiMeta?.modules?.length ?? 6;
  const datasetVersion =
    metrics?.evaluation?.benchmarkVersion ?? aiMeta?.version ?? 'v0.3';
  const datasetSub = metrics?.evaluation?.benchmarkCases
    ? `${metrics.evaluation.benchmarkCases} cases · ${
        metrics?.counts?.abstentions ?? abstentionCount ?? 0
      } abstained`
    : usingFallback
    ? 'Offline synthetic snapshot'
    : 'CivicTrust benchmark';

  return (
    <div>
      <PageHeader
        eyebrow="CivicLens · model inspection and evaluation tools"
        title="Research dashboard"
        description="Inspect prediction quality, proof checks, duplication signals, and the integrity of CivicTrust data."
        action={
          <span className="border-2 border-[#B8892D] bg-[#B8892D]/10 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[#B8892D]">
            Research mode
          </span>
        }
      />

      {error && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-2 border-[#B8892D] bg-[#B8892D]/10 px-4 py-3 text-xs font-bold">
          <span>
            Live research telemetry unavailable ({error}). Showing cached synthetic predictions.
          </span>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1 border-2 border-[#2A3320] bg-white px-3 py-1 text-[10px] font-black uppercase"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MetricCard
          value={loading ? '...' : String(totalPreds)}
          label="Total predictions"
          icon={Sparkles}
          accentColor="olive"
        />
        <MetricCard
          value={loading ? '...' : computedAvgConfidence.toFixed(2)}
          label="Avg. confidence"
          sublabel="Across logged outputs"
          icon={Gauge}
          accentColor="gold"
        />
        <MetricCard
          value={String(activeModulesCount)}
          label="Active models"
          sublabel={aiMeta?.version ? `Orchestrator ${aiMeta.version}` : 'M1-M6'}
          icon={Layers3}
          accentColor="sand"
        />
        <MetricCard
          value={datasetVersion}
          label="Benchmark version"
          sublabel={datasetSub}
          icon={Database}
          accentColor="olive"
        />
      </div>

      <section className="mb-8">
        <div className="mb-4 border-b-4 border-[#2A3320] pb-3">
          <p className="eyebrow">Research tools</p>
          <h2 className="display-title mt-1 text-xl">Quick access</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {quick.map(({ title, desc, href, icon: Icon }, index) => (
            <Link
              key={title}
              to={href}
              className="group border-4 border-[#2A3320] bg-[#FDFBF7] p-5 shadow-[5px_5px_0px_0px_#2A3320] transition-all hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-10 w-10 items-center justify-center border-2 border-[#2A3320] ${
                    index % 3 === 0
                      ? 'bg-[#4F5B2A] text-white'
                      : index % 3 === 1
                      ? 'bg-[#B8892D] text-white'
                      : 'bg-[#D8C9A8] text-[#2A3320]'
                  }`}
                >
                  <Icon size={18} />
                </span>
                <ArrowRight
                  size={17}
                  className="transition-transform group-hover:translate-x-1"
                />
              </div>
              <h3 className="display-title mt-5 text-base">{title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#2A3320]/65">{desc}</p>
              <p className="mt-4 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[#4F5B2A]">
                Open <ArrowRight size={11} />
              </p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <section className="min-w-0">
          <div className="mb-3 border-b-4 border-[#2A3320] pb-3">
            <p className="eyebrow">Latest model activity</p>
            <h2 className="display-title mt-1 text-lg">Recent predictions</h2>
          </div>
          <div className="overflow-x-auto border-2 border-[#2A3320] bg-[#FDFBF7] md:border-4">
            <table className="data-table">
              <thead>
                <tr>
                  {['Issue', 'Module', 'Prediction', 'Confidence', 'Status'].map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {latest.map((item) => (
                  <tr key={item.id}>
                    <td className="font-black">
                      <Link
                        to={`/transparency/issue/${item.issueId}`}
                        className="hover:underline"
                      >
                        {item.issueId}
                      </Link>
                    </td>
                    <td>{item.module}</td>
                    <td className="max-w-52 truncate">{item.predictionText}</td>
                    <td>
                      <ConfidenceBar value={item.confidence} />
                    </td>
                    <td>
                      <StatusSignalPill status={item.statusLabel} />
                    </td>
                  </tr>
                ))}
                {!loading && latest.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-xs font-bold">
                      No model predictions logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <Panel className="border-4">
          <p className="eyebrow">System telemetry</p>
          <h2 className="display-title mt-1 text-lg">Evaluation services</h2>
          <div className="mt-4 space-y-4">
            {[
              [
                'Unresolved flags',
                metrics?.counts?.unresolvedFlags != null
                  ? String(metrics.counts.unresolvedFlags)
                  : '—',
                (metrics?.counts?.unresolvedFlags ?? 0) > 0,
              ],
              [
                'Abstained predictions',
                String(metrics?.counts?.abstentions ?? abstentionCount ?? 0),
                (metrics?.counts?.abstentions ?? abstentionCount ?? 0) > 0,
              ],
              [
                'Human annotations',
                metrics?.counts?.annotations != null
                  ? String(metrics.counts.annotations)
                  : '—',
                false,
              ],
              [
                'Benchmark macro-F1',
                metrics?.evaluation?.fullMacroF1 != null
                  ? metrics.evaluation.fullMacroF1.toFixed(2)
                  : '—',
                false,
              ],
            ].map(([label, value, warn]) => (
              <div
                key={String(label)}
                className="flex items-center justify-between border-b-2 border-[#E8E0D0] pb-3"
              >
                <span className="flex items-center gap-2 text-xs font-bold">
                  <i
                    className={`h-2 w-2 rounded-full ${
                      warn ? 'bg-[#B8892D]' : 'bg-[#4F5B2A]'
                    }`}
                  />
                  {label}
                </span>
                <b className="display-title text-sm">{value}</b>
              </div>
            ))}
          </div>
          <div className="mt-5 border-2 border-[#4F5B2A] bg-[#4F5B2A]/10 p-3 text-[9px] font-black uppercase tracking-wider">
            {usingFallback
              ? 'Offline synthetic fallback active'
              : `Live DB telemetry${
                  metrics?.evaluation?.generatedAt
                    ? ` · ${formatTimestamp(metrics.evaluation.generatedAt)}`
                    : ''
                }`}
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function ModelPredictions() {
  const [module, setModule] = useState('All');
  const [viewMode, setViewMode] = useState<'all' | 'abstained'>('all');
  const [min, setMin] = useState(0);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [predictionsList, setPredictionsList] = useState<NormalizedPrediction[]>([]);
  const [abstentionsList, setAbstentionsList] = useState<NormalizedPrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [preds, abstentions] = await Promise.all([
        researchApi.getPredictions(),
        researchApi.getAbstentions(),
      ]);
      setPredictionsList(preds.map(normalizePrediction));
      setAbstentionsList(abstentions.map(normalizePrediction));
    } catch (reason) {
      const errMsg =
        reason instanceof Error ? reason.message : 'Unable to load model predictions.';
      setError(errMsg);
      setPredictionsList([]);
      setAbstentionsList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sourceList = viewMode === 'abstained' ? abstentionsList : predictionsList;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sourceList.filter(
      (item) =>
        (module === 'All' || item.module === module) &&
        item.confidence >= min &&
        (!q ||
          item.issueId.toLowerCase().includes(q) ||
          item.predictionText.toLowerCase().includes(q) ||
          item.module.toLowerCase().includes(q))
    );
  }, [sourceList, module, min, query]);

  return (
    <div>
      <PageHeader
        eyebrow="Evaluation workspace"
        title="Model predictions"
        description="Inspect module outputs, confidence calibration, abstentions, and prediction explanations."
        action={
          <span className="border-2 border-[#2A3320] bg-[#D8C9A8] px-3 py-2 text-[10px] font-black uppercase tracking-wider">
            {loading ? 'Loading...' : `${rows.length} records`}
          </span>
        }
      />

      {error && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-2 border-[#8B4513] bg-[#8B4513]/10 px-4 py-3 text-xs font-bold text-[#8B4513]">
          <span>Failed to load predictions: {error}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1 border-2 border-[#2A3320] bg-white px-3 py-1 text-[10px] font-black uppercase text-[#2A3320]"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-end gap-4 border-2 border-[#2A3320] bg-[#FDFBF7] p-4">
        <div>
          <p className="eyebrow mb-2">Module</p>
          <div className="flex flex-wrap gap-1.5">
            {['All', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6'].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setModule(value)}
                className={`border-2 border-[#2A3320] px-3 py-2 text-[9px] font-black ${
                  module === value ? 'bg-[#4F5B2A] text-white' : 'bg-white'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="eyebrow mb-2">Subset</p>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`border-2 border-[#2A3320] px-3 py-2 text-[9px] font-black uppercase ${
                viewMode === 'all' ? 'bg-[#4F5B2A] text-white' : 'bg-white'
              }`}
            >
              All ({predictionsList.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('abstained')}
              className={`border-2 border-[#2A3320] px-3 py-2 text-[9px] font-black uppercase ${
                viewMode === 'abstained' ? 'bg-[#B8892D] text-white' : 'bg-white'
              }`}
            >
              Abstentions ({abstentionsList.length})
            </button>
          </div>
        </div>
        <div className="min-w-40 flex-1">
          <label className="eyebrow flex justify-between">
            Minimum confidence <span>{min.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={min}
            onChange={(event) => setMin(Number(event.target.value))}
            className="mt-2 w-full accent-[#4F5B2A]"
          />
        </div>
        <label className="flex items-center gap-2 border-2 border-[#2A3320] bg-white px-3 py-2">
          <Search size={14} />
          <input
            aria-label="Filter predictions"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Issue ID or label"
            className="w-32 text-xs outline-none"
          />
        </label>
      </div>

      <div className="overflow-x-auto border-4 border-[#2A3320] bg-[#FDFBF7]">
        <table className="data-table">
          <thead>
            <tr>
              {[
                'Issue',
                'Module',
                'Prediction',
                'Confidence',
                'Status',
                'Model',
                'Timestamp',
                '',
              ].map((value) => (
                <th key={value || 'expand'}>{value}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <FragmentRow
                key={item.id}
                item={item}
                expanded={expanded === item.id}
                onClick={() => setExpanded(expanded === item.id ? null : item.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
      {!loading && rows.length === 0 && (
        <p className="border-x-4 border-b-4 border-[#2A3320] bg-[#FDFBF7] p-6 text-center text-sm">
          {error
            ? 'Unable to load predictions.'
            : 'No predictions match the current filters.'}
        </p>
      )}
    </div>
  );
}

function FragmentRow({
  item,
  expanded,
  onClick,
}: {
  item: NormalizedPrediction;
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <>
      <tr onClick={onClick} className="cursor-pointer">
        <td className="font-black">{item.issueId}</td>
        <td>{item.module}</td>
        <td className="max-w-52 truncate">{item.predictionText}</td>
        <td>
          <ConfidenceBar value={item.confidence} />
        </td>
        <td>
          <StatusSignalPill status={item.statusLabel} />
        </td>
        <td>{item.modelVersion}</td>
        <td>{formatTimestamp(item.timestamp)}</td>
        <td>
          <ChevronDown size={15} className={expanded ? 'rotate-180' : ''} />
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className="bg-[#D8C9A8]/20">
            <p className="eyebrow">Model explanation</p>
            <p className="mt-1 text-xs leading-relaxed">{item.explanation}</p>
            {item.abstentionReason && (
              <p className="mt-1 text-xs font-bold text-[#8B4513]">
                Abstention reason: {item.abstentionReason}
              </p>
            )}
            <p className="mt-2 font-mono text-[9px] text-[#2A3320]/55">
              {JSON.stringify({
                module: item.module,
                prediction: item.rawPrediction,
                confidence: item.confidence,
                rawConfidence: item.rawConfidence,
                calibratedConfidence: item.calibratedConfidence,
                model: item.modelVersion,
              })}
            </p>
            <Link
              to={`/transparency/issue/${item.issueId}`}
              className="mt-2 inline-flex items-center gap-1 text-[9px] font-black uppercase text-[#4F5B2A] underline"
            >
              Input reference · {item.issueId} <ArrowUpRight size={11} />
            </Link>
          </td>
        </tr>
      )}
    </>
  );
}

export function DuplicateAnalysis() {
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [baselines, setBaselines] = useState([
    { metric: 'Precision', distance: 0.72, text: 0.77, combined: 0.88 },
    { metric: 'Recall', distance: 0.68, text: 0.74, combined: 0.83 },
    { metric: 'F1', distance: 0.7, text: 0.75, combined: 0.85 },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const headers: Record<string, string> = {};
      if (import.meta.env.DEV) {
        try {
          headers['x-demo-role'] = localStorage.getItem('nd-role') || 'researcher';
        } catch {
          headers['x-demo-role'] = 'researcher';
        }
      }
      const [dupRes, evalRes] = await Promise.allSettled([
        researchApi.getDuplicates(),
        fetch(`${API}/research/evaluation`, {
          credentials: 'include',
          headers,
        }).then((r) => (r.ok ? r.json() : null)),
      ]);

      if (dupRes.status === 'fulfilled') {
        setDuplicates(dupRes.value);
      } else {
        throw dupRes.reason;
      }

      if (evalRes.status === 'fulfilled' && evalRes.value?.data?.duplicates) {
        const rows = evalRes.value.data.duplicates as Array<{
          name: string;
          precision: number;
          recall: number;
          f1: number;
        }>;
        const dist = rows.find((r) => r.name.includes('spatial') || r.name.includes('distance'));
        const text = rows.find((r) => r.name.includes('text'));
        const full = rows.find((r) => r.name === 'full') ?? rows[0];
        if (dist && text && full) {
          setBaselines([
            {
              metric: 'Precision',
              distance: dist.precision,
              text: text.precision,
              combined: full.precision,
            },
            {
              metric: 'Recall',
              distance: dist.recall,
              text: text.recall,
              combined: full.recall,
            },
            {
              metric: 'F1',
              distance: dist.f1,
              text: text.f1,
              combined: full.f1,
            },
          ]);
        }
      }
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Unable to load duplicate candidates.'
      );
      setDuplicates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredDuplicates = useMemo(() => {
    if (statusFilter === 'All') return duplicates;
    return duplicates.filter(
      (item) => (item.status || '').toLowerCase() === statusFilter.toLowerCase()
    );
  }, [duplicates, statusFilter]);

  const outcome = useMemo(() => {
    const counts = { Confirmed: 0, Rejected: 0, Pending: 0 };
    for (const pair of duplicates) {
      const normalized = (pair.status || 'pending').toLowerCase();
      if (normalized === 'confirmed') counts.Confirmed += 1;
      else if (normalized === 'rejected') counts.Rejected += 1;
      else counts.Pending += 1;
    }
    return [
      { name: 'Confirmed', value: counts.Confirmed },
      { name: 'Rejected', value: counts.Rejected },
      { name: 'Pending', value: counts.Pending },
    ];
  }, [duplicates]);

  const totalOutcomeCount = outcome.reduce((sum, item) => sum + item.value, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Evaluation workspace · M3"
        title="Duplicate detection analysis"
        description="Compare candidate pairs and review the combined spatial and semantic model against baselines."
      />

      {error && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-2 border-[#8B4513] bg-[#8B4513]/10 px-4 py-3 text-xs font-bold text-[#8B4513]">
          <span>Failed to load duplicate candidates: {error}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1 border-2 border-[#2A3320] bg-white px-3 py-1 text-[10px] font-black uppercase text-[#2A3320]"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {['All', 'pending', 'confirmed', 'rejected'].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatusFilter(value)}
            className={`border-2 border-[#2A3320] px-3 py-1.5 text-[9px] font-black uppercase ${
              statusFilter === value ? 'bg-[#4F5B2A] text-white' : 'bg-[#FDFBF7]'
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="mb-7 overflow-x-auto border-4 border-[#2A3320] bg-[#FDFBF7]">
        <table className="data-table">
          <thead>
            <tr>
              {[
                'Issue A',
                'Issue B',
                'Spatial distance',
                'Text similarity',
                'Category match',
                'Overall score',
                'Outcome',
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredDuplicates.map((pair) => {
              const statusText = (pair.status || 'pending').toLowerCase();
              return (
                <tr key={pair.id || `${pair.issueAId}-${pair.issueBId}`}>
                  <td className="font-black">
                    <Link
                      to={`/transparency/issue/${pair.issueAId}`}
                      className="hover:underline"
                    >
                      {pair.issueAId}
                    </Link>
                  </td>
                  <td className="font-black">
                    <Link
                      to={`/transparency/issue/${pair.issueBId}`}
                      className="hover:underline"
                    >
                      {pair.issueBId}
                    </Link>
                  </td>
                  <td>{formatNullableMetric(pair.spatialDistance, 0, 'm')}</td>
                  <td>{formatNullableMetric(pair.textSimilarity, 2)}</td>
                  <td>
                    {pair.categoryMatch === true ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#4F5B2A]">
                        <Check size={12} /> match
                      </span>
                    ) : pair.categoryMatch === false ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#8B4513]">
                        <X size={12} /> mismatch
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="font-black">{formatNullableMetric(pair.overallScore, 2)}</td>
                  <td>
                    <span
                      className={`text-[9px] font-black uppercase ${
                        statusText === 'confirmed'
                          ? 'text-[#4F5B2A]'
                          : statusText === 'pending'
                          ? 'text-[#B8892D]'
                          : 'text-[#8B4513]'
                      }`}
                    >
                      {pair.status || 'pending'}
                    </span>
                  </td>
                </tr>
              );
            })}
            {!loading && filteredDuplicates.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-xs font-bold">
                  {error
                    ? 'Unable to load duplicate pairs.'
                    : 'No duplicate candidate pairs found for this filter.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_.7fr]">
        <Panel className="chart-panel border-4">
          <p className="eyebrow">Baseline comparison</p>
          <h2 className="display-title mt-1 text-lg">Pair classification quality</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={baselines} margin={{ top: 20, right: 15, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#E8E0D0" strokeDasharray="4 4" vertical={false} />
              <XAxis dataKey="metric" tick={{ fontSize: 10, fontWeight: 800 }} />
              <YAxis domain={[0, 1]} tick={{ fontSize: 9, fontWeight: 700 }} />
              <Tooltip {...tip} />
              <Bar
                dataKey="distance"
                name="Distance-only"
                fill="#D8C9A8"
                radius={0}
                isAnimationActive={false}
              />
              <Bar
                dataKey="text"
                name="Text-only"
                fill="#B8892D"
                radius={0}
                isAnimationActive={false}
              />
              <Bar
                dataKey="combined"
                name="Combined model"
                fill="#4F5B2A"
                radius={0}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-4 text-[9px] font-black uppercase">
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block h-2.5 w-2.5 border border-[#2A3320] bg-[#D8C9A8]" />
              Distance-only
            </span>
            <span className="inline-flex items-center gap-1.5 text-[#B8892D]">
              <i className="inline-block h-2.5 w-2.5 border border-[#2A3320] bg-[#B8892D]" />
              Text-only
            </span>
            <span className="inline-flex items-center gap-1.5 text-[#4F5B2A]">
              <i className="inline-block h-2.5 w-2.5 border border-[#2A3320] bg-[#4F5B2A]" />
              Combined
            </span>
          </div>
        </Panel>

        <Panel className="chart-panel border-4">
          <p className="eyebrow">Human review</p>
          <h2 className="display-title mt-1 text-lg">Review outcomes</h2>
          {totalOutcomeCount > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={outcome}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={78}
                  label
                  stroke="#2A3320"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {outcome.map((_, index) => (
                    <Cell key={index} fill={palette[index + 1]} />
                  ))}
                </Pie>
                <Tooltip {...tip} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[230px] items-center justify-center text-xs font-bold text-[#2A3320]/60">
              {loading ? 'Loading review outcomes...' : 'No review outcomes recorded yet.'}
            </div>
          )}
          <div className="space-y-2">
            {outcome.map((item, index) => (
              <p
                key={item.name}
                className="flex justify-between text-[9px] font-black uppercase"
              >
                <span>
                  <i
                    className="mr-2 inline-block h-2.5 w-2.5 border border-[#2A3320]"
                    style={{ backgroundColor: palette[index + 1] }}
                  />
                  {item.name}
                </span>
                {item.value}
              </p>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function normalizeProofAuditItem(raw: Record<string, unknown>, index: number): NormalizedProofAudit {
  const issueId = String(raw.issueId ?? raw.id ?? `proof-${index + 1}`);
  const publicRef = String(raw.publicRef ?? issueId);
  const rawSignals = (raw.signals ?? {}) as Record<string, unknown>;
  const rawVotes = (raw.verificationVotes ?? {}) as Record<string, unknown>;
  const rawFlags = Array.isArray(raw.flags) ? (raw.flags as AdversarialFlag[]) : [];
  const rawMedia = Array.isArray(raw.media)
    ? (raw.media as Array<{ id?: string; type?: string; publicPath?: string | null }>)
    : [];

  return {
    issueId,
    publicRef,
    title: String(raw.title ?? `Issue ${publicRef}`),
    status: String(raw.status ?? 'Claimed Resolved'),
    proofState: String(raw.proofState ?? 'pending'),
    confidence: clampConfidence(raw.confidence ?? 0.8),
    modelVersion: String(raw.modelVersion ?? 'M5'),
    signals: {
      locationMatch: String(rawSignals.locationMatch ?? 'PASS'),
      timePlausibility: String(rawSignals.timePlausibility ?? 'PASS'),
      reuseDetection: String(rawSignals.reuseDetection ?? 'PASS'),
      bulkClosure: rawSignals.bulkClosure != null ? String(rawSignals.bulkClosure) : undefined,
      visualChange:
        rawSignals.visualChange != null ? String(rawSignals.visualChange) : undefined,
    },
    flags: rawFlags,
    verificationVotes: {
      fixed: Number(rawVotes.fixed ?? 0),
      notFixed: Number(rawVotes.notFixed ?? 0),
      unsure: Number(rawVotes.unsure ?? 0),
      total: Number(rawVotes.total ?? 0),
    },
    media: rawMedia.map((m, idx) => ({
      id: String(m.id ?? `${issueId}-m-${idx}`),
      type: String(m.type ?? 'after'),
      publicPath: m.publicPath ?? null,
    })),
  };
}

export function ProofAudit() {
  const [items, setItems] = useState<NormalizedProofAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await researchApi.getProofAudit();
      setItems((Array.isArray(data) ? data : []).map(normalizeProofAuditItem));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Unable to load proof audit queue.'
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader
        eyebrow="Evaluation workspace · M5"
        title="Proof-of-fix audit"
        description="Inspect proof submissions, adversarial plausibility rules, and citizen verification votes."
      />

      {error && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-2 border-[#8B4513] bg-[#8B4513]/10 px-4 py-3 text-xs font-bold text-[#8B4513]">
          <span>Failed to load proof audit queue: {error}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1 border-2 border-[#2A3320] bg-white px-3 py-1 text-[10px] font-black uppercase text-[#2A3320]"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {loading ? (
        <Panel className="border-4">
          <p className="text-xs font-bold uppercase tracking-wider">
            Loading proof audit records...
          </p>
        </Panel>
      ) : items.length === 0 ? (
        <Panel className="border-4">
          <p className="font-black">No proof submissions or adversarial flags recorded yet.</p>
          <p className="mt-1 text-xs text-[#2A3320]/65">
            Once officers submit resolution proof or trigger adversarial checks, records will appear here.
          </p>
        </Panel>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {items.map((item, index) => {
            const signalEntries: Array<[string, string]> = [
              ['Location match', item.signals.locationMatch],
              ['Time plausibility', item.signals.timePlausibility],
              ['Reuse detection', item.signals.reuseDetection],
              ...(item.signals.bulkClosure
                ? [['Bulk closure check', item.signals.bulkClosure] as [string, string]]
                : []),
              ...(item.signals.visualChange
                ? [['Visual change', item.signals.visualChange] as [string, string]]
                : []),
            ];
            const hasWarning = signalEntries.some(([, value]) => value !== 'PASS');
            const safeMedia = item.media
              .map((m) => ({ ...m, url: getSafeMediaUrl(m.publicPath) }))
              .filter((m): m is { id: string; type: string; publicPath: string | null; url: string } =>
                Boolean(m.url)
              );

            return (
              <Panel key={item.issueId} className="border-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">
                      Issue {item.publicRef} · Proof #{index + 1} · {item.proofState}
                    </p>
                    <h2 className="display-title mt-2 text-lg">{item.title}</h2>
                  </div>
                  <StatusBadge status={item.status} />
                </div>

                <div
                  className={`mt-4 border-2 p-4 ${
                    hasWarning
                      ? 'border-[#B8892D] bg-[#B8892D]/10'
                      : 'border-[#4F5B2A] bg-[#4F5B2A]/10'
                  }`}
                >
                  <p className="eyebrow">
                    M5 result · {hasWarning ? 'Needs review' : 'Plausible'}
                  </p>
                  {signalEntries.map(([label, value]) => {
                    const ok = value === 'PASS';
                    return (
                      <div
                        key={label}
                        className="flex justify-between border-b border-[#E8E0D0] py-2 last:border-0"
                      >
                        <span className="text-xs font-bold">{label}</span>
                        <span
                          className={`inline-flex items-center gap-1 text-[9px] font-black uppercase ${
                            ok ? 'text-[#4F5B2A]' : 'text-[#B8892D]'
                          }`}
                        >
                          {ok ? <Check size={12} /> : <AlertTriangle size={12} />} {value}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {safeMedia.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {safeMedia.slice(0, 3).map((m) => (
                      <img
                        key={m.id}
                        src={m.url}
                        alt={`Proof ${m.type} for ${item.publicRef}`}
                        className="h-16 w-24 border-2 border-[#2A3320] object-cover"
                      />
                    ))}
                  </div>
                )}

                {item.flags.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-2 border-[#B8892D] bg-[#FDFBF7] p-3 text-xs">
                    <p className="text-[9px] font-black uppercase tracking-wider text-[#8B4513]">
                      Flagged rules ({item.flags.length})
                    </p>
                    {item.flags.map((flag) => (
                      <p key={flag.id} className="font-medium text-[#2A3320]/80">
                        <b className="uppercase">{flag.rule}</b> ({flag.severity})
                      </p>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap justify-between gap-2 text-[9px] font-black uppercase tracking-wider">
                  <span>Confidence: {item.confidence.toFixed(2)}</span>
                  <span>Model: {item.modelVersion}</span>
                  <span>
                    Votes: {item.verificationVotes.fixed} fixed ·{' '}
                    {item.verificationVotes.notFixed} not fixed
                  </span>
                </div>
                <Link
                  to={`/transparency/issue/${item.publicRef}`}
                  className="mt-4 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-[#4F5B2A] underline"
                >
                  View public issue & proof <ArrowRight size={11} />
                </Link>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AuditLedger() {
  const [query, setQuery] = useState('');
  const [actor, setActor] = useState('All');
  const [actionType, setActionType] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [verification, setVerification] = useState<GlobalChainVerificationResult | null>(
    null
  );
  const [checking, setChecking] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [usingFallbackEvents, setUsingFallbackEvents] = useState(false);

  const runIntegrityCheck = useCallback(async (showToast = false) => {
    setChecking(true);
    setVerifyError('');
    try {
      const result = await auditApi.verifyGlobal();
      const valid = Boolean(result.valid ?? result.chainValid);
      const totalEvents = result.totalEvents ?? result.eventCount ?? 0;
      const normalized: GlobalChainVerificationResult = {
        ...result,
        valid,
        totalEvents,
      };
      setVerification(normalized);
      if (showToast) {
        if (valid) {
          toast.success(
            `Hash-chain integrity verified (${totalEvents} event${
              totalEvents === 1 ? '' : 's'
            }).`
          );
        } else {
          toast.error(
            `Broken link detected${result.brokenAt ? ` at ${result.brokenAt}` : ''}.`
          );
        }
      }
    } catch (reason) {
      const errMsg =
        reason instanceof Error ? reason.message : 'Unable to verify hash chain.';
      setVerifyError(errMsg);
      if (showToast) toast.error(errMsg);
    } finally {
      setChecking(false);
    }
  }, []);

  const loadLedgerRows = useCallback(async () => {
    setEventsLoading(true);
    setUsingFallbackEvents(false);
    try {
      const issueRes = await issuesApi.list({ limit: 15 });
      const issueItems = Array.isArray(issueRes) ? issueRes : issueRes.items ?? [];
      const timelineResults = await Promise.allSettled(
        issueItems.map(async (issue) => ({
          ref: issue.publicRef || issue.id,
          events: await issuesApi.getTimeline(issue.id),
        }))
      );
      const combined: AuditRow[] = [];
      for (const res of timelineResults) {
        if (res.status !== 'fulfilled') continue;
        for (const ev of res.value.events) {
          const from = ev.fromStatus ? ev.fromStatus : '—';
          combined.push({
            seq: 0,
            issueId: res.value.ref,
            action: `${from} -> ${ev.toStatus}`,
            actor: ev.actorRole
              ? ev.actorRole.charAt(0).toUpperCase() + ev.actorRole.slice(1)
              : 'System',
            timestamp: ev.createdAt,
            reason: ev.reason || 'Status event recorded',
            hash: ev.eventHash || '',
          });
        }
      }
      combined.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setRows(
        combined.map((item, idx) => ({
          ...item,
          seq: combined.length - idx,
        }))
      );
    } catch {
      setRows(
        seedLedgerEvents.map((ev) => ({
          seq: ev.seq,
          issueId: ev.issueId,
          action: ev.action,
          actor: ev.actor,
          timestamp: ev.timestamp,
          reason: ev.reason,
          hash: ev.hash,
        }))
      );
      setUsingFallbackEvents(true);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    void runIntegrityCheck(false);
    void loadLedgerRows();
  }, [runIntegrityCheck, loadLedgerRows]);

  const data = useMemo(
    () =>
      rows.filter((event) => {
        const day = event.timestamp.slice(0, 10);
        const isReported =
          event.action.startsWith('—') || event.action.endsWith('-> Reported');
        const typeMatches =
          actionType === 'All' ||
          (actionType === 'Reported' && isReported) ||
          (actionType === 'Reopened' && event.action.includes('Reopened')) ||
          (actionType === 'Resolved' &&
            /(Claimed Resolved|Verified Fixed)/.test(event.action)) ||
          (actionType === 'Status change' && !isReported);
        const actorMatches =
          actor === 'All' || event.actor.toLowerCase() === actor.toLowerCase();
        return (
          actorMatches &&
          typeMatches &&
          (!fromDate || day >= fromDate) &&
          (!toDate || day <= toDate) &&
          `${event.issueId} ${event.action} ${event.reason}`
            .toLowerCase()
            .includes(query.toLowerCase())
        );
      }),
    [rows, actor, actionType, fromDate, toDate, query]
  );

  const isChainValid = verification?.valid === true;
  const isChainBroken = verification != null && verification.valid === false;

  return (
    <div>
      <PageHeader
        eyebrow="Append-only integrity records"
        title="Audit ledger"
        description="Trace status changes through the cryptographic SHA-256 hash-chained event log."
        action={
          <span
            className={`border-2 px-3 py-2 text-[9px] font-black uppercase tracking-wider ${
              isChainBroken
                ? 'border-[#8B4513] bg-[#8B4513]/10 text-[#8B4513]'
                : isChainValid
                ? 'border-[#4F5B2A] bg-[#4F5B2A]/10 text-[#4F5B2A]'
                : 'border-[#B8892D] bg-[#B8892D]/10 text-[#B8892D]'
            }`}
          >
            {checking
              ? 'Verifying chain...'
              : isChainValid
              ? 'Chain integrity · verified'
              : isChainBroken
              ? 'Chain integrity · broken'
              : 'Chain integrity · unverified'}
          </span>
        }
      />

      <Panel
        className={`mb-6 border-4 ${
          isChainBroken
            ? 'border-[#8B4513] bg-[#8B4513]/10'
            : isChainValid
            ? 'border-[#4F5B2A] bg-[#4F5B2A]/10'
            : 'border-[#B8892D] bg-[#B8892D]/10'
        }`}
      >
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              {isChainBroken ? (
                <ShieldAlert size={20} className="text-[#8B4513]" />
              ) : (
                <ShieldCheck size={20} />
              )}
              <h2 className="display-title text-lg">
                {checking
                  ? 'Verifying hash chain...'
                  : isChainValid
                  ? 'Chain integrity: verified'
                  : isChainBroken
                  ? 'Chain integrity: broken link detected'
                  : 'Chain integrity: not yet verified'}
              </h2>
            </div>
            <p className="mt-2 text-xs font-bold">
              {verification
                ? `Last check: ${formatTimestamp(verification.checkedAt)} · ${
                    verification.totalEvents
                  } total events in global chain`
                : 'Click Run integrity check to verify the live database hash chain.'}
              {usingFallbackEvents ? ' · Displaying offline fallback rows' : ''}
            </p>
            {isChainValid && (
              <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-[#4F5B2A]">
                Integrity check passed · no broken links detected
              </p>
            )}
            {isChainBroken && (
              <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-[#8B4513]">
                Integrity failure{verification?.brokenAt ? ` at event ${verification.brokenAt}` : ''}
              </p>
            )}
            {verifyError && (
              <p className="mt-2 text-xs font-bold text-[#8B4513]">
                Verification request failed: {verifyError}
              </p>
            )}
          </div>
          <Button
            disabled={checking}
            onClick={() => void runIntegrityCheck(true)}
          >
            {checking ? 'Checking...' : 'Run integrity check'}
          </Button>
        </div>
      </Panel>

      <div className="mb-4 flex flex-wrap gap-3">
        <label className="flex items-center gap-2 border-2 border-[#2A3320] bg-[#FDFBF7] px-3 py-2">
          <Search size={14} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter issue, action, reason"
            className="w-52 bg-transparent text-xs outline-none"
          />
        </label>
        <select
          aria-label="Filter by actor"
          value={actor}
          onChange={(event) => setActor(event.target.value)}
          className="border-2 border-[#2A3320] bg-[#FDFBF7] px-3 py-2 text-[9px] font-black uppercase"
        >
          <option value="All">All actors</option>
          <option value="Officer">Officer</option>
          <option value="Citizen">Citizen</option>
          <option value="Admin">Admin</option>
          <option value="System">System</option>
        </select>
        <select
          aria-label="Filter by action type"
          value={actionType}
          onChange={(event) => setActionType(event.target.value)}
          className="border-2 border-[#2A3320] bg-[#FDFBF7] px-3 py-2 text-[9px] font-black uppercase"
        >
          <option>All</option>
          <option>Reported</option>
          <option>Status change</option>
          <option>Resolved</option>
          <option>Reopened</option>
        </select>
        <label className="flex items-center gap-2 text-[8px] font-black uppercase">
          From
          <input
            aria-label="From date"
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="border-2 border-[#2A3320] bg-[#FDFBF7] px-3 py-2 text-[9px]"
          />
        </label>
        <label className="flex items-center gap-2 text-[8px] font-black uppercase">
          To
          <input
            aria-label="To date"
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className="border-2 border-[#2A3320] bg-[#FDFBF7] px-3 py-2 text-[9px]"
          />
        </label>
      </div>

      <div className="overflow-x-auto border-4 border-[#2A3320] bg-[#FDFBF7]">
        <table className="data-table">
          <thead>
            <tr>
              {['Seq', 'Issue', 'Action', 'Actor', 'Timestamp', 'Reason', 'Hash'].map(
                (item) => (
                  <th key={item}>{item}</th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((event) => (
              <tr key={`${event.seq}-${event.hash || event.timestamp}`}>
                <td className="font-black">{event.seq}</td>
                <td className="font-black">
                  <Link
                    to={`/transparency/issue/${event.issueId}`}
                    className="hover:underline"
                  >
                    {event.issueId}
                  </Link>
                </td>
                <td>{event.action}</td>
                <td>{event.actor}</td>
                <td>{formatTimestamp(event.timestamp)}</td>
                <td className="max-w-56 truncate">{event.reason}</td>
                <td title={event.hash} className="font-mono text-[9px]">
                  {event.hash ? `${event.hash.slice(0, 12)}...` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!eventsLoading && data.length === 0 && (
        <p className="border-x-4 border-b-4 border-[#2A3320] bg-[#FDFBF7] p-6 text-center text-sm">
          No audit events match the current filters.
        </p>
      )}
    </div>
  );
}
