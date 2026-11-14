import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Camera, FileCheck2 } from "lucide-react";
import { issues as seedIssues } from "../../data/seed";
import { issuesApi } from "../../lib/api";
import { DemoNote, PageHeader, Panel } from "../../components/shared/Primitives";

export function VerificationVote() {
  const { id = "ND-109" } = useParams();
  const issue = seedIssues.find(item => item.id === id) || seedIssues[5];
  const [vote, setVote] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<{
    fixed: number;
    notFixed: number;
    unsure: number;
    total: number;
  } | null>(null);

  const choices = [
    ["fixed", "\u2713", "Yes, fixed", "bg-[#4F5B2A] text-white"],
    ["not_fixed", "x", "Not fixed", "bg-[#B8892D] text-white"],
    ["unsure", "?", "Unsure", "bg-[#FDFBF7] text-[#2A3320]"],
  ] as const;

  const handleVote = async (key: "fixed" | "not_fixed" | "unsure") => {
    if (submitting || vote) return;
    setVote(key);
    setSubmitting(true);
    try {
      const result = await issuesApi.verify(id, key);
      setSummary(
        result.summary as {
          fixed: number;
          notFixed: number;
          unsure: number;
          total: number;
        }
      );
      toast.success("Vote recorded and linked to the audit chain.");
    } catch (e: any) {
      toast.error(e.message || "Vote could not be recorded");
      setVote(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to={`/citizen/issue/${issue.id}`}
        className="mb-4 inline-flex min-h-[40px] items-center gap-2 text-xs font-black uppercase text-[#4F5B2A] hover:underline sm:text-[10px]"
      >
        <ArrowLeft size={15} />
        Back to issue
      </Link>
      <PageHeader
        eyebrow={`Verification · ${issue.id}`}
        title="Verify this fix"
        description={issue.title}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {["Before · Citizen report", "After · Officer evidence"].map(
          (label, index) => (
            <Panel key={label} className="border-2 !p-0 md:border-4">
              <div className="flex h-48 items-center justify-center bg-[#D8C9A8]/50 sm:h-52">
                {index ? <FileCheck2 size={45} /> : <Camera size={45} />}
              </div>
              <p className="border-t-2 border-[#2A3320] bg-[#2A3320] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white sm:border-t-4 sm:text-[9px]">
                {label}
              </p>
            </Panel>
          )
        )}
      </div>
      <Panel className="mt-5 border-2 bg-[#D8C9A8]/30 md:border-4">
        <p className="eyebrow">Officer resolution note</p>
        <p className="mt-2 text-sm leading-relaxed">
          The reported civic issue has been attended to. Please verify whether
          the public impact has been resolved.
        </p>
      </Panel>
      <section className="mt-7">
        <h2 className="display-title text-center text-xl">
          Based on the evidence, is this issue fixed?
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {choices.map(([key, icon, label, style]) => (
            <button
              key={key}
              disabled={submitting || !!vote}
              onClick={() => handleVote(key)}
              className={`flex min-h-[96px] flex-col items-center justify-center border-2 border-[#2A3320] p-4 shadow-[4px_4px_0px_0px_#2A3320] transition-transform hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-36 sm:border-4 sm:p-5 sm:shadow-[6px_6px_0px_0px_#2A3320] ${style} ${vote === key ? "outline outline-4 outline-[#B8892D]" : ""}`}
            >
              <span className="display-title text-2xl sm:text-3xl">{icon}</span>
              <span className="mt-2 text-xs font-black uppercase tracking-widest sm:mt-3 sm:text-[10px]">
                {label}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-5 text-center text-xs leading-relaxed text-[#2A3320]/65">
          If 2 or more nearby citizens vote "not fixed", the issue will be
          automatically reopened. One vote per person per proof submission.
        </p>
      </section>
      {summary && (
        <Panel className="mt-5 border-2 border-[#4F5B2A] bg-[#4F5B2A]/10 md:border-4">
          <p className="eyebrow">Live vote tally</p>
          <div className="mt-3 grid grid-cols-3 text-center">
            <div>
              <p className="display-title text-2xl">{summary.fixed}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest sm:text-[9px]">
                Fixed
              </p>
            </div>
            <div>
              <p className="display-title text-2xl">{summary.notFixed}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest sm:text-[9px]">
                Not fixed
              </p>
            </div>
            <div>
              <p className="display-title text-2xl">{summary.unsure}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest sm:text-[9px]">
                Unsure
              </p>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-[#2A3320]/60 sm:text-[10px]">
            {summary.total} total votes · 2 "not fixed" triggers auto-reopen
          </p>
        </Panel>
      )}
      <DemoNote />
    </div>
  );
}
