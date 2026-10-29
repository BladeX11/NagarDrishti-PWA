import 'dotenv/config';
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
    { id: 'ward-11', name: 'Kothrud', wardType: 'planned', densityTier: 'medium', taxBand: 'B' },
    { id: 'ward-12', name: 'Deccan Gymkhana', wardType: 'mixed', densityTier: 'high', taxBand: 'A' },
    { id: 'ward-14', name: 'Swargate', wardType: 'unplanned', densityTier: 'high', taxBand: 'C' },
    { id: 'ward-15', name: 'Kalyani Nagar', wardType: 'peri-urban', densityTier: 'low', taxBand: 'D' },
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
  const deptMap: Record<string, string> = {
    'pothole/road': 'roads',
    'garbage/waste': 'waste',
    'drainage/sewage': 'drainage',
    'water supply': 'water',
    'streetlight/electrical': 'electrical',
    'stray animals': 'animals',
    'encroachment': 'civic-works',
    'other': 'civic-works',
  };

  const seedRows = [
    { ref: 'ND-101', title: 'Road crater at Swargate bus depot', desc: 'Large road crater near entry gate causing passenger bus delays.', cat: 'pothole/road', ward: 'ward-14', pos: [18.5010, 73.8580] },
    { ref: 'ND-102', title: 'Overflowing bin near Camp market', desc: 'Commercial waste overflowing onto pedestrian walkway.', cat: 'garbage/waste', ward: 'ward-11', pos: [18.5130, 73.8770] },
    { ref: 'ND-103', title: 'Water leakage on Sinhagad road', desc: 'Damaged main pipe leaking clean water across the road shoulder.', cat: 'water supply', ward: 'ward-14', pos: [18.4600, 73.8200] },
    { ref: 'ND-104', title: 'Pothole near Shivaji Nagar market', desc: 'A deep pothole has formed beside the market entrance, forcing two-wheelers into oncoming traffic.', cat: 'pothole/road', ward: 'ward-12', pos: [18.5302, 73.8471] },
    { ref: 'ND-105', title: 'Overflowing bin at Deccan Gymkhana', desc: 'The public bin near the bus stop has been overflowing since yesterday evening.', cat: 'garbage/waste', ward: 'ward-12', pos: [18.5168, 73.8412] },
    { ref: 'ND-106', title: 'Dark stretch by JM Road bus stop', desc: 'Three streetlights are out along the footpath between the stop and the crossing.', cat: 'streetlight/electrical', ward: 'ward-12', pos: [18.5234, 73.8435] },
    { ref: 'ND-107', title: 'Drainage overflow at Station Road', desc: 'Wastewater is backing up onto the pavement after the afternoon showers.', cat: 'drainage/sewage', ward: 'ward-11', pos: [18.5316, 73.8584] },
    { ref: 'ND-108', title: 'Low water pressure on Apte Road', desc: 'Residents on the upper floors have had very low water pressure for two mornings.', cat: 'water supply', ward: 'ward-12', pos: [18.5161, 73.8349] },
    { ref: 'ND-109', title: 'Uncollected waste near FC Road', desc: 'Several bags have been left beside the collection point since the weekend.', cat: 'garbage/waste', ward: 'ward-12', pos: [18.5238, 73.8418] },
    { ref: 'ND-110', title: 'Loose paving outside Pune station', desc: 'Broken paving blocks are creating an uneven path close to the east entrance.', cat: 'pothole/road', ward: 'ward-11', pos: [18.5289, 73.8744] },
    { ref: 'ND-111', title: 'Stray dog shelter needed on Prabhat Road', desc: 'A small group of dogs is sheltering beside the school gate and needs a welfare check.', cat: 'stray animals', ward: 'ward-14', pos: [18.5147, 73.8296] },
    { ref: 'ND-112', title: 'Footpath encroachment at Laxmi Road', desc: 'Temporary stalls are blocking the accessible route beside the crossing.', cat: 'encroachment', ward: 'ward-11', pos: [18.5154, 73.8554] },
    { ref: 'ND-113', title: 'Pothole cluster near Nal Stop', desc: 'Two large road depressions have collected water near the junction turn.', cat: 'pothole/road', ward: 'ward-14', pos: [18.5074, 73.8328] },
    { ref: 'ND-114', title: 'Overflowing bin at Sambhaji Park', desc: 'The litter bin is full and loose waste is spreading into the garden path.', cat: 'garbage/waste', ward: 'ward-12', pos: [18.5201, 73.8479] },
    { ref: 'ND-115', title: 'Sewage odour near Karve Road', desc: 'A roadside drain is emitting a strong odour and appears partially blocked.', cat: 'drainage/sewage', ward: 'ward-14', pos: [18.5018, 73.8291] },
    { ref: 'ND-116', title: 'Streetlight out on Bhandarkar Road', desc: 'The lamp opposite the clinic has not switched on for four nights.', cat: 'streetlight/electrical', ward: 'ward-12', pos: [18.5194, 73.8351] },
    { ref: 'ND-117', title: 'Water leak at Model Colony lane 4', desc: 'Water is seeping through a road-side valve box and pooling near the corner.', cat: 'water supply', ward: 'ward-12', pos: [18.5292, 73.8386] },
    { ref: 'ND-118', title: 'Loose cattle near Market Yard crossing', desc: 'Two cattle have been wandering into the road at peak traffic time.', cat: 'stray animals', ward: 'ward-15', pos: [18.4944, 73.8721] },
    { ref: 'ND-119', title: 'Broken footpath at Aundh ITI Road', desc: 'Raised concrete slabs are difficult to pass with a stroller or wheelchair.', cat: 'pothole/road', ward: 'ward-15', pos: [18.5584, 73.8077] },
    { ref: 'ND-120', title: 'Garbage pile near Kothrud depot', desc: 'A mixed-waste pile is accumulating at the edge of the bus depot entrance.', cat: 'garbage/waste', ward: 'ward-14', pos: [18.5079, 73.8073] },
    { ref: 'ND-121', title: 'Blocked drain on Ghole Road', desc: 'Leaves and plastic are covering the stormwater inlet near the corner shop.', cat: 'drainage/sewage', ward: 'ward-12', pos: [18.5211, 73.8515] },
    { ref: 'ND-122', title: 'Illegal dumping by Mula river path', desc: 'Construction debris has narrowed the public walking path by the river.', cat: 'encroachment', ward: 'ward-15', pos: [18.5632, 73.8071] },
    { ref: 'ND-123', title: 'Damaged traffic sign at Alka Chowk', desc: 'The direction sign is tilted and difficult to read from the turn lane.', cat: 'other', ward: 'ward-11', pos: [18.5159, 73.8502] },
    { ref: 'ND-124', title: 'Low water flow near Baner Gaon', desc: 'Several homes on the lane report intermittent supply in the morning window.', cat: 'water supply', ward: 'ward-15', pos: [18.5657, 73.7783] },
    { ref: 'ND-125', title: 'Streetlight flickering at Sarasbaug', desc: 'A lamp on the garden perimeter turns off and on throughout the evening.', cat: 'streetlight/electrical', ward: 'ward-11', pos: [18.5029, 73.8553] },
    { ref: 'ND-126', title: 'Uncovered manhole at Erandwane', desc: 'A drain cover is missing beside the footpath near the signal.', cat: 'drainage/sewage', ward: 'ward-14', pos: [18.5051, 73.8257] },
    { ref: 'ND-127', title: 'Roadside litter near Nal Stop', desc: 'Loose cups and wrappers have gathered near the shelter after evening traffic.', cat: 'garbage/waste', ward: 'ward-14', pos: [18.5079, 73.8336] },
    { ref: 'ND-128', title: 'Broken ramp at Deccan bridge', desc: 'The kerb ramp is chipped and has a steep uneven transition at the crossing.', cat: 'pothole/road', ward: 'ward-12', pos: [18.5165, 73.8471] },
  ];

  const issuesData = seedRows.map((row) => ({
    publicRef: row.ref,
    title: row.title,
    description: row.desc,
    category: row.cat,
    status: 'Open',
    departmentId: deptMap[row.cat] || 'civic-works',
    privateLat: row.pos[0],
    privateLng: row.pos[1],
    publicGeohash: generateGeohash(row.pos[0], row.pos[1]),
    publicLat: row.pos[0],
    publicLng: row.pos[1],
    wardId: row.ward,
    reporterId: citizen.id,
    assignedTo: officer.id,
  }));

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

    const wardId = issue.wardId;
    let finalStatus = 'Open';
    let slaBreach = false;
    let reopenCount = 0;

    if (wardId === 'ward-11') {
      // Planned ward: Prompt response (0.8 - 1.5 days), fast resolution, high SLA compliance
      const triageTime = new Date(initialTimestamp.getTime() + 6 * 3600 * 1000);
      const eHashT = hashEvent(issue.id, 'Triaged', 'SYSTEM', prevEventHash, triageTime);
      await db.insert(schema.statusEvents).values({
        issueId: issue.id,
        fromStatus: 'Open',
        toStatus: 'Triaged',
        actorId: 'SYSTEM',
        actorRole: 'system',
        reason: 'Auto-triaged by AI',
        prevHash: prevEventHash,
        eventHash: eHashT,
        createdAt: triageTime,
      });
      prevEventHash = eHashT;

      const assignTime = new Date(initialTimestamp.getTime() + 24 * 3600 * 1000); // 1.0 day
      const eHashA = hashEvent(issue.id, 'Assigned', officer.id, prevEventHash, assignTime);
      await db.insert(schema.statusEvents).values({
        issueId: issue.id,
        fromStatus: 'Triaged',
        toStatus: 'Assigned',
        actorId: officer.id,
        actorRole: 'officer',
        reason: 'Assigned to field engineer',
        prevHash: prevEventHash,
        eventHash: eHashA,
        createdAt: assignTime,
      });
      prevEventHash = eHashA;
      finalStatus = 'Assigned';

      if (index % 2 === 0) {
        const resolveTime = new Date(initialTimestamp.getTime() + 3 * 86400 * 1000); // 3.0 days
        const eHashR = hashEvent(issue.id, 'Verified Fixed', 'SYSTEM', prevEventHash, resolveTime);
        await db.insert(schema.statusEvents).values({
          issueId: issue.id,
          fromStatus: 'Assigned',
          toStatus: 'Verified Fixed',
          actorId: 'SYSTEM',
          actorRole: 'system',
          reason: 'Citizen verified fixed',
          prevHash: prevEventHash,
          eventHash: eHashR,
          createdAt: resolveTime,
        });
        prevEventHash = eHashR;
        finalStatus = 'Verified Fixed';
      }
    } else if (wardId === 'ward-14') {
      // Unplanned ward: Significant response delay (5.0 - 8.0 days), frequent SLA breaches
      if (index % 4 !== 0) {
        const delayDays = 5 + (index % 4);
        const triageTime = new Date(initialTimestamp.getTime() + delayDays * 86400 * 1000);
        const eHashT = hashEvent(issue.id, 'Triaged', 'SYSTEM', prevEventHash, triageTime);
        await db.insert(schema.statusEvents).values({
          issueId: issue.id,
          fromStatus: 'Open',
          toStatus: 'Triaged',
          actorId: 'SYSTEM',
          actorRole: 'system',
          reason: 'Delayed triage backlog',
          prevHash: prevEventHash,
          eventHash: eHashT,
          createdAt: triageTime,
        });
        prevEventHash = eHashT;
        finalStatus = 'Triaged';

        const assignTime = new Date(initialTimestamp.getTime() + (delayDays + 1) * 86400 * 1000);
        const eHashA = hashEvent(issue.id, 'Assigned', officer.id, prevEventHash, assignTime);
        await db.insert(schema.statusEvents).values({
          issueId: issue.id,
          fromStatus: 'Triaged',
          toStatus: 'Assigned',
          actorId: officer.id,
          actorRole: 'officer',
          reason: 'Escalated assignment',
          prevHash: prevEventHash,
          eventHash: eHashA,
          createdAt: assignTime,
        });
        prevEventHash = eHashA;
        finalStatus = 'Assigned';
        slaBreach = true;
        reopenCount = index % 3 === 0 ? 1 : 0;
      }
    } else if (wardId === 'ward-12') {
      // Mixed ward: Moderate response time (~2.0 - 2.5 days)
      const assignTime = new Date(initialTimestamp.getTime() + 2.2 * 86400 * 1000);
      const eHashA = hashEvent(issue.id, 'Assigned', officer.id, prevEventHash, assignTime);
      await db.insert(schema.statusEvents).values({
        issueId: issue.id,
        fromStatus: 'Open',
        toStatus: 'Assigned',
        actorId: officer.id,
        actorRole: 'officer',
        reason: 'Standard allocation',
        prevHash: prevEventHash,
        eventHash: eHashA,
        createdAt: assignTime,
      });
      prevEventHash = eHashA;
      finalStatus = 'Assigned';
    } else if (wardId === 'ward-15') {
      // Peri-urban ward: Moderate response (~3.0 days)
      const assignTime = new Date(initialTimestamp.getTime() + 3.0 * 86400 * 1000);
      const eHashA = hashEvent(issue.id, 'Assigned', officer.id, prevEventHash, assignTime);
      await db.insert(schema.statusEvents).values({
        issueId: issue.id,
        fromStatus: 'Open',
        toStatus: 'Assigned',
        actorId: officer.id,
        actorRole: 'officer',
        reason: 'Outlying jurisdiction assignment',
        prevHash: prevEventHash,
        eventHash: eHashA,
        createdAt: assignTime,
      });
      prevEventHash = eHashA;
      finalStatus = 'Assigned';
    }

    await db.update(schema.issues).set({
      status: finalStatus,
      slaBreach,
      reopenCount,
    }).where(eq(schema.issues.id, issue.id));
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
