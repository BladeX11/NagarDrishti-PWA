import { pgTable, text, timestamp, integer, boolean, doublePrecision, uuid, jsonb, serial, unique, index, primaryKey } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  phoneHash: text('phone_hash').unique(),
  displayName: text('display_name').notNull(),
  role: text('role').notNull(), // citizen | officer | admin | researcher
  ward: text('ward'),
  department: text('department'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  tokenHash: text('token_hash').unique(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const wards = pgTable('wards', {
  id: text('id').primaryKey(), // 'ward-11', etc.
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const departments = pgTable('departments', {
  id: text('id').primaryKey(), // 'roads', etc.
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const slaPolicies = pgTable('sla_policies', {
  id: serial('id').primaryKey(),
  category: text('category').notNull(),
  priority: integer('priority').default(3),
  deadlineDays: integer('deadline_days').notNull(),
}, (table) => {
  return {
    categoryPriorityUnq: unique().on(table.category, table.priority),
  };
});

export const issues = pgTable('issues', {
  id: uuid('id').defaultRandom().primaryKey(),
  publicRef: text('public_ref').unique().notNull(), // 'ND-104'
  title: text('title').notNull(),
  description: text('description'),
  language: text('language').default('en'), // en|hi|mr
  category: text('category').notNull(), // pothole/road, garbage/waste, etc.
  status: text('status').notNull().default('Open'), // Open|Triaged|Assigned...
  departmentId: text('department_id').references(() => departments.id),
  assignedTo: uuid('assigned_to').references(() => users.id),
  priority: integer('priority').default(3), // 1-4
  urgencyExplanation: text('urgency_explanation'),
  privateLat: doublePrecision('private_lat').notNull(),
  privateLng: doublePrecision('private_lng').notNull(),
  publicGeohash: text('public_geohash').notNull(),
  publicLat: doublePrecision('public_lat'),
  publicLng: doublePrecision('public_lng'),
  wardId: text('ward_id').references(() => wards.id),
  slaDeadline: timestamp('sla_deadline'),
  slaBreach: boolean('sla_breach').default(false),
  proofState: text('proof_state').default('none'), // none|submitted|accepted|rejected
  reporterId: uuid('reporter_id').references(() => users.id),
  supporterCount: integer('supporter_count').default(0),
  reopenCount: integer('reopen_count').default(0),
  sourceType: text('source_type').default('self_collected'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    statusIdx: index('idx_issues_status').on(table.status),
    categoryIdx: index('idx_issues_category').on(table.category),
    wardIdx: index('idx_issues_ward_id').on(table.wardId),
    createdAtIdx: index('idx_issues_created_at').on(table.createdAt),
    publicGeohashIdx: index('idx_issues_public_geohash').on(table.publicGeohash),
  };
});

export const issueMedia = pgTable('issue_media', {
  id: uuid('id').defaultRandom().primaryKey(),
  issueId: uuid('issue_id').references(() => issues.id),
  type: text('type').notNull(), // before|after|proof
  privatePath: text('private_path').notNull(),
  publicPath: text('public_path'),
  fileHash: text('file_hash').notNull(),
  perceptualHash: text('perceptual_hash'),
  exifLat: doublePrecision('exif_lat'),
  exifLng: doublePrecision('exif_lng'),
  capturedAt: timestamp('captured_at'),
  fileSize: integer('file_size'),
  mimeType: text('mime_type'),
  privacyReviewed: boolean('privacy_reviewed').default(false),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    issueIdx: index('idx_issue_media_issue_id').on(table.issueId),
    hashIdx: index('idx_issue_media_file_hash').on(table.fileHash),
    phashIdx: index('idx_issue_media_phash').on(table.perceptualHash),
  };
});

export const issueSupporters = pgTable('issue_supporters', {
  issueId: uuid('issue_id').references(() => issues.id),
  userId: uuid('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.issueId, table.userId] }),
  };
});

export const verificationVotes = pgTable('verification_votes', {
  id: uuid('id').defaultRandom().primaryKey(),
  issueId: uuid('issue_id').references(() => issues.id),
  userId: uuid('user_id').references(() => users.id),
  proofVersion: integer('proof_version').default(1),
  vote: text('vote').notNull(), // fixed|not_fixed|unsure
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    issueUserProofUnq: unique().on(table.issueId, table.userId, table.proofVersion),
  };
});

export const issueDuplicates = pgTable('issue_duplicates', {
  id: uuid('id').defaultRandom().primaryKey(),
  issueAId: uuid('issue_a_id').references(() => issues.id),
  issueBId: uuid('issue_b_id').references(() => issues.id),
  spatialDistance: doublePrecision('spatial_distance'),
  textSimilarity: doublePrecision('text_similarity'),
  imageSimilarity: doublePrecision('image_similarity'),
  categoryMatch: boolean('category_match'),
  overallScore: doublePrecision('overall_score').notNull(),
  status: text('status').default('pending'), // pending|confirmed|rejected
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  modelVersion: text('model_version'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    issueABUnq: unique().on(table.issueAId, table.issueBId),
    issueAIdx: index('idx_issue_duplicates_issue_a').on(table.issueAId),
    issueBIdx: index('idx_issue_duplicates_issue_b').on(table.issueBId),
    statusIdx: index('idx_issue_duplicates_status').on(table.status),
  };
});

export const issueGraphEdges = pgTable('issue_graph_edges', {
  id: uuid('id').defaultRandom().primaryKey(),
  issueAId: uuid('issue_a_id').references(() => issues.id),
  issueBId: uuid('issue_b_id').references(() => issues.id),
  spatialDistance: doublePrecision('spatial_distance').notNull(),
  textSimilarity: doublePrecision('text_similarity').notNull(),
  categoryMatch: boolean('category_match').notNull(),
  temporalSimilarity: doublePrecision('temporal_similarity').notNull(),
  edgeScore: doublePrecision('edge_score').notNull(),
  edgeType: text('edge_type').notNull(), // duplicate|related
  status: text('status').default('pending'),
  modelVersion: text('model_version').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => {
  return {
    issuePairUnq: unique().on(table.issueAId, table.issueBId),
    issueAIdx: index('idx_issue_graph_edges_issue_a').on(table.issueAId),
    issueBIdx: index('idx_issue_graph_edges_issue_b').on(table.issueBId),
    scoreIdx: index('idx_issue_graph_edges_score').on(table.edgeScore),
  };
});

export const adversarialFlags = pgTable('adversarial_flags', {
  id: uuid('id').defaultRandom().primaryKey(),
  issueId: uuid('issue_id').references(() => issues.id),
  rule: text('rule').notNull(), // 'PHOTO_REUSE' | 'TEMPORAL' | 'GPS_MISMATCH' | 'BULK_CLOSURE'
  severity: text('severity').notNull(), // 'low' | 'medium' | 'high'
  details: jsonb('details').notNull(), // structured payload
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  resolution: text('resolution'), // 'dismissed' | 'confirmed_fraud' | 'false_positive'
  modelVersion: text('model_version').notNull().default('adversarial-rules-v1.0'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    issueIdx: index('idx_adversarial_flags_issue_id').on(table.issueId),
    ruleIdx: index('idx_adversarial_flags_rule').on(table.rule),
  };
});

export const statusEvents = pgTable('status_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  sequenceNum: serial('sequence_num').unique(),
  issueId: uuid('issue_id').references(() => issues.id),
  fromStatus: text('from_status'),
  toStatus: text('to_status').notNull(),
  actorId: text('actor_id'), // uuid FK OR 'SYSTEM'
  actorRole: text('actor_role').notNull(),
  reason: text('reason'),
  prevHash: text('prev_hash').notNull(),
  eventHash: text('event_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    issueSeqIdx: index('idx_status_events_issue_seq').on(table.issueId, table.sequenceNum),
  };
});

export const modelPredictions = pgTable('model_predictions', {
  id: uuid('id').defaultRandom().primaryKey(),
  issueId: uuid('issue_id').references(() => issues.id),
  module: text('module').notNull(), // M1|M2...
  prediction: jsonb('prediction').notNull(),
  confidence: doublePrecision('confidence').notNull(),
  rawConfidence: doublePrecision('raw_confidence'),
  calibratedConfidence: doublePrecision('calibrated_confidence'),
  abstained: boolean('abstained').default(false),
  abstentionReason: text('abstention_reason'),
  calibrationVersion: text('calibration_version'),
  modelVersion: text('model_version').notNull(),
  dataVersion: text('data_version').notNull(),
  explanation: text('explanation'),
  wasOverridden: boolean('was_overridden').default(false),
  overrideValue: jsonb('override_value'),
  overriddenBy: uuid('overridden_by').references(() => users.id),
  status: text('status').default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    issueIdx: index('idx_model_predictions_issue_id').on(table.issueId),
    moduleIdx: index('idx_model_predictions_module').on(table.module),
    modelIdx: index('idx_model_predictions_model_version').on(table.modelVersion),
  };
});

export const scorecardSnapshots = pgTable('scorecard_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  wardId: text('ward_id').references(() => wards.id),
  departmentId: text('department_id').references(() => departments.id),
  period: text('period').notNull(),
  totalIssues: integer('total_issues').notNull(),
  resolvedIssues: integer('resolved_issues').notNull(),
  slaCompliance: doublePrecision('sla_compliance').notNull(),
  medianResolutionDays: doublePrecision('median_resolution_days'),
  reopenRate: doublePrecision('reopen_rate'),
  activeIssues: integer('active_issues'),
  methodVersion: text('method_version').default('v1.0'),
  snapshotAt: timestamp('snapshot_at').defaultNow(),
});

export const evaluationAnnotations = pgTable('evaluation_annotations', {
  id: uuid('id').defaultRandom().primaryKey(),
  recordId: text('record_id').notNull(),
  annotatorId: text('annotator_id').notNull(),
  category: text('category').notNull(),
  priority: integer('priority').notNull(),
  duplicateLabel: text('duplicate_label'),
  rationale: text('rationale'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  recordAnnotatorUnq: unique().on(table.recordId, table.annotatorId),
  recordIdx: index('idx_evaluation_annotations_record_id').on(table.recordId),
  annotatorIdx: index('idx_evaluation_annotations_annotator_id').on(table.annotatorId),
}));
