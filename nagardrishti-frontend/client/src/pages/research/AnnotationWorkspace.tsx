import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Download, Users } from 'lucide-react';
import { categories } from '../../types';
import { Button } from '../../components/shared/Button';
import { PageHeader, Panel } from '../../components/shared/Primitives';

type Task = { id: string; language: string; text: string; category: string; priority: number; ward: string; annotation: { category: string; priority: number; rationale?: string | null } | null };
type Stats = { targetRecords: number; totalAnnotations: number; byAnnotator: Array<{ annotatorId: string; completed: number }>; completeRecords: number; majorityAgreement: number | null };
const API = import.meta.env.VITE_API_BASE_URL ?? '/api';
const auth = { 'x-demo-role': 'researcher' };

export function AnnotationWorkspace() {
  const [annotator, setAnnotator] = useState('annotator-a');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [index, setIndex] = useState(0);
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState(2);
  const [rationale, setRationale] = useState('');
  const [message, setMessage] = useState('');
  const task = tasks[index];

  const load = () => {
    Promise.all([
      fetch(`${API}/research/annotation/tasks?annotatorId=${annotator}`, { headers: auth }).then((response) => response.json()),
      fetch(`${API}/research/annotation/stats`, { headers: auth }).then((response) => response.json()),
    ]).then(([taskPayload, statsPayload]) => {
      const nextTasks = taskPayload.data as Task[];
      setTasks(nextTasks);
      setStats(statsPayload.data as Stats);
      const firstUnlabeled = nextTasks.findIndex((item) => !item.annotation);
      setIndex(firstUnlabeled >= 0 ? firstUnlabeled : 0);
    }).catch(() => setMessage('Annotation database is unavailable. Run the migration and restart the API.'));
  };

  useEffect(() => { load(); }, [annotator]);
  useEffect(() => {
    if (!task) return;
    setCategory(task.annotation?.category ?? '');
    setPriority(task.annotation?.priority ?? 2);
    setRationale(task.annotation?.rationale ?? '');
  }, [task]);

  const completed = useMemo(() => tasks.filter((item) => item.annotation).length, [tasks]);
  const save = async () => {
    if (!task || !category) return setMessage('Choose a category before saving.');
    const response = await fetch(`${API}/research/annotation`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ recordId: task.id, annotatorId: annotator, category, priority, rationale }) });
    const payload = await response.json() as { success: boolean; error?: string };
    if (!response.ok || !payload.success) return setMessage(payload.error ?? 'Unable to save annotation.');
    setMessage('Annotation saved.');
    load();
    setIndex((value) => Math.min(value + 1, tasks.length - 1));
  };

  return <div><PageHeader eyebrow="Human annotation workspace" title="Label CivicTrust records" description="Annotate independently before viewing model outputs. Use a separate annotator identity for each human labeler." action={<a className="inline-flex items-center gap-2 border-2 border-[#2A3320] bg-[#FDFBF7] px-3 py-2 text-[9px] font-black uppercase" href={`${API}/research/annotation/export`}><Download size={13}/> Export CSV</a>} />
    <div className="mb-6 grid gap-4 md:grid-cols-4"><Panel className="border-4"><p className="eyebrow">Annotator</p><select value={annotator} onChange={(event) => setAnnotator(event.target.value)} className="mt-2 w-full border-2 border-[#2A3320] bg-white p-2 text-xs font-bold"><option value="annotator-a">Annotator A</option><option value="annotator-b">Annotator B</option><option value="annotator-c">Annotator C</option></select></Panel><Panel className="border-4"><p className="eyebrow">Progress</p><p className="display-title mt-2 text-2xl">{completed} / {tasks.length || 120}</p></Panel><Panel className="border-4"><p className="eyebrow">Complete records</p><p className="display-title mt-2 text-2xl">{stats?.completeRecords ?? 0}</p></Panel><Panel className="border-4"><p className="eyebrow">Agreement</p><p className="display-title mt-2 text-2xl">{stats?.majorityAgreement == null ? '—' : `${Math.round(stats.majorityAgreement * 100)}%`}</p></Panel></div>
    <div className="grid gap-6 lg:grid-cols-[1fr_.35fr]">{task ? <Panel className="border-4"><div className="flex items-center justify-between border-b-2 border-[#E8E0D0] pb-4"><div><p className="eyebrow">Record {index + 1} of {tasks.length}</p><p className="mt-1 text-[10px] font-black uppercase tracking-widest">{task.id} · {task.language} · {task.ward}</p></div><span className="border-2 border-[#B8892D] bg-[#B8892D]/10 px-2 py-1 text-[9px] font-black uppercase">Blind label</span></div><div className="my-8 border-4 border-[#2A3320] bg-[#FDFBF7] p-6"><p className="eyebrow">Issue narrative</p><p className="mt-3 text-lg font-bold leading-relaxed">{task.text}</p></div><div className="grid gap-4 md:grid-cols-2"><label className="text-[10px] font-black uppercase tracking-wider">Category<select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 block w-full border-2 border-[#2A3320] bg-white p-3 text-sm font-bold"><option value="">Choose category</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="text-[10px] font-black uppercase tracking-wider">Priority<select value={priority} onChange={(event) => setPriority(Number(event.target.value))} className="mt-2 block w-full border-2 border-[#2A3320] bg-white p-3 text-sm font-bold">{[1,2,3,4].map((item) => <option key={item} value={item}>{item} · {item === 4 ? 'urgent' : item === 1 ? 'routine' : 'normal'}</option>)}</select></label></div><label className="mt-4 block text-[10px] font-black uppercase tracking-wider">Rationale<textarea value={rationale} onChange={(event) => setRationale(event.target.value)} maxLength={500} className="input-block mt-2 min-h-24" placeholder="Optional reasoning for adjudication" /></label><div className="mt-5 flex items-center justify-between border-t-2 border-[#E8E0D0] pt-5"><Button variant="outline" onClick={() => setIndex((value) => Math.max(0, value - 1))}><ChevronLeft size={14}/>Previous</Button><Button onClick={save}><Check size={14}/>Save label</Button><Button variant="outline" onClick={() => setIndex((value) => Math.min(tasks.length - 1, value + 1))}>Next<ChevronRight size={14}/></Button></div>{message&&<p className="mt-4 text-xs font-bold text-[#4F5B2A]">{message}</p>}</Panel> : <Panel className="border-4"><p className="font-black">No annotation task loaded.</p><p className="mt-2 text-sm">{message}</p></Panel>}<Panel className="border-4"><div className="flex items-center gap-2"><Users size={17}/><p className="eyebrow">Team progress</p></div><div className="mt-4 space-y-4">{stats?.byAnnotator.map((item) => <div key={item.annotatorId}><div className="flex justify-between text-[10px] font-black uppercase"><span>{item.annotatorId}</span><span>{item.completed}/120</span></div><div className="mt-1 h-3 border-2 border-[#2A3320] bg-[#E8E0D0]"><div className="h-full bg-[#4F5B2A]" style={{ width: `${Math.min(100, item.completed / 1.2)}%` }}/></div></div>)}</div><p className="mt-6 text-[9px] leading-relaxed text-[#2A3320]/60">Labels are stored independently. Agreement is calculated only after at least three annotations exist for a record.</p></Panel></div>
  </div>;
}
