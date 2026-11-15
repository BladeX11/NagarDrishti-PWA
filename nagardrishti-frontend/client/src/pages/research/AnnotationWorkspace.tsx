import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Download, Users } from 'lucide-react';
import { toast } from 'sonner';
import { categories } from '../../types';
import { researchApi, type AnnotationStats, type AnnotationTask } from '../../lib/api';
import { Button } from '../../components/shared/Button';
import { PageHeader, Panel } from '../../components/shared/Primitives';

export function AnnotationWorkspace() {
  const [annotator, setAnnotator] = useState('annotator-a');
  const [tasks, setTasks] = useState<AnnotationTask[]>([]);
  const [stats, setStats] = useState<AnnotationStats | null>(null);
  const [index, setIndex] = useState(0);
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState(2);
  const [rationale, setRationale] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const loadSeqRef = useRef(0);
  const task = tasks[index];

  const load = useCallback(async (preserveIndex = false) => {
    const seq = ++loadSeqRef.current;
    setLoading(true);
    try {
      const [nextTasks, nextStats] = await Promise.all([
        researchApi.getAnnotationTasks(annotator),
        researchApi.getAnnotationStats(),
      ]);
      if (loadSeqRef.current !== seq) return nextTasks;
      setTasks(nextTasks);
      setStats(nextStats);
      setMessage('');
      if (preserveIndex) {
        setIndex((current) =>
          nextTasks.length === 0 ? 0 : Math.min(current, nextTasks.length - 1)
        );
      } else {
        const firstUnlabeled = nextTasks.findIndex((item) => !item.annotation);
        setIndex(firstUnlabeled >= 0 ? firstUnlabeled : 0);
      }
      return nextTasks;
    } catch (reason) {
      if (loadSeqRef.current !== seq) return null;
      const errMsg =
        reason instanceof Error && reason.message
          ? reason.message
          : 'Annotation database is unavailable.';
      setMessage(errMsg);
      return null;
    } finally {
      if (loadSeqRef.current === seq) {
        setLoading(false);
      }
    }
  }, [annotator]);

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    if (!task) return;
    setCategory(task.annotation?.category ?? '');
    setPriority(task.annotation?.priority ?? 2);
    setRationale(task.annotation?.rationale ?? '');
  }, [task]);

  const completed = useMemo(
    () => tasks.filter((item) => item.annotation).length,
    [tasks]
  );
  const targetRecords = stats?.targetRecords ?? 120;

  const save = async () => {
    if (saving) return;
    if (!task || !category) {
      setMessage('Choose a category before saving.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await researchApi.saveAnnotation({
        recordId: task.id,
        annotatorId: annotator,
        category,
        priority,
        rationale,
      });
      const updatedTasks = await load(true);
      const maxIndex = Math.max((updatedTasks?.length ?? tasks.length) - 1, 0);
      setIndex((value) => Math.min(value + 1, maxIndex));
      setMessage('Annotation saved.');
      toast.success('Annotation saved.');
    } catch (reason) {
      const errMsg =
        reason instanceof Error && reason.message
          ? reason.message
          : 'Unable to save annotation.';
      setMessage(errMsg);
      toast.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleExportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const headers: Record<string, string> = {};
      if (import.meta.env.DEV) {
        try {
          headers['x-demo-role'] = localStorage.getItem('nd-role') || 'researcher';
        } catch {
          headers['x-demo-role'] = 'researcher';
        }
      }
      const response = await fetch(researchApi.getAnnotationExportUrl(), {
        credentials: 'include',
        headers,
      });
      if (!response.ok) {
        const text = await response.text();
        let errMsg = `Export failed (HTTP ${response.status})`;
        try {
          const parsed = JSON.parse(text) as { error?: string };
          if (parsed.error) errMsg = parsed.error;
        } catch {
          // non-JSON response
        }
        throw new Error(errMsg);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'civictrust-annotations.csv';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success('Annotations exported.');
    } catch (reason) {
      const errMsg =
        reason instanceof Error && reason.message
          ? reason.message
          : 'Unable to export annotations.';
      setMessage(errMsg);
      toast.error(errMsg);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Human annotation workspace"
        title="Label CivicTrust records"
        description="Annotate independently before viewing model outputs. Use a separate annotator identity for each human labeler."
        action={
          <button
            type="button"
            onClick={() => void handleExportCsv()}
            disabled={exporting}
            className="inline-flex items-center gap-2 border-2 border-[#2A3320] bg-[#FDFBF7] px-3 py-2 text-[9px] font-black uppercase disabled:opacity-60"
          >
            <Download size={13} /> {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        }
      />
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Panel className="border-4">
          <p className="eyebrow">Annotator</p>
          <select
            value={annotator}
            onChange={(event) => setAnnotator(event.target.value)}
            className="mt-2 w-full border-2 border-[#2A3320] bg-white p-2 text-xs font-bold"
          >
            <option value="annotator-a">Annotator A</option>
            <option value="annotator-b">Annotator B</option>
            <option value="annotator-c">Annotator C</option>
          </select>
        </Panel>
        <Panel className="border-4">
          <p className="eyebrow">Progress</p>
          <p className="display-title mt-2 text-2xl">
            {completed} / {tasks.length || targetRecords}
          </p>
        </Panel>
        <Panel className="border-4">
          <p className="eyebrow">Complete records</p>
          <p className="display-title mt-2 text-2xl">{stats?.completeRecords ?? 0}</p>
        </Panel>
        <Panel className="border-4">
          <p className="eyebrow">Agreement</p>
          <p className="display-title mt-2 text-2xl">
            {stats?.majorityAgreement == null
              ? '—'
              : `${Math.round(stats.majorityAgreement * 100)}%`}
          </p>
        </Panel>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_.35fr]">
        {task ? (
          <Panel className="border-4">
            <div className="flex items-center justify-between border-b-2 border-[#E8E0D0] pb-4">
              <div>
                <p className="eyebrow">
                  Record {index + 1} of {tasks.length}
                </p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest">
                  {task.id} · {task.language} · {task.ward}
                </p>
              </div>
              <span className="border-2 border-[#B8892D] bg-[#B8892D]/10 px-2 py-1 text-[9px] font-black uppercase">
                Blind label
              </span>
            </div>
            <div className="my-8 border-4 border-[#2A3320] bg-[#FDFBF7] p-6">
              <p className="eyebrow">Issue narrative</p>
              <p className="mt-3 text-lg font-bold leading-relaxed">{task.text}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-[10px] font-black uppercase tracking-wider">
                Category
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="mt-2 block w-full border-2 border-[#2A3320] bg-white p-3 text-sm font-bold"
                >
                  <option value="">Choose category</option>
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[10px] font-black uppercase tracking-wider">
                Priority
                <select
                  value={priority}
                  onChange={(event) => setPriority(Number(event.target.value))}
                  className="mt-2 block w-full border-2 border-[#2A3320] bg-white p-3 text-sm font-bold"
                >
                  {[1, 2, 3, 4].map((item) => (
                    <option key={item} value={item}>
                      {item} · {item === 4 ? 'urgent' : item === 3 ? 'high' : item === 1 ? 'routine' : 'normal'}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-4 block text-[10px] font-black uppercase tracking-wider">
              Rationale
              <textarea
                value={rationale}
                onChange={(event) => setRationale(event.target.value)}
                maxLength={500}
                className="input-block mt-2 min-h-24"
                placeholder="Optional reasoning for adjudication"
              />
            </label>
            <div className="mt-5 flex items-center justify-between border-t-2 border-[#E8E0D0] pt-5">
              <Button
                variant="outline"
                disabled={index <= 0}
                onClick={() => setIndex((value) => Math.max(0, value - 1))}
              >
                <ChevronLeft size={14} />
                Previous
              </Button>
              <Button disabled={saving} onClick={() => void save()}>
                <Check size={14} />
                {saving ? 'Saving...' : 'Save label'}
              </Button>
              <Button
                variant="outline"
                disabled={index >= tasks.length - 1}
                onClick={() => setIndex((value) => Math.min(tasks.length - 1, value + 1))}
              >
                Next
                <ChevronRight size={14} />
              </Button>
            </div>
            {message && (
              <p className="mt-4 text-xs font-bold text-[#4F5B2A]">{message}</p>
            )}
          </Panel>
        ) : (
          <Panel className="border-4">
            <p className="font-black">
              {loading ? 'Loading annotation tasks...' : 'No annotation task loaded.'}
            </p>
            {message && <p className="mt-2 text-sm">{message}</p>}
          </Panel>
        )}
        <Panel className="border-4">
          <div className="flex items-center gap-2">
            <Users size={17} />
            <p className="eyebrow">Team progress</p>
          </div>
          <div className="mt-4 space-y-4">
            {stats?.byAnnotator.map((item) => (
              <div key={item.annotatorId}>
                <div className="flex justify-between text-[10px] font-black uppercase">
                  <span>{item.annotatorId}</span>
                  <span>
                    {item.completed}/{targetRecords}
                  </span>
                </div>
                <div className="mt-1 h-3 border-2 border-[#2A3320] bg-[#E8E0D0]">
                  <div
                    className="h-full bg-[#4F5B2A]"
                    style={{
                      width: `${Math.min(
                        100,
                        (item.completed / Math.max(targetRecords, 1)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[9px] leading-relaxed text-[#2A3320]/60">
            Labels are stored independently. Agreement is calculated only after at least three
            annotations exist for a record.
          </p>
        </Panel>
      </div>
    </div>
  );
}
