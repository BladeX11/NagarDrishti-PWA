import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Bell, Check, LogOut, ShieldCheck } from "lucide-react";
import { authApi, clearRole, notificationsApi } from "../../lib/api";
import { Button } from "../../components/shared/Button";
import { PageHeader, Panel } from "../../components/shared/Primitives";
import { formatRelativeTime } from "./constants";

const READ_STORAGE_KEY = "nd-read-notifications";
const LANGUAGE_STORAGE_KEY = "nd-language";
const PREFS_STORAGE_KEY = "nd-notification-prefs";
const SUPPORTED_LANGUAGES = ["English", "हिन्दी", "मराठी"] as const;

type NotificationPrefs = {
  status: boolean;
  verification: boolean;
  community: boolean;
};

type NotificationItem = {
  id: string;
  issueId: string;
  title: string;
  body: string;
  kind: string;
  time: string;
  unread: boolean;
};

function readStorageJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorageJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota or private browsing write errors.
  }
}

const FILTER_KIND_MAP: Record<string, string | null> = {
  All: null,
  "Status Updates": "status",
  Verification: "verification",
  Community: "community",
};

export function Notifications() {
  const [filter, setFilter] = useState("All");
  const [readIds, setReadIds] = useState<string[]>(() => {
    const stored = readStorageJson<unknown>(READ_STORAGE_KEY, []);
    return Array.isArray(stored)
      ? stored.filter((v): v is string => typeof v === "string")
      : [];
  });
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(() => {
    setLoading(true);
    setError(null);
    return notificationsApi
      .list()
      .then(data => {
        setItems(Array.isArray(data) ? data : []);
      })
      .catch((err: any) => {
        setItems([]);
        setError(err?.message || "Unable to load notifications.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const markRead = (id: string) => {
    setReadIds(old => {
      if (old.includes(id)) return old;
      const next = [...old, id];
      writeStorageJson(READ_STORAGE_KEY, next);
      return next;
    });
  };

  const markAllRead = () => {
    const allIds = Array.from(new Set([...readIds, ...items.map(i => i.id)]));
    setReadIds(allIds);
    writeStorageJson(READ_STORAGE_KEY, allIds);
  };

  const targetKind = FILTER_KIND_MAP[filter] ?? null;
  const filteredItems = items.filter(
    item => !targetKind || item.kind === targetKind
  );
  const hasUnread = items.some(item => item.unread && !readIds.includes(item.id));

  return (
    <div>
      <PageHeader
        eyebrow="Citizen space"
        title="Notifications"
        description="Stay on top of status changes, verification requests, and local activity."
        action={
          hasUnread ? (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllRead}
              className="min-h-[40px]"
            >
              Mark all read
            </Button>
          ) : undefined
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.keys(FILTER_KIND_MAP).map(label => (
          <button
            key={label}
            onClick={() => setFilter(label)}
            className={`min-h-[40px] border-2 border-[#2A3320] px-3 py-2 text-xs font-black uppercase tracking-wider sm:min-h-0 sm:text-[9px] ${filter === label ? "bg-[#4F5B2A] text-white" : "bg-[#FDFBF7]"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-2 border-red-800 bg-red-50 p-4 text-xs font-bold text-red-900">
          <span>{error}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void loadNotifications()}
          >
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <div className="border-2 border-[#2A3320] bg-[#FDFBF7] px-5 py-8 text-center text-xs font-bold uppercase tracking-wider text-[#2A3320]/60 md:border-4">
          Loading notifications...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="border-2 border-[#2A3320] bg-[#FDFBF7] px-5 py-10 text-center md:border-4">
          <Bell size={26} className="mx-auto text-[#2A3320]/50" />
          <p className="display-title mt-3 text-lg">
            {filter === "All"
              ? "No notifications yet"
              : `No ${filter.toLowerCase()} notifications`}
          </p>
          <p className="mt-1 text-xs text-[#2A3320]/65">
            {filter === "Community"
              ? "Community activity alerts will appear here when neighbours verify or support reports near you."
              : "Updates on your reported issues and verification requests will show up here."}
          </p>
        </div>
      ) : (
        <div className="border-2 border-[#2A3320] bg-[#FDFBF7] md:border-4">
          {filteredItems.map(item => {
            const unread = item.unread && !readIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => markRead(item.id)}
                className={`border-b-2 border-[#E8E0D0] px-4 py-4 last:border-0 sm:px-5 sm:py-5 ${unread ? "bg-[#D8C9A8]/15" : ""}`}
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
                      {formatRelativeTime(item.time)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-4">
                      {item.kind === "verification" && item.issueId && (
                        <Link
                          to={`/citizen/issue/${item.issueId}/verify`}
                          onClick={() => markRead(item.id)}
                          className="inline-flex min-h-[36px] items-center text-xs font-black uppercase tracking-wider text-[#B8892D] underline sm:text-[9px]"
                        >
                          Verify now →
                        </Link>
                      )}
                      {item.issueId && (
                        <Link
                          to={`/citizen/issue/${item.issueId}`}
                          onClick={() => markRead(item.id)}
                          className="inline-flex min-h-[36px] items-center text-xs font-black uppercase tracking-wider text-[#4F5B2A] underline sm:text-[9px]"
                        >
                          View issue →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Settings() {
  const [language, setLanguage] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved && (SUPPORTED_LANGUAGES as readonly string[]).includes(saved)) {
        return saved;
      }
    } catch {
      // Ignore storage read errors.
    }
    return "English";
  });

  const [toggles, setToggles] = useState<NotificationPrefs>(() => {
    const fallback: NotificationPrefs = {
      status: true,
      verification: true,
      community: false,
    };
    const saved = readStorageJson<Partial<NotificationPrefs>>(
      PREFS_STORAGE_KEY,
      fallback
    );
    return {
      status: typeof saved.status === "boolean" ? saved.status : fallback.status,
      verification:
        typeof saved.verification === "boolean"
          ? saved.verification
          : fallback.verification,
      community:
        typeof saved.community === "boolean"
          ? saved.community
          : fallback.community,
    };
  });

  const [profile, setProfile] = useState<{
    id: string;
    role: string;
    name: string;
  } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
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

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, value);
    } catch {
      // Ignore storage write errors.
    }
  };

  const handleToggle = (key: keyof NotificationPrefs) => {
    setToggles(old => {
      const next = { ...old, [key]: !old[key] };
      writeStorageJson(PREFS_STORAGE_KEY, next);
      return next;
    });
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await authApi.logout();
    } catch {
      clearRole();
    } finally {
      clearRole();
      toast.success("Signed out.");
      window.location.assign("/");
    }
  };

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
            {SUPPORTED_LANGUAGES.map(value => (
              <button
                key={value}
                onClick={() => handleLanguageChange(value)}
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
                  onClick={() => handleToggle(key)}
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
          <p className="eyebrow">Account &amp; session</p>
          <p className="mt-2 text-sm font-bold">
            {profile ? `${profile.name} (${profile.role})` : "Active browser session"}
          </p>
          <p className="mt-1 text-xs text-[#2A3320]/65">
            Sign out to clear your session cookie and switch roles or accounts.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              variant="outline"
              disabled={loggingOut}
              onClick={() => void handleLogout()}
              className="min-h-[44px] border-red-800 text-red-900 hover:bg-red-50"
            >
              <LogOut size={15} />
              {loggingOut ? "Signing out..." : "Log out"}
            </Button>
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
    </div>
  );
}
