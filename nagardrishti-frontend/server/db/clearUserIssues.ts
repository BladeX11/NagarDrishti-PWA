import 'dotenv/config';
import { db } from './index.js';
import * as schema from './schema.js';
import { inArray, or } from 'drizzle-orm';

async function safeDelete(tableName: string, fn: () => Promise<any>) {
  try {
    await fn();
  } catch (err: any) {
    if (err?.code === '42P01' || err?.cause?.code === '42P01') {
      // relation does not exist in db, skip safely
      return;
    }
    throw err;
  }
}

async function clearUserRegisteredIssues() {
  console.log('🔍 Checking for user-registered issues in database...');

  // Default seed refs from seed.ts: ND-101 to ND-125
  const defaultRefs = new Set(
    Array.from({ length: 25 }, (_, i) => `ND-1${(i + 1).toString().padStart(2, '0')}`)
  );

  const allIssues = await db.select({
    id: schema.issues.id,
    publicRef: schema.issues.publicRef,
    title: schema.issues.title,
    createdAt: schema.issues.createdAt,
  }).from(schema.issues);

  const userIssues = allIssues.filter(
    (issue) => !defaultRefs.has(issue.publicRef) && !issue.title.startsWith('Issue reported at Pune Locality')
  );

  if (userIssues.length === 0) {
    console.log('ℹ️ No user-registered issues found. Only default seed issues exist.');
    process.exit(0);
  }

  console.log(`Found ${userIssues.length} user-registered issue(s) to remove:`);
  for (const issue of userIssues) {
    console.log(` - [${issue.publicRef}] "${issue.title}" (created: ${issue.createdAt})`);
  }

  const userIssueIds = userIssues.map((i) => i.id);

  console.log('🗑️ Removing dependent records...');

  // 1. Status events
  await safeDelete('status_events', () =>
    db.delete(schema.statusEvents).where(inArray(schema.statusEvents.issueId, userIssueIds))
  );

  // 2. Issue media
  await safeDelete('issue_media', () =>
    db.delete(schema.issueMedia).where(inArray(schema.issueMedia.issueId, userIssueIds))
  );

  // 3. Adversarial flags
  await safeDelete('adversarial_flags', () =>
    db.delete(schema.adversarialFlags).where(inArray(schema.adversarialFlags.issueId, userIssueIds))
  );

  // 4. Model predictions
  await safeDelete('model_predictions', () =>
    db.delete(schema.modelPredictions).where(inArray(schema.modelPredictions.issueId, userIssueIds))
  );

  // 5. Issue duplicates (either side of duplicate pair)
  await safeDelete('issue_duplicates', () =>
    db.delete(schema.issueDuplicates).where(
      or(
        inArray(schema.issueDuplicates.issueAId, userIssueIds),
        inArray(schema.issueDuplicates.issueBId, userIssueIds)
      )
    )
  );

  // 6. Verification votes
  await safeDelete('verification_votes', () =>
    db.delete(schema.verificationVotes).where(inArray(schema.verificationVotes.issueId, userIssueIds))
  );

  // 7. Issue supporters
  await safeDelete('issue_supporters', () =>
    db.delete(schema.issueSupporters).where(inArray(schema.issueSupporters.issueId, userIssueIds))
  );

  // 8. Delete issues
  await safeDelete('issues', () =>
    db.delete(schema.issues).where(inArray(schema.issues.id, userIssueIds))
  );

  console.log(`✅ Successfully cleared ${userIssues.length} user-registered issue(s). Default seed issues (ND-101..ND-125) remain intact.`);
  process.exit(0);
}

clearUserRegisteredIssues().catch((err) => {
  console.error('❌ Failed to clear user issues:', err);
  process.exit(1);
});
