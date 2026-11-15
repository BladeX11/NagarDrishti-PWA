/**
 * Unit tests for TriageQueue normalization, filtering/sorting, and SSR rendering
 * with partial API payloads.
 */

import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import {
  filterAndSortQueueIssues,
  formatQueueIssue,
} from "../client/src/pages/officer/triageQueueUtils";

vi.mock("../client/src/components/shared/MapView", () => ({
  MapView: () => null,
  WARD_CENTROIDS: {},
}));

import { TriageQueue } from "../client/src/pages/officer/OfficerPages";

describe("formatQueueIssue", () => {
  it("handles partial API payloads missing ward, priority, supporters, and age", () => {
    const formatted = formatQueueIssue({
      id: "uuid-123",
      title: "Broken drain",
      category: "drainage/sewage",
      status: "Open",
      slaBreach: true,
    });

    expect(formatted.displayId).toBe("uuid-123");
    expect(formatted.displayWard).toBe("—");
    expect(formatted.priorityNum).toBe(3);
    expect(formatted.priorityLabel).toBe("Medium");
    expect(formatted.supporters).toBe(0);
    expect(formatted.ageDisplay).toBe("Recent");
    expect(formatted.overdueDays).toBe(1);
  });

  it("normalizes wardId, publicRef, supporterCount, and priority=1", () => {
    const formatted = formatQueueIssue({
      id: "uuid-456",
      publicRef: "ND-201",
      wardId: "ward-12",
      supporterCount: 14,
      priority: 1,
      ageInDays: 10,
      slaBreach: true,
    });

    expect(formatted.displayId).toBe("ND-201");
    expect(formatted.displayWard).toBe("W-12");
    expect(formatted.priorityNum).toBe(1);
    expect(formatted.priorityLabel).toBe("Critical");
    expect(formatted.supporters).toBe(14);
    expect(formatted.ageDisplay).toBe("10d ago");
    expect(formatted.overdueDays).toBe(3);
  });

  it("clamps invalid priority values to default Medium (3)", () => {
    expect(formatQueueIssue({ priority: 0 }).priorityNum).toBe(3);
    expect(formatQueueIssue({ priority: 99 }).priorityNum).toBe(3);
    expect(formatQueueIssue({ priority: "high" }).priorityNum).toBe(3);
  });
});

describe("filterAndSortQueueIssues", () => {
  const partialIssues = [
    {
      id: "1",
      publicRef: "ND-301",
      title: "Pothole on main road",
      category: "pothole/road",
      status: "Open",
      wardId: "ward-12",
      supporterCount: 5,
      slaBreach: false,
      createdAt: "2026-11-10T10:00:00Z",
    },
    {
      id: "2",
      title: undefined,
      category: "garbage/waste",
      status: "Triaged",
      ward: "Ward 11",
      supporters: 20,
      slaBreach: true,
      ageInDays: 12,
      createdAt: undefined,
    },
  ];

  it("filters by ward across both wardId and ward formats", () => {
    const res = filterAndSortQueueIssues(
      partialIssues,
      { status: "All", category: "All", ward: "Ward 12" },
      "",
      "Newest"
    );
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe("1");
  });

  it("sorts safely across all modes even when fields are missing", () => {
    const baseFilters = { status: "All", category: "All", ward: "All" };
    expect(() =>
      filterAndSortQueueIssues(partialIssues, baseFilters, "", "Newest")
    ).not.toThrow();
    expect(() =>
      filterAndSortQueueIssues(partialIssues, baseFilters, "", "Oldest")
    ).not.toThrow();
    expect(() =>
      filterAndSortQueueIssues(partialIssues, baseFilters, "", "Most supporters")
    ).not.toThrow();
    expect(() =>
      filterAndSortQueueIssues(partialIssues, baseFilters, "", "SLA deadline")
    ).not.toThrow();

    const bySupporters = filterAndSortQueueIssues(
      partialIssues,
      baseFilters,
      "",
      "Most supporters"
    );
    expect(bySupporters[0].id).toBe("2");
  });
});

describe("TriageQueue component", () => {
  it("renders without crashing", () => {
    const html = renderToString(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(TriageQueue)
      )
    );
    expect(html).toContain("Triage queue");
  });
});
