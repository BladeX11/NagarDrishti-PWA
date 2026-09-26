import type {
  Category,
  DuplicatePair,
  Issue,
  IssueStatus,
  Prediction,
  ScorecardSnapshot,
  StatusEvent,
} from '../types';

const rows: Array<[
  string, string, Category, IssueStatus, string, number, number, number, boolean, number,
  string, [number, number], number, { fixed: number; notFixed: number; unsure: number }
]> = [
  ['Pothole near Shivaji Nagar market', 'A deep pothole has formed beside the market entrance, forcing two-wheelers into oncoming traffic.', 'pothole/road', 'Open', 'Ward 12', 3, 18, 1, true, 3, 'High traffic junction and repeated near-miss reports increase safety risk.', [18.5302, 73.8471], 0.87, { fixed: 0, notFixed: 0, unsure: 0 }],
  ['Overflowing bin at Deccan Gymkhana', 'The public bin near the bus stop has been overflowing since yesterday evening.', 'garbage/waste', 'Triaged', 'Ward 12', 1, 7, 3, false, 2, 'Waste is affecting a busy pedestrian corridor.', [18.5168, 73.8412], 0.91, { fixed: 0, notFixed: 0, unsure: 0 }],
  ['Dark stretch by JM Road bus stop', 'Three streetlights are out along the footpath between the stop and the crossing.', 'streetlight/electrical', 'In Progress', 'Ward 12', 5, 23, 2, false, 5, 'Low visibility at a transit stop raises evening safety concerns.', [18.5234, 73.8435], 0.94, { fixed: 0, notFixed: 0, unsure: 0 }],
  ['Drainage overflow at Station Road', 'Wastewater is backing up onto the pavement after the afternoon showers.', 'drainage/sewage', 'Open', 'Ward 11', 45, 32, 1, true, 3, 'Long-standing standing water creates sanitation and access hazards.', [18.5316, 73.8584], 0.89, { fixed: 0, notFixed: 0, unsure: 0 }],
  ['Low water pressure on Apte Road', 'Residents on the upper floors have had very low water pressure for two mornings.', 'water supply', 'Assigned', 'Ward 12', 2, 11, 4, false, 4, 'Multiple households report disrupted essential water access.', [18.5161, 73.8349], 0.82, { fixed: 0, notFixed: 0, unsure: 0 }],
  ['Uncollected waste near FC Road', 'Several bags have been left beside the collection point since the weekend.', 'garbage/waste', 'Claimed Resolved', 'Ward 12', 8, 14, 3, false, 2, 'Dense pedestrian activity makes timely collection important.', [18.5238, 73.8418], 0.88, { fixed: 3, notFixed: 1, unsure: 0 }],
  ['Loose paving outside Pune station', 'Broken paving blocks are creating an uneven path close to the east entrance.', 'pothole/road', 'Reopened', 'Ward 11', 12, 28, 1, true, 3, 'A reported repair has not held and the surface remains a trip hazard.', [18.5289, 73.8744], 0.84, { fixed: 1, notFixed: 2, unsure: 0 }],
  ['Stray dog shelter needed on Prabhat Road', 'A small group of dogs is sheltering beside the school gate and needs a welfare check.', 'stray animals', 'Open', 'Ward 14', 6, 9, 4, false, 5, 'A school entrance needs a timely, humane animal-welfare response.', [18.5147, 73.8296], 0.76, { fixed: 0, notFixed: 0, unsure: 0 }],
  ['Footpath encroachment at Laxmi Road', 'Temporary stalls are blocking the accessible route beside the crossing.', 'encroachment', 'In Progress', 'Ward 11', 9, 17, 2, false, 6, 'Blocked footpath access affects wheelchair users and pedestrians.', [18.5154, 73.8554], 0.79, { fixed: 0, notFixed: 0, unsure: 0 }],
  ['Pothole cluster near Nal Stop', 'Two large road depressions have collected water near the junction turn.', 'pothole/road', 'Assigned', 'Ward 14', 4, 21, 1, false, 3, 'Junction traffic and pooled water increase collision risk.', [18.5074, 73.8328], 0.93, { fixed: 0, notFixed: 0, unsure: 0 }],
  ['Overflowing bin at Sambhaji Park', 'The litter bin is full and loose waste is spreading into the garden path.', 'garbage/waste', 'Verified Fixed', 'Ward 12', 10, 12, 3, false, 2, 'Public-space cleanliness issue; remediation verified by nearby residents.', [18.5201, 73.8479], 0.92, { fixed: 5, notFixed: 0, unsure: 1 }],
  ['Sewage odour near Karve Road', 'A roadside drain is emitting a strong odour and appears partially blocked.', 'drainage/sewage', 'Open', 'Ward 14', 7, 15, 1, true, 3, 'Persistent exposure in a residential lane suggests drainage needs inspection.', [18.5018, 73.8291], 0.86, { fixed: 0, notFixed: 0, unsure: 0 }],
  ['Streetlight out on Bhandarkar Road', 'The lamp opposite the clinic has not switched on for four nights.', 'streetlight/electrical', 'Triaged', 'Ward 12', 2, 6, 2, false, 5, 'Darkness near a healthcare entrance affects pedestrian safety.', [18.5194, 73.8351], 0.96, { fixed: 0, notFixed: 0, unsure: 0 }],
  ['Water leak at Model Colony lane 4', 'Water is seeping through a road-side valve box and pooling near the corner.', 'water supply', 'Claimed Resolved', 'Ward 12', 6, 8, 4, false, 4, 'A visible leak may waste treated water and damage the pavement.', [18.5292, 73.8386], 0.81, { fixed: 2, notFixed: 0, unsure: 1 }],
  ['Loose cattle near Market Yard crossing', 'Two cattle have been wandering into the road at peak traffic time.', 'stray animals', 'Assigned', 'Ward 15', 1, 13, 4, false, 5, 'Roadside animal movement at a busy crossing creates immediate risk.', [18.4944, 73.8721], 0.74, { fixed: 0, notFixed: 0, unsure: 0 }],
  ['Broken footpath at Aundh ITI Road', 'Raised concrete slabs are difficult to pass with a stroller or wheelchair.', 'pothole/road', 'Open', 'Ward 15', 16, 19, 2, true, 7, 'An accessibility barrier has remained unresolved for over two weeks.', [18.5584, 73.8077], 0.88, { fixed: 0, notFixed: 0, unsure: 0 }],
  ['Garbage pile near Kothrud depot', 'A mixed-waste pile is accumulating at the edge of the bus depot entrance.', 'garbage/waste', 'Reopened', 'Ward 14', 14, 26, 3, true, 2, 'Collection recurred but the reported site is already accumulating waste again.', [18.5079, 73.8073], 0.91, { fixed: 1, notFixed: 3, unsure: 0 }],
  ['Blocked drain on Ghole Road', 'Leaves and plastic are covering the stormwater inlet near the corner shop.', 'drainage/sewage', 'In Progress', 'Ward 12', 3, 10, 1, false, 3, 'A blocked inlet before rainfall can cause waterlogging.', [18.5211, 73.8515], 0.83, { fixed: 0, notFixed: 0, unsure: 0 }],
  ['Illegal dumping by Mula river path', 'Construction debris has narrowed the public walking path by the river.', 'encroachment', 'Open', 'Ward 15', 22, 31, 2, true, 6, 'The obstruction narrows a popular path and has persisted for several weeks.', [18.5632, 73.8071], 0.72, { fixed: 0, notFixed: 0, unsure: 0 }],
  ['Damaged traffic sign at Alka Chowk', 'The direction sign is tilted and difficult to read from the turn lane.', 'other', 'Triaged', 'Ward 11', 4, 5, 3, false, 5, 'A damaged wayfinding sign at a complex junction needs maintenance.', [18.5159, 73.8502], 0.77, { fixed: 0, notFixed: 0, unsure: 0 }],
  ['Low water flow near Baner Gaon', 'Several homes on the lane report intermittent supply in the morning window.', 'water supply', 'Open', 'Ward 15', 11, 16, 4, true, 4, 'Intermittent supply affects several households in the same block.', [18.5657, 73.7783], 0.85, { fixed: 0, notFixed: 0, unsure: 0 }],
  ['Streetlight flickering at Sarasbaug', 'A lamp on the garden perimeter turns off and on throughout the evening.', 'streetlight/electrical', 'Verified Fixed', 'Ward 11', 18, 11, 2, false, 5, 'Intermittent lighting was repaired and confirmed by community feedback.', [18.5029, 73.8553], 0.90, { fixed: 4, notFixed: 0, unsure: 0 }],
  ['Uncovered manhole at Erandwane', 'A drain cover is missing beside the footpath near the signal.', 'drainage/sewage', 'Open', 'Ward 14', 1, 24, 1, false, 2, 'An uncovered opening is an urgent hazard on a pedestrian route.', [18.5051, 73.8257], 0.95, { fixed: 0, notFixed: 0, unsure: 0 }],
  ['Roadside litter near Nal Stop', 'Loose cups and wrappers have gathered near the shelter after evening traffic.', 'garbage/waste', 'Assigned', 'Ward 14', 5, 8, 3, false, 2, 'A transit stop needs routine waste collection and a site check.', [18.5079, 73.8336], 0.80, { fixed: 0, notFixed: 0, unsure: 0 }],
  ['Broken ramp at Deccan bridge', 'The kerb ramp is chipped and has a steep uneven transition at the crossing.', 'pothole/road', 'Claimed Resolved', 'Ward 12', 9, 20, 2, false, 4, 'Access improvement is awaiting citizen verification after repair evidence.', [18.5165, 73.8471], 0.86, { fixed: 3, notFixed: 1, unsure: 0 }],
];

const statusTrail: Record<IssueStatus, IssueStatus[]> = {
  Open: ['Open'],
  Triaged: ['Open', 'Triaged'],
  Assigned: ['Open', 'Triaged', 'Assigned'],
  'In Progress': ['Open', 'Triaged', 'Assigned', 'In Progress'],
  'Claimed Resolved': ['Open', 'Triaged', 'Assigned', 'In Progress', 'Claimed Resolved'],
  'Verified Fixed': ['Open', 'Triaged', 'Assigned', 'In Progress', 'Claimed Resolved', 'Verified Fixed'],
  Reopened: ['Open', 'Triaged', 'Assigned', 'In Progress', 'Claimed Resolved', 'Reopened'],
};

export const issues: Issue[] = rows.map((row, index) => {
  const [title, description, category, status, ward, ageInDays, supporters, priority, slaBreach, slaDeadlineDays, urgencyExplanation, position, aiConfidence, verificationVotes] = row;
  const id = `ND-${104 + index}`;
  const age = ageInDays === 0 ? '2 hours ago' : ageInDays === 1 ? '1 day ago' : `${ageInDays} days ago`;
  const createdAt = new Date(Date.now() - ageInDays * 86400000).toISOString();
  return {
    id, title, description, category, status, ward, age, ageInDays, supporters, priority,
    position, createdAt, urgencyExplanation, aiConfidence, slaBreach, slaDeadlineDays,
    reopenCount: status === 'Reopened' ? 1 : 0, verificationVotes,
    proofSubmitted: ['Claimed Resolved', 'Verified Fixed', 'Reopened'].includes(status),
    department: {
      'pothole/road': 'Roads Department', 'garbage/waste': 'Solid Waste Management',
      'drainage/sewage': 'Drainage & Water', 'water supply': 'Drainage & Water',
      'streetlight/electrical': 'Electrical Department', 'stray animals': 'Animal Welfare',
      encroachment: 'Civic Works', other: 'Civic Works',
    }[category],
    assignedOfficer: ['Triaged', 'Assigned', 'In Progress', 'Claimed Resolved', 'Verified Fixed'].includes(status) ? ['Priya Nair', 'Arun Kulkarni', 'Meera Shah'][index % 3] : undefined,
  };
});

export const statusEvents: StatusEvent[] = issues.flatMap((issue, index) => {
  const trail = statusTrail[issue.status];
  return trail.map((toStatus, step) => ({
    id: `${issue.id}-E${step + 1}`,
    issueId: issue.id,
    fromStatus: step === 0 ? null : trail[step - 1],
    toStatus,
    actor: step === 0 ? ['Neel Deshmukh', 'Asha Patil', 'Rohan Joshi'][index % 3] : (issue.assignedOfficer ?? 'CivicLens system'),
    actorRole: step === 0 ? 'citizen' as const : toStatus === 'Verified Fixed' ? 'system' as const : 'officer' as const,
    timestamp: new Date(Date.now() - Math.max(1, issue.ageInDays - step) * 86400000).toISOString(),
    reason: step === 0 ? 'New community report submitted' : step === trail.length - 1 ? issue.urgencyExplanation : undefined,
  }));
});

export const scorecards: ScorecardSnapshot[] = [
  { ward: 'Ward 11', department: 'Roads Department', totalIssues: 142, resolvedIssues: 103, slaCompliance: 76, medianResolutionDays: 3.4, reopenRate: 11, activeIssues: 39, period: 'Last 30 days' },
  { ward: 'Ward 11', department: 'Solid Waste Management', totalIssues: 118, resolvedIssues: 94, slaCompliance: 82, medianResolutionDays: 2.1, reopenRate: 8, activeIssues: 24, period: 'Last 30 days' },
  { ward: 'Ward 12', department: 'Roads Department', totalIssues: 186, resolvedIssues: 139, slaCompliance: 78, medianResolutionDays: 3.2, reopenRate: 12, activeIssues: 47, period: 'Last 30 days' },
  { ward: 'Ward 12', department: 'Solid Waste Management', totalIssues: 154, resolvedIssues: 127, slaCompliance: 88, medianResolutionDays: 1.8, reopenRate: 6, activeIssues: 27, period: 'Last 30 days' },
  { ward: 'Ward 14', department: 'Roads Department', totalIssues: 127, resolvedIssues: 91, slaCompliance: 73, medianResolutionDays: 4.1, reopenRate: 13, activeIssues: 36, period: 'Last 30 days' },
  { ward: 'Ward 14', department: 'Drainage & Water', totalIssues: 99, resolvedIssues: 75, slaCompliance: 80, medianResolutionDays: 3.7, reopenRate: 9, activeIssues: 24, period: 'Last 30 days' },
  { ward: 'Ward 15', department: 'Roads Department', totalIssues: 136, resolvedIssues: 98, slaCompliance: 75, medianResolutionDays: 3.8, reopenRate: 10, activeIssues: 38, period: 'Last 30 days' },
  { ward: 'Ward 15', department: 'Solid Waste Management', totalIssues: 108, resolvedIssues: 86, slaCompliance: 85, medianResolutionDays: 2.3, reopenRate: 7, activeIssues: 22, period: 'Last 30 days' },
];

export const predictions: Prediction[] = issues.slice(0, 14).flatMap((issue, index) => [
  { issueId: issue.id, module: 'M1', prediction: issue.category, confidence: issue.aiConfidence, status: 'Accepted', model: 'M1 v0.3', timestamp: index < 3 ? '2h ago' : `${index + 1}h ago`, explanation: `Image and text signals support ${issue.category}; location context is consistent with Pune civic service zones.` },
  { issueId: issue.id, module: 'M2', prediction: issue.department, confidence: Math.min(0.99, issue.aiConfidence + 0.05), status: index === 2 ? 'Corrected' : 'Accepted', model: 'M2 v0.1', timestamp: index < 3 ? '2h ago' : `${index + 2}h ago`, explanation: `Department recommendation derived from category-to-service mapping and ward coverage.` },
]).concat([
  { issueId: 'ND-109', module: 'M5', prediction: 'Possible image reuse', confidence: 0.73, status: 'Needs review', model: 'M5 v0.2', timestamp: '5h ago', explanation: 'After-image has perceptual overlap with a previously submitted image; manual review recommended.' },
  { issueId: 'ND-111', module: 'M3', prediction: 'ND-119 may be a duplicate', confidence: 0.85, status: 'Accepted', model: 'M3 v0.4', timestamp: '6h ago', explanation: 'Spatial proximity, language similarity, and category match exceed the review threshold.' },
]) as Prediction[];

export const duplicatePairs: DuplicatePair[] = [
  { issueA: 'ND-104', issueB: 'ND-119', distance: 120, textSimilarity: 0.78, categoryMatch: true, score: 0.85, outcome: 'Confirmed' },
  { issueA: 'ND-113', issueB: 'ND-127', distance: 84, textSimilarity: 0.71, categoryMatch: true, score: 0.82, outcome: 'Pending' },
  { issueA: 'ND-108', issueB: 'ND-121', distance: 430, textSimilarity: 0.69, categoryMatch: false, score: 0.58, outcome: 'Rejected' },
  { issueA: 'ND-116', issueB: 'ND-122', distance: 205, textSimilarity: 0.88, categoryMatch: true, score: 0.91, outcome: 'Pending' },
];

export const ledgerEvents = statusEvents.slice().reverse().map((event, index) => ({
  seq: statusEvents.length - index,
  issueId: event.issueId,
  action: `${event.fromStatus ?? '—'} → ${event.toStatus}`,
  actor: event.actorRole === 'officer' ? 'Officer' : event.actorRole === 'citizen' ? 'Citizen' : 'System',
  timestamp: event.timestamp,
  reason: event.reason ?? (event.fromStatus ? 'Status updated' : 'New report'),
  hash: `${(event.issueId + event.id + event.timestamp).split('').reduce((acc, char) => ((acc * 31 + char.charCodeAt(0)) >>> 0), 2166136261).toString(16).padStart(8, 'a').repeat(4)}`,
}));

export const weeklyMetrics = [
  { week: 'W1', filed: 82, resolved: 66, days: 4.4 }, { week: 'W2', filed: 94, resolved: 73, days: 4.1 },
  { week: 'W3', filed: 88, resolved: 77, days: 3.8 }, { week: 'W4', filed: 106, resolved: 89, days: 3.6 },
  { week: 'W5', filed: 118, resolved: 93, days: 3.9 }, { week: 'W6', filed: 102, resolved: 99, days: 3.4 },
  { week: 'W7', filed: 125, resolved: 108, days: 3.2 }, { week: 'W8', filed: 119, resolved: 115, days: 3.1 },
  { week: 'W9', filed: 134, resolved: 117, days: 3.3 }, { week: 'W10', filed: 127, resolved: 122, days: 2.9 },
  { week: 'W11', filed: 141, resolved: 129, days: 2.7 }, { week: 'W12', filed: 146, resolved: 138, days: 2.6 },
];

export const demoNotifications = [
  { title: 'Issue ND-104 status changed', body: '“Pothole near market” moved to In Progress by an officer.', time: '2 hours ago', kind: 'status', unread: true, issueId: 'ND-104' },
  { title: 'Verification needed', body: '“Overflowing bin” was claimed resolved. Vote on whether it is fixed.', time: '5 hours ago', kind: 'verification', unread: true, issueId: 'ND-109' },
  { title: 'Community activity', body: '3 neighbours supported your issue “Dark stretch by bus stop”.', time: 'Yesterday', kind: 'community', unread: false, issueId: 'ND-106' },
  { title: 'New report in Ward 12', body: 'An issue near Deccan Gymkhana was added to the public map.', time: 'Yesterday', kind: 'status', unread: false, issueId: 'ND-105' },
];
