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

export function categoryDepartmentFor(category: Category) {
  return category === "garbage/waste"
    ? "Solid Waste Management"
    : category === "streetlight/electrical"
      ? "Electrical Department"
      : category === "water supply" || category === "drainage/sewage"
        ? "Drainage & Water"
        : "Roads Department";
}
