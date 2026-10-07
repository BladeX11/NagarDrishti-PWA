import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, Database, Gauge, ShieldCheck } from 'lucide-react';
import { PageHeader, Panel } from '../../components/shared/Primitives';
import { MetricCard } from '../../components/shared/MetricCard';

type Evaluation = {
  benchmark: { version: string; seed: number; cases: number; duplicatePairs: number; languages: string[]; splits: { train: number; validation: number; test: number } };
  classification: Array<{ name: string; f1: number; precision: number; recall: number; calibration: { ece: number; brier: number }; selectiveRisk: Array<{ coverage: number; risk: number }> }>;
  duplicates: Array<{ name: string; precision: number; recall: number; f1: number; pairs: number }>;
  priority: { accuracy: number; records: number };
  annotationAgreement: { annotators: number; pairwiseAgreement: number[]; majorityAgreement: number; simulated: boolean };
  fairness: { byLanguage: Array<{ group: string; records: number; accuracy: number }> };
  generatedAt: string;
};

const API = import.meta.env.VITE_API_BASE_URL ?? '/api';
const tip = { contentStyle: { backgroundColor: '#2A3320', border: 0, borderRadius: 0, color: '#fff', fontSize: 10 }, itemStyle: { color: '#fff' } };

export function EvaluationMetrics() {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch(`${API}/research/evaluation`).then(async (response) => {
      const payload = await response.json() as { success: boolean; data?: Evaluation; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error ?? 'Evaluation unavailable');
      setEvaluation(payload.data);
    }).catch((reason: Error) => setError(reason.message));
  }, []);

  if (error) return <Panel className="border-4"><p className="font-black">Evaluation unavailable</p><p className="mt-2 text-sm">{error}</p></Panel>;
  if (!evaluation) return <Panel className="border-4"><p className="font-black">Running deterministic benchmark...</p></Panel>;

  const full = evaluation.classification.find((row) => row.name === 'full')!;
  const duplicateData = evaluation.duplicates.map((row) => ({ name: row.name, f1: row.f1, precision: row.precision, recall: row.recall }));
  const classificationData = evaluation.classification.map((row) => ({ name: row.name, f1: row.f1, ece: row.calibration.ece }));
  const selectiveData = full.selectiveRisk.map((row) => ({ coverage: `${Math.round(row.coverage * 100)}%`, risk: row.risk }));

  return <div>
    <PageHeader eyebrow="Generated evaluation · reproducible benchmark" title="Experiment metrics" description="Metrics are computed from the versioned CivicTrust benchmark at request time, not copied from illustrative seed data." action={<span className="border-2 border-[#4F5B2A] bg-[#4F5B2A]/10 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[#4F5B2A]">{evaluation.benchmark.version}</span>} />
    <div className="mb-7 grid grid-cols-2 gap-4 xl:grid-cols-4"><MetricCard value={full.f1.toFixed(2)} label="Full macro-F1" icon={Gauge} accentColor="olive"/><MetricCard value={full.calibration.ece.toFixed(3)} label="Expected calibration error" icon={ShieldCheck} accentColor="gold"/><MetricCard value={`${evaluation.benchmark.cases}`} label="Benchmark cases" icon={Database} accentColor="sand"/><MetricCard value={`${evaluation.benchmark.languages.length}`} label="Languages" sublabel={`Seed ${evaluation.benchmark.seed}`} icon={Activity} accentColor="olive"/></div>
    <div className="mb-7 grid gap-6 xl:grid-cols-2"><Panel className="chart-panel border-4"><p className="eyebrow">Classification baselines</p><h2 className="display-title mt-1 text-lg">Macro-F1 and calibration</h2><ResponsiveContainer width="100%" height={280}><BarChart data={classificationData}><CartesianGrid stroke="#E8E0D0" strokeDasharray="4 4" vertical={false}/><XAxis dataKey="name" tick={{fontSize:9,fontWeight:800}}/><YAxis domain={[0,1]} tick={{fontSize:9,fontWeight:700}}/><Tooltip {...tip}/><Bar dataKey="f1" name="Macro-F1" fill="#4F5B2A"/><Bar dataKey="ece" name="ECE" fill="#B8892D"/></BarChart></ResponsiveContainer></Panel><Panel className="chart-panel border-4"><p className="eyebrow">Duplicate baselines</p><h2 className="display-title mt-1 text-lg">Pair classification quality</h2><ResponsiveContainer width="100%" height={280}><BarChart data={duplicateData}><CartesianGrid stroke="#E8E0D0" strokeDasharray="4 4" vertical={false}/><XAxis dataKey="name" tick={{fontSize:8,fontWeight:800}}/><YAxis domain={[0,1]} tick={{fontSize:9,fontWeight:700}}/><Tooltip {...tip}/><Bar dataKey="f1" name="F1" fill="#4F5B2A"/><Bar dataKey="precision" name="Precision" fill="#B8892D"/><Bar dataKey="recall" name="Recall" fill="#D8C9A8"/></BarChart></ResponsiveContainer></Panel></div>
    <div className="mb-7 grid gap-6 xl:grid-cols-[1.2fr_.8fr]"><Panel className="chart-panel border-4"><p className="eyebrow">Selective prediction</p><h2 className="display-title mt-1 text-lg">Risk versus coverage</h2><ResponsiveContainer width="100%" height={250}><LineChart data={selectiveData}><CartesianGrid stroke="#E8E0D0" strokeDasharray="4 4"/><XAxis dataKey="coverage" tick={{fontSize:9,fontWeight:800}}/><YAxis domain={[0,1]} tick={{fontSize:9,fontWeight:700}}/><Tooltip {...tip}/><Line dataKey="risk" name="Selective risk" stroke="#B8892D" strokeWidth={3} dot={{r:4,fill:'#B8892D'}}/></LineChart></ResponsiveContainer><p className="text-[9px] font-bold tracking-wider text-[#2A3320]/55">Lower risk at lower coverage demonstrates the abstention trade-off.</p></Panel><Panel className="border-4"><p className="eyebrow">Reproducibility and fairness</p><h2 className="display-title mt-1 text-lg">Fixed experiment contract</h2><div className="mt-4 space-y-3 text-xs font-bold"><p>Seed: <code>{evaluation.benchmark.seed}</code></p><p>Cases: <code>{evaluation.benchmark.cases}</code> ({evaluation.benchmark.splits.train}/{evaluation.benchmark.splits.validation}/{evaluation.benchmark.splits.test})</p><p>Duplicate pairs: <code>{evaluation.benchmark.duplicatePairs}</code></p><p>Languages: <code>{evaluation.benchmark.languages.join(', ')}</code></p><p>Priority accuracy: <code>{evaluation.priority.accuracy.toFixed(2)}</code></p><p>Agreement (simulated): <code>{evaluation.annotationAgreement.majorityAgreement.toFixed(2)}</code></p><p>Language accuracy: <code>{evaluation.fairness.byLanguage.map((row) => `${row.group} ${row.accuracy.toFixed(2)}`).join(' · ')}</code></p><p>Generated: <code>{new Date(evaluation.generatedAt).toLocaleString()}</code></p></div></Panel></div>
  </div>;
}
