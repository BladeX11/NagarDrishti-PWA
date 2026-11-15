import { issues as seedIssues } from "../../data/seed";
import { loadSubmittedIssues } from "../../data/localDemo";
import type { Category, Issue } from "../../types";

export const mine = seedIssues.filter(issue =>
  [
    "ND-104",
    "ND-105",
    "ND-106",
    "ND-109",
    "ND-112",
    "ND-116",
    "ND-128",
  ].includes(issue.id)
);

export function getSubmittedReports(): Issue[] {
  return loadSubmittedIssues();
}

export const categoryNames: Record<Category, string> = {
  "pothole/road": "Roads & potholes",
  "garbage/waste": "Garbage & waste",
  "drainage/sewage": "Drainage & sewage",
  "water supply": "Water supply",
  "streetlight/electrical": "Streetlights",
  "stray animals": "Stray animals",
  encroachment: "Encroachment",
  other: "Other",
};

export const CATEGORY_DEPARTMENT_IDS: Record<Category, string> = {
  "pothole/road": "roads",
  "garbage/waste": "waste",
  "drainage/sewage": "drainage",
  "water supply": "water",
  "streetlight/electrical": "electrical",
  "stray animals": "animals",
  encroachment: "civic-works",
  other: "civic-works",
};

export const DEPARTMENT_NAMES_BY_ID: Record<string, string> = {
  roads: "Roads Department",
  waste: "Solid Waste Management",
  water: "Drainage & Water",
  drainage: "Drainage & Water",
  electrical: "Electrical Department",
  animals: "Animal Welfare",
  "civic-works": "Civic Works",
};

export function categoryDepartmentFor(category: Category): string {
  const deptId = CATEGORY_DEPARTMENT_IDS[category];
  return DEPARTMENT_NAMES_BY_ID[deptId] || "Civic Works";
}

export function normalizeWardKey(value?: string | null): string {
  if (!value) return "";
  const trimmed = value.trim().toLowerCase();
  const match = trimmed.match(/(\d+)/);
  return match ? `ward-${match[1]}` : trimmed;
}

export function formatWardLabel(
  ward?: string | null,
  wardId?: string | null,
  fallback = "Ward 12"
): string {
  const raw = (ward || wardId || "").trim();
  if (!raw) return fallback;
  const match = raw.match(/^ward[-_\s]*(\d+)$/i);
  if (match) return `Ward ${match[1]}`;
  return raw;
}

export function deriveWardFromCoords(lat: number, lng: number): string {
  if (lat >= 18.52 && lng >= 73.86) return "Ward 12";
  if (lat >= 18.52 && lng < 73.86) return "Ward 11";
  if (lat < 18.52 && lng >= 73.86) return "Ward 15";
  return "Ward 14";
}

export function getSafeMediaUrl(
  media?: { publicPath?: string | null } | null
): string | null {
  const url = media?.publicPath?.trim();
  if (!url) return null;
  return /^(https?:\/\/|\/(?!\/)|data:image\/)/i.test(url) ? url : null;
}

export function formatRelativeTime(value?: string | Date | null): string {
  if (!value) return "Recently";
  const date = value instanceof Date ? value : new Date(value);
  const ms = date.getTime();
  if (!Number.isFinite(ms)) {
    return typeof value === "string" ? value : "Recently";
  }
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays <= 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
