import { aiOrchestrator } from './orchestrator.js';

export interface AIJob {
  id: string;
  type: 'issue-inference';
  issueId: string;
  queuedAt: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  error?: string;
}

const jobs = new Map<string, AIJob>();

export const aiQueue = {
  async enqueueIssueInference(issueId: string): Promise<AIJob> {
    const job: AIJob = { id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, type: 'issue-inference', issueId, queuedAt: new Date().toISOString(), status: 'queued' };
    jobs.set(job.id, job);
    void (async () => {
      job.status = 'running';
      try {
        await aiOrchestrator.inferForIssue(issueId);
        job.status = 'completed';
      } catch (error) {
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Inference failed';
      }
    })();
    return job;
  },

  get(jobId: string) {
    return jobs.get(jobId) ?? null;
  },
};
