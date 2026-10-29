export interface PuneLocality {
  name: string;
  ward: string;
  lat: number;
  lng: number;
}

export const PUNE_LOCALITIES: PuneLocality[] = [
  { name: 'Kondhwa', ward: 'Ward 15', lat: 18.4735, lng: 73.8940 },
  { name: 'Katraj', ward: 'Ward 15', lat: 18.4550, lng: 73.8600 },
  { name: 'Bibvewadi', ward: 'Ward 15', lat: 18.4780, lng: 73.8600 },
  { name: 'Dhankawadi', ward: 'Ward 15', lat: 18.4660, lng: 73.8520 },
  { name: 'Hadapsar', ward: 'Ward 15', lat: 18.5089, lng: 73.9259 },
  { name: 'Magarpatta', ward: 'Ward 15', lat: 18.5150, lng: 73.9300 },
  { name: 'Wanowrie', ward: 'Ward 15', lat: 18.4900, lng: 73.8950 },
  { name: 'Kothrud', ward: 'Ward 14', lat: 18.5074, lng: 73.8077 },
  { name: 'Karve Nagar', ward: 'Ward 14', lat: 18.4850, lng: 73.8150 },
  { name: 'Warje', ward: 'Ward 14', lat: 18.4750, lng: 73.7950 },
  { name: 'Erandwane', ward: 'Ward 14', lat: 18.5051, lng: 73.8257 },
  { name: 'Sinhagad Road', ward: 'Ward 14', lat: 18.4600, lng: 73.8200 },
  { name: 'Shivaji Nagar', ward: 'Ward 12', lat: 18.5302, lng: 73.8471 },
  { name: 'Deccan Gymkhana', ward: 'Ward 12', lat: 18.5168, lng: 73.8412 },
  { name: 'Model Colony', ward: 'Ward 12', lat: 18.5292, lng: 73.8386 },
  { name: 'FC Road', ward: 'Ward 12', lat: 18.5238, lng: 73.8418 },
  { name: 'Pune Station', ward: 'Ward 11', lat: 18.5289, lng: 73.8744 },
  { name: 'Camp', ward: 'Ward 11', lat: 18.5130, lng: 73.8770 },
  { name: 'Swargate', ward: 'Ward 11', lat: 18.5010, lng: 73.8580 },
  { name: 'Kasba Peth', ward: 'Ward 11', lat: 18.5180, lng: 73.8560 },
  { name: 'Aundh', ward: 'Ward 15', lat: 18.5584, lng: 73.8077 },
  { name: 'Baner', ward: 'Ward 15', lat: 18.5657, lng: 73.7783 },
  { name: 'Balewadi', ward: 'Ward 15', lat: 18.5750, lng: 73.7650 },
  { name: 'Pashan', ward: 'Ward 15', lat: 18.5400, lng: 73.7900 },
  { name: 'Kalyani Nagar', ward: 'Ward 12', lat: 18.5460, lng: 73.9030 },
  { name: 'Viman Nagar', ward: 'Ward 12', lat: 18.5665, lng: 73.9125 },
  { name: 'Yerawada', ward: 'Ward 12', lat: 18.5520, lng: 73.8850 },
  { name: 'Koregaon Park', ward: 'Ward 12', lat: 18.5360, lng: 73.8940 },
  { name: 'Wakad', ward: 'Ward 15', lat: 18.5980, lng: 73.7650 },
  { name: 'Hinjawadi', ward: 'Ward 15', lat: 18.5910, lng: 73.7380 },
];

export function getNearestPuneLocality(lat: number, lng: number): PuneLocality {
  let closest = PUNE_LOCALITIES[0];
  let minDistance = Infinity;

  for (const loc of PUNE_LOCALITIES) {
    const dLat = (lat - loc.lat) * 111;
    const dLng = (lng - loc.lng) * 111 * Math.cos((lat * Math.PI) / 180);
    const distSq = dLat * dLat + dLng * dLng;
    if (distSq < minDistance) {
      minDistance = distSq;
      closest = loc;
    }
  }

  return closest;
}

export function formatIssueTitle(category: string, locality: PuneLocality): string {
  const categoryTitles: Record<string, string> = {
    'pothole/road': `Pothole and road issue in ${locality.name}`,
    'garbage/waste': `Waste and garbage issue in ${locality.name}`,
    'drainage/sewage': `Drainage and sewage issue in ${locality.name}`,
    'water supply': `Water supply issue in ${locality.name}`,
    'streetlight/electrical': `Streetlight issue in ${locality.name}`,
    'stray animals': `Stray animal concern in ${locality.name}`,
    encroachment: `Footpath encroachment in ${locality.name}`,
    other: `Civic issue in ${locality.name}`,
  };

  return categoryTitles[category] || `Civic issue in ${locality.name}`;
}

