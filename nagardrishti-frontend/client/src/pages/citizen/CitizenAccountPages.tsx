import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ShieldCheck } from "lucide-react";
import { notificationsApi } from "../../lib/api";
import { Button } from "../../components/shared/Button";
import { DemoNote, PageHeader, Panel } from "../../components/shared/Primitives";

export function Notifications() {
  const [filter, setFilter] = useState("All");
  const [read, setRead] = useState<number[]>([]);
  const [items, setItems] = useState<
    Array<{
      id: string;
      issueId: string;
      title: string;
      body: string;
      kind: string;
      time: string;
      unread: boolean;
    }>
  >([]);
  useEffect(() => {
    void notificationsApi
      .list()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);
  const filteredItems = items.filter(
    item =>
      filter === "All" ||
      item.kind === filter.toLowerCase().replace(" updates", "")
  );
  return (
    <div>
      <PageHeader
        eyebrow="Citizen space"
        title="Notifications"
        description="Stay on top of status changes, verification requests, and local activity."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {["All", "Status Updates", "Verification", "Community"].map(label => (
          <button
            key={label}
            onClick={() => setFilter(label)}
            className={`min-h-[40px] border-2 border-[#2A3320] px-3 py-2 text-xs font-black uppercase tracking-wider sm:min-h-0 sm:text-[9px] ${filter === label ? "bg-[#4F5B2A] text-white" : "bg-[#FDFBF7]"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="border-2 border-[#2A3320] bg-[#FDFBF7] md:border-4">
        {filteredItems.map((item, index) => {
          const idx = index;
          const unread = item.unread && !read.includes(idx);
          return (
            <div
              key={item.title}
              onClick={() =>
                setRead(old => (old.includes(idx) ? old : [...old, idx]))
              }
              className={`border-b-2 border-[#E8E0D0] px-4 py-4 last:border-0 sm:px-5 sm:py-5 ${unread ? "bg-[#D8C9A8]/10" : ""}`}
            >
              <div className="flex gap-3 sm:gap-4">
                <span
                  className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-[#2A3320] ${unread ? "bg-[#4F5B2A]" : "bg-white"}`}
                />
                <div className="flex-1">
                  <p className="font-black">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#2A3320]/70">
                    {item.body}
                  </p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-widest text-[#2A3320]/50 sm:text-[9px]">
                    {item.time}
                  </p>
                  {item.kind === "verification" && (
                    <Link
                      to={`/citizen/issue/${item.issueId}/verify`}
                      className="mt-3 inline-flex min-h-[36px] items-center text-xs font-black uppercase tracking-wider text-[#4F5B2A] underline sm:text-[9px]"
                    >
                      Verify now →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <DemoNote />
    </div>
  );
}

export function Settings() {
  const [language, setLanguage] = useState("English");
  const [toggles, setToggles] = useState({
    status: true,
    verification: true,
    community: false,
  });
  const privacy = [
    [
      "Identity is private",
      "Your name and contact details are never published on the public map.",
    ],
    [
      "Approximate locations",
      "Public pins are coarsened to protect your exact address.",
    ],
    [
      "Original photos stay private",
      "Only a redacted derivative may be used for public issue context.",
    ],
  ];
  return (
    <div>
      <PageHeader
        eyebrow="Citizen space"
        title="Settings"
        description="Adjust your experience and review how NagarDrishti protects your information."
      />
      <div className="space-y-4">
        <Panel className="border-2 md:border-4">
          <p className="eyebrow">Language</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {["English", "हिन्दी", "मराठी"].map(value => (
              <button
                key={value}
                onClick={() => setLanguage(value)}
                className={`min-h-[44px] min-w-28 border-2 border-[#2A3320] px-4 py-3 text-sm font-black shadow-[3px_3px_0px_0px_#2A3320] sm:border-4 sm:py-4 sm:shadow-[4px_4px_0px_0px_#2A3320] ${language === value ? "bg-[#4F5B2A] text-white" : "bg-[#FDFBF7]"}`}
              >
                {value}
                {language === value && (
                  <Check size={14} className="ml-2 inline" />
                )}
              </button>
            ))}
          </div>
        </Panel>
        <Panel className="border-2 md:border-4">
          <p className="eyebrow">Notifications</p>
          <div className="mt-3">
            {(
              [
                ["status", "Status updates"],
                ["verification", "Verification prompts"],
                ["community", "Community activity"],
              ] as const
            ).map(([key, label]) => (
              <div
                key={key}
                className="flex items-center justify-between border-b-2 border-[#E8E0D0] py-4 last:border-0"
              >
                <span className="text-sm font-bold">{label}</span>
                <button
                  aria-pressed={toggles[key]}
                  onClick={() =>
                    setToggles(old => ({ ...old, [key]: !old[key] }))
                  }
                  className={`flex h-7 w-12 items-center border-2 border-[#2A3320] p-1 ${toggles[key] ? "justify-end bg-[#4F5B2A]" : "justify-start bg-[#E8E0D0]"}`}
                >
                  <span className="h-4 w-4 border-2 border-[#2A3320] bg-white" />
                </button>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="border-2 md:border-4">
          <p className="eyebrow">Privacy</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {privacy.map(([title, desc]) => (
              <div
                key={title}
                className="border-2 border-[#2A3320] bg-[#D8C9A8]/20 p-4"
              >
                <ShieldCheck size={18} />
                <p className="mt-3 text-xs font-black uppercase tracking-wider">
                  {title}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[#2A3320]/65">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="border-2 md:border-4">
          <p className="eyebrow">About</p>
          <p className="mt-2 text-sm font-bold">
            NagarDrishti v0.1 · CivicLens Research Project
          </p>
          <p className="mt-1 text-xs text-[#2A3320]/65">
            A privacy-preserving civic issue platform.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/research">
              <Button variant="outline" className="min-h-[44px]">View documentation →</Button>
            </Link>
            <Link to="/">
              <Button variant="ghost" className="min-h-[44px]">← Back to home</Button>
            </Link>
          </div>
        </Panel>
      </div>
      <DemoNote />
    </div>
  );
}
