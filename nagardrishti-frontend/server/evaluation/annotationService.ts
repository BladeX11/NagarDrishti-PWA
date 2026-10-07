import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { evaluationAnnotations } from '../db/schema.js';
import { benchmarkCases } from './benchmark.js';

const TASK_LIMIT = 120;
const annotatorIds = new Set(['annotator-a', 'annotator-b', 'annotator-c']);

export const annotationService = {
  async listTasks(annotatorId: string) {
    const tasks = benchmarkCases.slice(0, TASK_LIMIT);
    const annotations = await db.select().from(evaluationAnnotations).where(eq(evaluationAnnotations.annotatorId, annotatorId));
    const byRecord = new Map(annotations.map((annotation) => [annotation.recordId, annotation]));
    return tasks.map((task) => ({ ...task, annotation: byRecord.get(task.id) ?? null }));
  },

  async save(input: { recordId: string; annotatorId: string; category: string; priority: number; duplicateLabel?: string; rationale?: string }) {
    if (!annotatorIds.has(input.annotatorId)) throw new Error('Annotator must be annotator-a, annotator-b, or annotator-c');
    const task = benchmarkCases.find((item) => item.id === input.recordId);
    if (!task || !benchmarkCases.slice(0, TASK_LIMIT).some((item) => item.id === input.recordId)) throw new Error('Annotation task not found');
    if (input.priority < 1 || input.priority > 4 || !Number.isInteger(input.priority)) throw new Error('Priority must be an integer from 1 to 4');
    const [annotation] = await db.insert(evaluationAnnotations).values({
      recordId: input.recordId,
      annotatorId: input.annotatorId,
      category: input.category,
      priority: input.priority,
      duplicateLabel: input.duplicateLabel,
      rationale: input.rationale,
    }).onConflictDoUpdate({
      target: [evaluationAnnotations.recordId, evaluationAnnotations.annotatorId],
      set: { category: input.category, priority: input.priority, duplicateLabel: input.duplicateLabel, rationale: input.rationale, updatedAt: new Date() },
    }).returning();
    return annotation;
  },

  async stats() {
    const annotations = await db.select().from(evaluationAnnotations);
    const byAnnotator = Array.from(annotatorIds).map((annotatorId) => ({ annotatorId, completed: annotations.filter((item) => item.annotatorId === annotatorId).length }));
    const grouped = new Map<string, typeof annotations>();
    for (const annotation of annotations) grouped.set(annotation.recordId, [...(grouped.get(annotation.recordId) ?? []), annotation]);
    const completeRecords = Array.from(grouped.values()).filter((items) => items.length >= 3);
    const agreement = completeRecords.length ? completeRecords.reduce((sum, items) => {
      const categories = items.map((item) => item.category);
      const majority = categories.sort((a, b) => categories.filter((value) => value === b).length - categories.filter((value) => value === a).length)[0];
      return sum + categories.filter((value) => value === majority).length / categories.length;
    }, 0) / completeRecords.length : null;
    return { targetRecords: TASK_LIMIT, totalAnnotations: annotations.length, byAnnotator, completeRecords: completeRecords.length, majorityAgreement: agreement };
  },

  async exportRows() {
    return db.select().from(evaluationAnnotations);
  },
};
