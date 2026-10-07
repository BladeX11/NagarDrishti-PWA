import { ne } from 'drizzle-orm';
import { db } from '../db/index.js';
import { issueGraphEdges, issues } from '../db/schema.js';
import { AI_VERSION, type IssueInferenceContext } from './contracts.js';
import { clamp, haversineMetres, jaccardSimilarity } from './features.js';

type GraphNode = { id: string; publicRef: string; category: string; status: string };
type GraphEdge = {
  issueAId: string;
  issueBId: string;
  spatialDistance: number;
  textSimilarity: number;
  categoryMatch: boolean;
  temporalSimilarity: number;
  edgeScore: number;
  edgeType: string;
  status: string | null;
};

function toContext(issue: typeof issues.$inferSelect): IssueInferenceContext {
  return {
    issueId: issue.id,
    title: issue.title,
    description: issue.description ?? '',
    category: issue.category,
    status: issue.status,
    latitude: issue.privateLat,
    longitude: issue.privateLng,
    supporterCount: issue.supporterCount ?? 0,
    ageInDays: issue.createdAt ? Math.max(0, (Date.now() - issue.createdAt.getTime()) / 86400000) : 0,
    slaBreach: issue.slaBreach ?? false,
    hasProof: issue.proofState !== 'none',
  };
}

function temporalSimilarity(left: Date | null, right: Date | null): number {
  if (!left || !right) return 0.5;
  const days = Math.abs(left.getTime() - right.getTime()) / 86400000;
  return Math.exp(-days / 30);
}

function orderedPair(left: string, right: string): [string, string] {
  return left < right ? [left, right] : [right, left];
}

export const issueGraphService = {
  async rebuild() {
    const nodes = await db.select().from(issues).where(ne(issues.status, 'Verified Fixed'));
    const edges: GraphEdge[] = [];

    for (let index = 0; index < nodes.length; index += 1) {
      for (let next = index + 1; next < nodes.length; next += 1) {
        const left = nodes[index];
        const right = nodes[next];
        const leftContext = toContext(left);
        const rightContext = toContext(right);
        const distance = haversineMetres(left.privateLat, left.privateLng, right.privateLat, right.privateLng);
        if (distance > 1500) continue;

        const textSimilarity = jaccardSimilarity(
          `${leftContext.title} ${leftContext.description}`,
          `${rightContext.title} ${rightContext.description}`,
        );
        const categoryMatch = left.category === right.category;
        const timeSimilarity = temporalSimilarity(left.createdAt, right.createdAt);
        const spatialSimilarity = Math.exp(-distance / 500);
        const edgeScore = clamp(spatialSimilarity * 0.45 + textSimilarity * 0.3 + (categoryMatch ? 0.15 : 0) + timeSimilarity * 0.1);
        if (edgeScore < 0.35) continue;

        const [issueAId, issueBId] = orderedPair(left.id, right.id);
        const edgeType = edgeScore >= 0.65 ? 'duplicate' : 'related';
        const edge = {
          issueAId,
          issueBId,
          spatialDistance: distance,
          textSimilarity,
          categoryMatch,
          temporalSimilarity: timeSimilarity,
          edgeScore,
          edgeType,
          status: 'pending',
          modelVersion: AI_VERSION,
          updatedAt: new Date(),
        };
        edges.push(edge);
        await db.insert(issueGraphEdges).values(edge).onConflictDoUpdate({
          target: [issueGraphEdges.issueAId, issueGraphEdges.issueBId],
          set: edge,
        });
      }
    }

    return buildResponse(nodes, edges);
  },

  async list() {
    const nodes = await db.select().from(issues).where(ne(issues.status, 'Verified Fixed'));
    const storedEdges = await db.select().from(issueGraphEdges);
    return buildResponse(nodes, storedEdges.map((edge) => ({
      issueAId: edge.issueAId!,
      issueBId: edge.issueBId!,
      spatialDistance: edge.spatialDistance,
      textSimilarity: edge.textSimilarity,
      categoryMatch: edge.categoryMatch,
      temporalSimilarity: edge.temporalSimilarity,
      edgeScore: edge.edgeScore,
      edgeType: edge.edgeType,
      status: edge.status,
    })));
  },
};

function buildResponse(nodes: Array<typeof issues.$inferSelect>, edges: GraphEdge[]) {
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    const current = parent.get(id);
    if (!current || current === id) return current ?? id;
    const root = find(current);
    parent.set(id, root);
    return root;
  };
  const union = (left: string, right: string) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot);
  };

  nodes.forEach((node) => parent.set(node.id, node.id));
  edges.filter((edge) => edge.edgeType === 'duplicate' && edge.edgeScore >= 0.65).forEach((edge) => union(edge.issueAId, edge.issueBId));

  const clusters = new Map<string, string[]>();
  nodes.forEach((node) => {
    const root = find(node.id);
    clusters.set(root, [...(clusters.get(root) ?? []), node.id]);
  });

  return {
    nodes: nodes.map((node): GraphNode => ({ id: node.id, publicRef: node.publicRef, category: node.category, status: node.status })),
    edges,
    clusters: Array.from(clusters.values()).filter((members) => members.length > 1).map((members) => ({ issueIds: members, size: members.length })),
    generatedAt: new Date().toISOString(),
  };
}
