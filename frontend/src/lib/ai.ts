import type { CensusData } from "@/lib/api";

const genderGuesses: Record<string, string> = {
  amin: "Female",
  amina: "Female",
  tunde: "Male",
  chioma: "Female",
  musa: "Male",
  zainab: "Female",
  emeka: "Male",
  oluwaseun: "Male",
  ayo: "Male",
  kemi: "Female",
  ade: "Male",
  ngozi: "Female",
};

export function guessGenderFromFirstName(firstName: string) {
  if (!firstName) return null;
  const normalized = firstName.trim().toLowerCase();
  for (const key of Object.keys(genderGuesses)) {
    if (normalized.startsWith(key)) {
      return genderGuesses[key];
    }
  }
  return null;
}

export function getValidationHints(record: Partial<CensusData>) {
  const hints: string[] = [];

  if (!record.household_id?.trim()) {
    hints.push("Household ID is missing. Auto-generate one to avoid duplicates.");
  }
  if (!record.first_name?.trim() || !record.last_name?.trim()) {
    hints.push("Please provide both first name and last name for accurate identity matching.");
  }
  if (record.age && !/^[0-9]{1,3}$/.test(String(record.age))) {
    hints.push("Age should be a whole number between 0 and 150.");
  }
  if (record.age && Number(record.age) > 100) {
    hints.push("This age is unusually high; please confirm it with the respondent.");
  }
  if (record.phone && !/^\+?[0-9]{10,15}$/.test(record.phone)) {
    hints.push("Phone number appears to be in an invalid format.");
  }
  if (!record.location_address?.trim() && record.gps_latitude !== null && record.gps_longitude !== null) {
    hints.push("GPS coordinates are available. Add a matching address for better location records.");
  }
  if (record.gps_latitude === null || record.gps_longitude === null) {
    hints.push("Capture GPS coordinates when possible to improve spatial analysis.");
  }
  return hints;
}

export function computeAnomalyScore(record: Partial<CensusData>) {
  let score = 0;
  if (!record.household_id?.trim()) score += 20;
  if (!record.first_name?.trim() || !record.last_name?.trim()) score += 20;
  if (!record.location_address?.trim()) score += 15;
  if (record.gps_latitude === null || record.gps_longitude === null) score += 20;
  if (record.age && Number(record.age) > 90) score += 15;
  if (record.phone && !/^\+?[0-9]{10,15}$/.test(record.phone)) score += 10;
  return Math.min(100, score);
}

export function generateInsights(records: CensusData[]) {
  if (records.length === 0) {
    return ["No records available yet. Capture data to generate AI insights."];
  }

  const total = records.length;
  const geotagged = records.filter((record) => record.gps_latitude !== null && record.gps_longitude !== null).length;
  const offline = records.filter((record) => record.submission_type !== "online").length;
  const ageGroups = records.reduce<Record<string, number>>((acc, record) => {
    const age = Number(record.age);
    const group = age <= 17 ? "0-17" : age <= 35 ? "18-35" : age <= 59 ? "36-59" : "60+";
    acc[group] = (acc[group] || 0) + 1;
    return acc;
  }, {});

  const topGroup = Object.entries(ageGroups).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unknown";
  const projectedNextWave = Math.max(total + 1, Math.round(total * 1.08));

  return [
    `AI predicts the next reporting wave could reach approximately ${projectedNextWave} records if current submission momentum continues.`,
    `${Math.round((geotagged / total) * 100)}% of records are geotagged, which supports location-driven planning.`,
    `The most represented age band is ${topGroup}. Use this to adjust follow-up questions and local service planning.`,
    `There are currently ${offline} offline records; prioritize sync for these to keep the dataset up to date.`,
  ];
}

export function getMappingRecommendation(records: CensusData[]) {
  if (records.length === 0) {
    return "No coordinate data available yet. Start collecting GPS-enabled records to get mapping recommendations.";
  }

  const onlineRecords = records.filter((record) => record.submission_type === "online");
  const offlineCount = records.length - onlineRecords.length;
  const geotaggedRecords = records.filter((record) => record.gps_latitude !== null && record.gps_longitude !== null);

  if (offlineCount > onlineRecords.length) {
    return "More than half of the records are offline. Sync field data as soon as possible for accurate mapping and hotspot analysis.";
  }

  if (geotaggedRecords.length < records.length * 0.6) {
    return "Coordinate coverage is low. Capture GPS locations for at least 60% of submissions to improve map-based analytics.";
  }

  return "Mapping coverage is healthy. Continue collecting geotagged records to surface high-priority service zones.";
}
