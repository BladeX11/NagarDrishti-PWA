export interface QueueFilters {
  status: string;
  category: string;
  ward: string;
}

const PRIORITY_LABELS = ["Critical", "High", "Medium", "Low"] as const;

/**
 * Normalizes a seed or API issue record for safe rendering in TriageQueue.
 */
export function formatQueueIssue(issue: any) {
  const displayId: string = issue?.publicRef || issue?.id || "—";
  const displayWard: string = issue?.ward
    ? String(issue.ward).replace(/^Ward\s*/i, "W-")
    : issue?.wardId
      ? String(issue.wardId).replace(/^ward-/i, "W-")
      : "—";
  const priorityNum =
    typeof issue?.priority === "number" &&
    issue.priority >= 1 &&
    issue.priority <= 4
      ? issue.priority
      : 3;
  const priorityLabel = PRIORITY_LABELS[priorityNum - 1];
  const supporters: number = issue?.supporterCount ?? issue?.supporters ?? 0;
  const ageDisplay: string =
    issue?.age ||
    (issue?.ageInDays !== undefined ? `${issue.ageInDays}d ago` : "Recent");
  let overdueDays = Math.max(
    1,
    (issue?.ageInDays ?? 0) - (issue?.slaDeadlineDays ?? 7)
  );
  if (issue?.slaDeadline) {
    const deadlineMs = new Date(issue.slaDeadline).getTime();
    if (!Number.isNaN(deadlineMs)) {
      overdueDays = Math.max(1, Math.floor((Date.now() - deadlineMs) / 86400000));
    }
  }

  return {
    displayId,
    displayWard,
    priorityNum,
    priorityLabel,
    supporters,
    ageDisplay,
    overdueDays,
  };
}

/**
 * Filters and sorts seed or partial API issues without throwing on missing fields.
 */
export function filterAndSortQueueIssues(
  source: any[],
  filters: QueueFilters,
  query: string,
  sort: string
) {
  const q = (query || "").trim().toLowerCase();
  const filtered = source.filter(issue => {
    const issueStatus = issue?.status || "";
    const issueCat = issue?.category || "";
    const issueTitle = (issue?.title || "").toLowerCase();
    const issuePublicRef = (issue?.publicRef || "").toLowerCase();
    const issueId = (issue?.id || "").toLowerCase();
    const issueWard = (
      issue?.ward ||
      (issue?.wardId ? `Ward ${String(issue.wardId).replace(/^ward-/i, "")}` : "")
    ).toLowerCase();

    const matchesStatus =
      filters.status === "All" || issueStatus === filters.status;
    const matchesCategory =
      filters.category === "All" || issueCat === filters.category;
    const matchesWard =
      filters.ward === "All" ||
      issueWard === filters.ward.toLowerCase() ||
      (issue?.wardId &&
        String(issue.wardId).toLowerCase() === filters.ward.toLowerCase());
    const matchesQuery =
      !q ||
      issueTitle.includes(q) ||
      issuePublicRef.includes(q) ||
      issueId.includes(q);

    return matchesStatus && matchesCategory && matchesWard && matchesQuery;
  });

  return [...filtered].sort((a: any, b: any) => {
    if (sort === "Oldest") {
      return (b?.ageInDays ?? 0) - (a?.ageInDays ?? 0);
    }
    if (sort === "Most supporters") {
      return (
        (b?.supporterCount ?? b?.supporters ?? 0) -
        (a?.supporterCount ?? a?.supporters ?? 0)
      );
    }
    if (sort === "SLA deadline") {
      return (b?.slaBreach ? 1 : 0) - (a?.slaBreach ? 1 : 0);
    }
    const timeA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return (Number.isNaN(timeB) ? 0 : timeB) - (Number.isNaN(timeA) ? 0 : timeA);
  });
}
