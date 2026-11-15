import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Camera,
  Compass,
  FileCheck2,
  ShieldCheck,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { issues as seedIssues } from "../../data/seed";
import {
  authApi,
  issuesApi,
  transparencyApi,
  type ApiIssue,
  type ScorecardData,
} from "../../lib/api";
import { Button } from "../../components/shared/Button";
import { IssueCard } from "../../components/shared/IssueCard";
import { DemoNote } from "../../components/shared/Primitives";
import { formatWardLabel } from "./constants";

export function CitizenHome() {
  const [liveIssues, setLiveIssues] = useState<ApiIssue[] | null>(null);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [issuesError, setIssuesError] = useState(false);
  const [scorecard, setScorecard] = useState<ScorecardData | null>(null);
  const [scorecardError, setScorecardError] = useState(false);
  const [profile, setProfile] = useState<{
    id: string;
    role: string;
    name: string;
    ward?: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    issuesApi
      .list({ limit: 50 })
      .then(res => {
        if (!active) return;
        setLiveIssues(res.items);
        setIssuesError(false);
      })
      .catch(() => {
        if (active) setIssuesError(true);
      })
      .finally(() => {
        if (active) setIssuesLoading(false);
      });

    transparencyApi
      .getScorecard()
      .then(data => {
        if (!active) return;
        setScorecard(data);
        setScorecardError(false);
      })
      .catch(() => {
        if (active) setScorecardError(true);
      });

    authApi
      .me()
      .then(user => {
        if (active) setProfile(user);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const displayIssues: any[] = issuesError
    ? seedIssues
    : liveIssues ?? [];
  const alerts = displayIssues.filter(
    issue => issue.status === "Claimed Resolved"
  );

  const now = new Date();
  const weekday = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
  }).format(now);
  const hour = now.getHours();
  const greeting =
    hour < 12
      ? "Good morning,"
      : hour < 17
        ? "Good afternoon,"
        : "Good evening,";
  const displayName = profile?.name?.trim() || "Citizen";
  const wardSublabel = profile?.ward
    ? `${formatWardLabel(profile.ward)} · Pune`
    : "Pune civic network";

  const snapshotStats: [string, string][] = scorecard
    ? [
        [
          scorecard.total > 0
            ? `${Math.round(((scorecard.total - scorecard.pastSLA) / scorecard.total) * 100)}%`
            : "0%",
          "SLA met",
        ],
        [
          String(Math.max(0, scorecard.total - scorecard.resolved)),
          "Active issues",
        ],
        [
          typeof (scorecard as any).medianResolutionDays === "number"
            ? `${Number((scorecard as any).medianResolutionDays).toFixed(1)}d`
            : `${Math.round(scorecard.resolutionRate)}%`,
          typeof (scorecard as any).medianResolutionDays === "number"
            ? "Avg. resolve"
            : "Resolved rate",
        ],
      ]
    : scorecardError
      ? [
          ["78%", "SLA met"],
          ["42", "Active issues"],
          ["3.2d", "Avg. resolve"],
        ]
      : [
          ["...", "SLA met"],
          ["...", "Active issues"],
          ["...", "Resolved rate"],
        ];

  const actions: [string, string, LucideIcon, string, string][] = [
    [
      "Report an issue",
      "Add a local issue to the public record",
      Camera,
      "/citizen/report",
      "bg-[#4F5B2A] text-white",
    ],
    [
      "Explore the map",
      "See what neighbours are reporting",
      Compass,
      "/citizen/explore",
      "bg-[#B8892D] text-white",
    ],
    [
      "My reports",
      "Follow issues you have raised",
      FileCheck2,
      "/citizen/my-reports",
      "bg-[#D8C9A8] text-[#2A3320]",
    ],
  ];

  return (
    <div>
      <section className="relative mb-6 overflow-hidden border-2 border-[#2A3320] bg-[#4F5B2A] px-5 py-6 text-white shadow-[4px_4px_0px_0px_#2A3320] sm:mb-8 sm:border-0 sm:border-b-4 sm:px-8 sm:shadow-none md:py-10">
        <span className="absolute right-6 top-6 h-10 w-10 rounded-full border-4 border-[#B8892D] sm:right-8 sm:top-7 sm:h-12 sm:w-12" />
        <span className="absolute right-24 top-14 hidden h-8 w-8 rotate-45 bg-[#D8C9A8] md:block" />
        <p className="mb-2 text-xs font-black uppercase tracking-[.16em] text-[#D8C9A8] sm:text-[10px] sm:tracking-[.2em]">
          {weekday} · Pune civic pulse
        </p>
        <h1 className="display-title max-w-xl text-3xl text-white sm:text-4xl">
          {greeting}
          <br />
          {displayName}.
        </h1>
        <p className="mt-2.5 text-sm font-bold text-[#D8C9A8]">{wardSublabel}</p>
        <p className="mt-1.5 text-sm text-white/85">
          Here's what's happening around you.
        </p>
        <Link to="/citizen/report" className="mt-5 block sm:hidden">
          <Button variant="gold" className="min-h-[48px] w-full text-[#2A3320]">
            Report an issue <ArrowRight size={16} />
          </Button>
        </Link>
      </section>
      <div className="mb-7 grid gap-3 sm:mb-9 sm:grid-cols-3 sm:gap-4">
        {actions.map(([title, desc, Icon, to, color], i) => (
          <Link
            key={title}
            to={to}
            className={`group relative min-h-[112px] border-2 border-[#2A3320] p-4 shadow-[4px_4px_0px_0px_#2A3320] transition-all hover:-translate-y-1 sm:min-h-44 sm:border-4 sm:p-5 sm:shadow-[6px_6px_0px_0px_#2A3320] ${i === 0 ? "hidden sm:block" : ""} ${color}`}
          >
            <Icon size={24} />
            <h2 className="display-title mt-4 text-lg sm:mt-6">{title}</h2>
            <p className="mt-1 max-w-[18rem] text-xs opacity-80">{desc}</p>
            <span className="absolute bottom-4 right-4 text-lg transition-transform group-hover:translate-x-1 sm:bottom-5 sm:right-5">
              →
            </span>
          </Link>
        ))}
      </div>
      {alerts.length > 0 && (
        <section className="mb-8 border-2 border-[#B8892D] bg-[#B8892D]/10 p-4 sm:mb-9 sm:border-4 sm:p-5 md:p-6">
          <div className="flex items-start gap-3">
            <Vote className="mt-0.5 shrink-0 text-[#B8892D]" />
            <div className="flex-1">
              <p className="display-title text-lg">
                {alerts.length} issue{alerts.length === 1 ? "" : "s"}{" "}
                {alerts.length === 1 ? "needs" : "need"} your vote
              </p>
              <p className="mt-1 text-sm text-[#2A3320]/75">
                "{alerts[0].title}" was claimed resolved. Is it fixed?
              </p>
              <Link
                to={`/citizen/issue/${alerts[0].publicRef || alerts[0].id}/verify`}
                className="mt-4 inline-block w-full sm:w-auto"
              >
                <Button variant="gold" className="min-h-[44px] w-full sm:w-auto">Verify now →</Button>
              </Link>
            </div>
          </div>
        </section>
      )}
      <div className="grid gap-8 lg:grid-cols-[1.45fr_.85fr]">
        <section>
          <div className="mb-3 flex items-end justify-between border-b-2 border-[#2A3320] pb-3 sm:border-b-4">
            <div>
              <p className="eyebrow">Your neighbourhood</p>
              <h2 className="display-title mt-1 text-xl">
                What's happening nearby
              </h2>
            </div>
            <Link
              to="/citizen/explore"
              className="inline-flex min-h-[40px] items-center text-xs font-black uppercase tracking-wider text-[#4F5B2A] hover:underline sm:text-[10px]"
            >
              View map →
            </Link>
          </div>
          {issuesError && (
            <p className="mb-2 border-2 border-[#B8892D] bg-[#B8892D]/15 px-3 py-2 text-xs font-bold text-[#2A3320]">
              Live issue feed unavailable — showing offline demo records.
            </p>
          )}
          {issuesLoading && !issuesError ? (
            <div className="border-2 border-[#2A3320] bg-[#FDFBF7] px-4 py-6 text-xs font-bold uppercase tracking-wider text-[#2A3320]/60">
              Loading nearby reports...
            </div>
          ) : displayIssues.length > 0 ? (
            <div className="divide-y-2 divide-[#E8E0D0] border-x-2 border-t-2 border-[#2A3320] bg-[#FDFBF7]">
              {displayIssues.slice(0, 3).map(issue => (
                <IssueCard key={issue.id} issue={issue} variant="compact" />
              ))}
            </div>
          ) : (
            <div className="border-2 border-[#2A3320] bg-[#FDFBF7] px-4 py-6 text-sm text-[#2A3320]/70">
              No public issues reported yet.{" "}
              <Link to="/citizen/report" className="font-bold text-[#4F5B2A] underline">
                Report the first issue
              </Link>
              .
            </div>
          )}
        </section>
        <section>
          <div className="mb-3 border-b-4 border-[#2A3320] pb-3">
            <p className="eyebrow">At a glance</p>
            <h2 className="display-title mt-1 text-xl">
              {scorecard ? "Civic snapshot" : "Ward 12 snapshot"}
            </h2>
          </div>
          <div className="grid grid-cols-3 border-4 border-[#2A3320] bg-[#D8C9A8]">
            {snapshotStats.map(([v, l]) => (
              <div
                key={l}
                className="border-r-2 border-[#2A3320] p-4 last:border-r-0"
              >
                <p className="display-title text-2xl">{v}</p>
                <p className="mt-1 text-[9px] font-black uppercase tracking-widest">
                  {l}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[9px] font-bold uppercase tracking-wider text-[#2A3320]/50">
            {scorecard
              ? "Live database snapshot · Pune civic network"
              : scorecardError
                ? "Fallback demo data · Live scorecard unavailable"
                : "Loading live scorecard..."}
          </p>
          <div className="mt-5 border-2 border-[#2A3320] bg-[#FDFBF7] p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} />
              <p className="text-[10px] font-black uppercase tracking-wider">
                Privacy by design
              </p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#2A3320]/65">
              ⌖ Public pins are coarsened. Your identity stays private.
            </p>
          </div>
        </section>
      </div>
      {(issuesError || scorecardError) && (
        <DemoNote>Fallback demo data · Some live metrics could not be reached</DemoNote>
      )}
    </div>
  );
}
