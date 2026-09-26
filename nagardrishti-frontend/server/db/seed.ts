import { db } from './index.js';
import * as schema from './schema.js';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';

function hashEvent(issueId: string, toStatus: string, actorId: string, prevHash: string, timestamp: Date) {
  return crypto.createHash('sha256')
    .update(`${prevHash}|${issueId}|${toStatus}|${actorId}|${timestamp.toISOString()}`)
    .digest('hex');
}

function generateGeohash(lat: number, lng: number): string {
  return `geo-${lat.toFixed(3)}-${lng.toFixed(3)}`; // Dummy geohash for seed
}

async function seed() {
  console.log('🌱 Seeding database...');

  // 1. Users
  console.log('Creating users...');
  const users = await db.insert(schema.users).values([
    { phoneHash: crypto.createHash('sha256').update('9999999991').digest('hex'), displayName: 'Neel', role: 'citizen' },
    { phoneHash: crypto.createHash('sha256').update('9999999992').digest('hex'), displayName: 'Priya', role: 'officer', department: 'roads', ward: 'ward-11' },
    { phoneHash: crypto.createHash('sha256').update('9999999993').digest('hex'), displayName: 'Raj', role: 'admin' },
    { phoneHash: crypto.createHash('sha256').update('9999999994').digest('hex'), displayName: 'Anita', role: 'researcher' },
  ]).returning();

  const citizen = users[0];
  const officer = users[1];

  // 2. Wards
  console.log('Creating wards...');
  const wards = await db.insert(schema.wards).values([
    { id: 'ward-11', name: 'Kothrud' },
    { id: 'ward-12', name: 'Deccan Gymkhana' },
    { id: 'ward-14', name: 'Swargate' },
    { id: 'ward-15', name: 'Kalyani Nagar' },
  ]).returning();

  // 3. Departments
  console.log('Creating departments...');
  const departments = await db.insert(schema.departments).values([
    { id: 'roads', name: 'Roads & Infrastructure' },
    { id: 'waste', name: 'Solid Waste Management' },
    { id: 'water', name: 'Water Supply' },
    { id: 'drainage', name: 'Drainage & Sewage' },
    { id: 'electrical', name: 'Electrical & Streetlights' },
    { id: 'animals', name: 'Stray Animal Control' },
    { id: 'civic-works', name: 'Civic Works' },
  ]).returning();

  // 4. SLA Policies
  console.log('Creating SLA policies...');
  const categories = ['pothole/road', 'garbage/waste', 'drainage/sewage', 'water supply', 'streetlight/electrical', 'stray animals', 'encroachment', 'other'];
  const slaPoliciesData = categories.map((cat, i) => ({
    category: cat,
    priority: 3,
    deadlineDays: (i % 3) + 2,
  }));
  await db.insert(schema.slaPolicies).values(slaPoliciesData).returning();

  // 5. Issues & Status Events
  console.log('Creating issues & status events...');
  const seedPoints = [
    [18.5204, 73.8567], [18.5235, 73.8541], [18.5172, 73.8583], [18.5261, 73.8498],
    [18.5148, 73.8611], [18.5294, 73.8532], [18.5119, 73.8478], [18.5331, 73.8624],
    [18.5197, 73.8444], [18.5079, 73.8561], [18.5242, 73.8389], [18.5164, 73.8662],
    [18.5318, 73.8421], [18.5029, 73.8553], [18.5098, 73.8294], [18.5275, 73.8744],
    [18.5147, 73.8296], [18.5154, 73.8554], [18.5074, 73.8328], [18.5632, 73.8071],
    [18.5159, 73.8502], [18.5657, 73.7783], [18.5051, 73.8257], [18.5079, 73.8336],
    [18.5165, 73.8471],
  ] as const;
  const issuesData = [];
  for (let i = 1; i <= 25; i++) {
    const [lat, lng] = seedPoints[i - 1];
    issuesData.push({
      publicRef: `ND-1${i.toString().padStart(2, '0')}`,
      title: `Issue reported at Pune Locality ${i}`,
      description: `Detailed description for issue ${i}`,
      category: categories[i % categories.length],
      status: 'Open',
      departmentId: departments[i % departments.length].id,
      privateLat: lat,
      privateLng: lng,
      publicGeohash: generateGeohash(lat, lng),
      publicLat: lat,
      publicLng: lng,
      wardId: wards[i % wards.length].id,
      reporterId: citizen.id,
      assignedTo: officer.id,
    });
  }

  const insertedIssues = await db.insert(schema.issues).values(issuesData).returning();

  for (const [index, issue] of insertedIssues.entries()) {
    let prevEventHash = 'GENESIS';
    const initialTimestamp = new Date(Date.UTC(2026, 8, 1, index, 0, 0));
    const eHash = hashEvent(issue.id, 'Open', citizen.id, prevEventHash, initialTimestamp);
    await db.insert(schema.statusEvents).values({
      issueId: issue.id,
      fromStatus: null,
      toStatus: 'Open',
      actorId: citizen.id,
      actorRole: 'citizen',
      reason: 'Initial report',
      prevHash: prevEventHash,
      eventHash: eHash,
      createdAt: initialTimestamp,
    });
    prevEventHash = eHash;

    if (Number(issue.publicRef.slice(-2)) % 2 === 0) {
      const triagedTimestamp = new Date(initialTimestamp.getTime() + 1000);
      const eHash2 = hashEvent(issue.id, 'Triaged', 'SYSTEM', prevEventHash, triagedTimestamp);
      await db.insert(schema.statusEvents).values({
        issueId: issue.id,
        fromStatus: 'Open',
        toStatus: 'Triaged',
        actorId: 'SYSTEM',
        actorRole: 'system',
        reason: 'Auto-triaged by AI',
        prevHash: prevEventHash,
        eventHash: eHash2,
        createdAt: triagedTimestamp,
      });
      prevEventHash = eHash2;
      
      await db.update(schema.issues).set({ status: 'Triaged' }).where(eq(schema.issues.id, issue.id));
    }
  }

  // 6. Scorecard Snapshots
  console.log('Creating scorecard snapshots...');
  const snapshots = [];
  for (let i = 0; i < 8; i++) {
    snapshots.push({
      wardId: wards[i % wards.length].id,
      departmentId: departments[i % departments.length].id,
      period: '2023-Q3',
      totalIssues: 100 + i * 10,
      resolvedIssues: 80 + i * 5,
      slaCompliance: 85.5 + i,
      medianResolutionDays: 4.2,
      reopenRate: 2.1,
    });
  }
  await db.insert(schema.scorecardSnapshots).values(snapshots);

  console.log('✅ Seeding complete!');
}

seed().catch(e => {
  console.error('Seeding failed:', e);
  process.exit(1);
}).finally(() => {
  process.exit(0);
});
