import { classify } from '../server/routes/ai.js';
import { predictCategory } from '../server/ai/rules.js';
import type { IssueInferenceContext } from '../server/ai/contracts.js';

interface TestCase {
  query: string;
  expected: string;
  type: 'image_filename' | 'english_description' | 'marathi_bilingual' | 'edge_noise';
}

const dataset: TestCase[] = [
  // 1. Pothole / Road
  { query: 'pothole_asphalt_crack_road_hazard.jpg', expected: 'pothole/road', type: 'image_filename' },
  { query: 'broken_tar_road_pavement_crater.png', expected: 'pothole/road', type: 'image_filename' },
  { query: 'large manhole open on main road near bus stand', expected: 'pothole/road', type: 'english_description' },
  { query: 'severe speed bump damage causing vehicle accidents', expected: 'pothole/road', type: 'english_description' },
  { query: 'रस्ता खराब झाला आहे आणि मोठा खड्डा पडला आहे', expected: 'pothole/road', type: 'marathi_bilingual' },
  { query: 'footpath stones broken and pavement damaged', expected: 'pothole/road', type: 'english_description' },
  { query: 'mg_road_deep_pothole_traffic_jam.jpeg', expected: 'pothole/road', type: 'image_filename' },
  { query: 'tar surface peeling off after heavy rain', expected: 'pothole/road', type: 'english_description' },

  // 2. Garbage / Waste
  { query: 'overflowing_garbage_dump_street.png', expected: 'garbage/waste', type: 'image_filename' },
  { query: 'waste_bin_spillover_residential.jpg', expected: 'garbage/waste', type: 'image_filename' },
  { query: 'uncollected trash accumulating for two weeks foul smell', expected: 'garbage/waste', type: 'english_description' },
  { query: 'plastic litter and rubbish scattered around the park', expected: 'garbage/waste', type: 'english_description' },
  { query: 'गल्लीत भरपूर कचरा साचला आहे दुर्गंधी पसरली आहे', expected: 'garbage/waste', type: 'marathi_bilingual' },
  { query: 'dirty public dustbin overflowing on pedestrian walk', expected: 'garbage/waste', type: 'english_description' },
  { query: 'commercial dump yard spreading waste across neighbourhood', expected: 'garbage/waste', type: 'english_description' },
  { query: 'solid_waste_dumping_site_near_school.jpeg', expected: 'garbage/waste', type: 'image_filename' },

  // 3. Drainage / Sewage
  { query: 'blocked_drain_sewage_waterlogging.jpeg', expected: 'drainage/sewage', type: 'image_filename' },
  { query: 'open_sewer_overflow_monsoon.png', expected: 'drainage/sewage', type: 'image_filename' },
  { query: 'drainage pipeline choked dirty water entering ground floor', expected: 'drainage/sewage', type: 'english_description' },
  { query: 'stagnant sewage water breeding mosquitoes after rain flood', expected: 'drainage/sewage', type: 'english_description' },
  { query: 'गटार तुंबले असून नाला भरून वाहतोय पाणी तुंबले', expected: 'drainage/sewage', type: 'marathi_bilingual' },
  { query: 'manhole sewage blockage spilling into street', expected: 'drainage/sewage', type: 'english_description' },
  { query: 'stormwater drain blockage causing street flood', expected: 'drainage/sewage', type: 'english_description' },
  { query: 'underground sewer line backflow odor issue', expected: 'drainage/sewage', type: 'english_description' },

  // 4. Water Supply
  { query: 'water_pipeline_leak_low_pressure.jpg', expected: 'water supply', type: 'image_filename' },
  { query: 'broken_municipal_tap_gushing_water.png', expected: 'water supply', type: 'image_filename' },
  { query: 'no drinking water supply in our colony since yesterday', expected: 'water supply', type: 'english_description' },
  { query: 'underground main pipe leak wasting clean tap water', expected: 'water supply', type: 'english_description' },
  { query: 'पाणी पुरवठा बंद आहे आणि पाईप फुटला आहे', expected: 'water supply', type: 'marathi_bilingual' },
  { query: 'severe drinking water shortage and muddy contamination', expected: 'water supply', type: 'english_description' },
  { query: 'low water pressure on second floor apartments', expected: 'water supply', type: 'english_description' },
  { query: 'faulty supply valve causing zero water flow', expected: 'water supply', type: 'english_description' },

  // 5. Streetlight / Electrical
  { query: 'broken_streetlight_dark_pole.png', expected: 'streetlight/electrical', type: 'image_filename' },
  { query: 'hanging_electric_wire_pole_spark.jpg', expected: 'streetlight/electrical', type: 'image_filename' },
  { query: 'street lamp not working whole lane is completely dark', expected: 'streetlight/electrical', type: 'english_description' },
  { query: 'exposed power cable hanging dangerous from electric pole', expected: 'streetlight/electrical', type: 'english_description' },
  { query: 'रात्री स्ट्रीट लाईट लागत नाही अंधार पडला आहे', expected: 'streetlight/electrical', type: 'marathi_bilingual' },
  { query: 'flickering light fixture on corner street', expected: 'streetlight/electrical', type: 'english_description' },
  { query: 'transformer sparking in residential area near wire line', expected: 'streetlight/electrical', type: 'english_description' },
  { query: 'broken pole fallen on side of street', expected: 'streetlight/electrical', type: 'english_description' },

  // 6. Stray Animals
  { query: 'aggressive_stray_dog_pack.jpg', expected: 'stray animals', type: 'image_filename' },
  { query: 'cattle_wandering_traffic_hazard.png', expected: 'stray animals', type: 'image_filename' },
  { query: 'pack of stray dogs chasing school children and two wheelers', expected: 'stray animals', type: 'english_description' },
  { query: 'stray cow sitting in middle of road blocking movement', expected: 'stray animals', type: 'english_description' },
  { query: 'रस्त्यावर मोकाट कुत्रा चावला आणि जनावरे फिरत आहेत', expected: 'stray animals', type: 'marathi_bilingual' },
  { query: 'rabid animal menace in local colony park', expected: 'stray animals', type: 'english_description' },
  { query: 'monkey troop attacking food vendors and biting citizens', expected: 'stray animals', type: 'english_description' },
  { query: 'stray pig herd spreading filth in alley', expected: 'stray animals', type: 'english_description' },

  // 7. Encroachment
  { query: 'illegal_footpath_hawker_encroachment.png', expected: 'encroachment', type: 'image_filename' },
  { query: 'unauthorized_shop_stall_blocking_road.jpg', expected: 'encroachment', type: 'image_filename' },
  { query: 'hawkers occupying entire pedestrian sidewalk illegally', expected: 'encroachment', type: 'english_description' },
  { query: 'commercial construction debris dumped on public passage', expected: 'encroachment', type: 'english_description' },
  { query: 'पादचारी मार्गावर अनधिकृत अतिक्रमण केले आहे', expected: 'encroachment', type: 'marathi_bilingual' },
  { query: 'illegal permanent stall blocking residential gate entry', expected: 'encroachment', type: 'english_description' },
  { query: 'shop extension encroaching on public road width', expected: 'encroachment', type: 'english_description' },
  { query: 'vendor shed illegally constructed on municipal land', expected: 'encroachment', type: 'english_description' },

  // 8. Other / Baseline
  { query: 'random_scenery_unrecognized_photo.jpg', expected: 'other', type: 'edge_noise' },
  { query: 'general administrative enquiry regarding property tax', expected: 'other', type: 'edge_noise' },
  { query: 'sunset landscape view from balcony', expected: 'other', type: 'edge_noise' },
  { query: 'incomprehensible text without any civic vocabulary', expected: 'other', type: 'edge_noise' },
];

function runEvaluation() {
  const categories = [
    'pothole/road',
    'garbage/waste',
    'drainage/sewage',
    'water supply',
    'streetlight/electrical',
    'stray animals',
    'encroachment',
    'other',
  ];

  const confusionMatrix: Record<string, Record<string, number>> = {};
  categories.forEach((c1) => {
    confusionMatrix[c1] = {};
    categories.forEach((c2) => {
      confusionMatrix[c1][c2] = 0;
    });
  });

  const latencies: number[] = [];
  let correctCount = 0;

  for (const item of dataset) {
    const queryClean = item.query.replace(/[._-]/g, ' ');
    const t0 = performance.now();
    const result = classify(queryClean);
    const t1 = performance.now();
    latencies.push(t1 - t0);

    const predicted = result.category;
    confusionMatrix[item.expected][predicted] = (confusionMatrix[item.expected][predicted] || 0) + 1;
    if (predicted === item.expected) {
      correctCount++;
    }
  }

  // Calculate per-category Precision, Recall, F1
  const metricsPerCategory: Record<string, { precision: number; recall: number; f1: number; support: number }> = {};
  let macroPrecision = 0;
  let macroRecall = 0;
  let macroF1 = 0;

  categories.forEach((cat) => {
    const tp = confusionMatrix[cat][cat];
    let totalPred = 0;
    categories.forEach((actual) => {
      totalPred += confusionMatrix[actual][cat];
    });
    let totalActual = 0;
    categories.forEach((pred) => {
      totalActual += confusionMatrix[cat][pred];
    });

    const precision = totalPred > 0 ? tp / totalPred : 0;
    const recall = totalActual > 0 ? tp / totalActual : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    metricsPerCategory[cat] = { precision, recall, f1, support: totalActual };
    macroPrecision += precision;
    macroRecall += recall;
    macroF1 += f1;
  });

  macroPrecision /= categories.length;
  macroRecall /= categories.length;
  macroF1 /= categories.length;

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

  console.log(JSON.stringify({
    totalSamples: dataset.length,
    correctCount,
    overallAccuracy: correctCount / dataset.length,
    macroPrecision,
    macroRecall,
    macroF1,
    metricsPerCategory,
    latencies: {
      avgMs: avgLatency,
      p50Ms: p50,
      p95Ms: p95,
      p99Ms: p99,
    },
  }, null, 2));
}

runEvaluation();
