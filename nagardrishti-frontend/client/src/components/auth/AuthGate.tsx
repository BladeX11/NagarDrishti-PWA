import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import {
  AUTH_CHANGED_EVENT,
  ApiError,
  type AuthUser,
  authApi,
  notifyAuthReady,
} from "../../lib/api";

const ROLE_OPTIONS = [
  { value: "citizen", label: "Citizen" },
  { value: "officer", label: "Officer" },
  { value: "researcher", label: "Researcher" },
  { value: "admin", label: "Admin" },
] as const;

export interface AuthGateProps {
  children: ReactNode;
  requiredRoles?: string[];
}

export function AuthGate({ children, requiredRoles }: AuthGateProps) {
  const defaultRole = requiredRoles?.[0] ?? "citizen";
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [destination, setDestination] = useState("");
  const [code, setCode] = useState("");
  const [role, setRole] = useState(defaultRole);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [demoLoginEnabled, setDemoLoginEnabled] = useState(import.meta.env.DEV);

  useEffect(() => {
    setRole(defaultRole);
  }, [defaultRole]);

  useEffect(() => {
    let active = true;
    Promise.all([
      authApi.me().catch(() => null),
      authApi.mode().catch(() => ({ demoLoginEnabled: import.meta.env.DEV })),
    ])
      .then(([current, mode]) => {
        if (!active) return;
        setUser(current);
        setDemoLoginEnabled(mode.demoLoginEnabled);
        if (current) notifyAuthReady(current);
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    const onAuthChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ user: AuthUser | null }>).detail;
      setUser(detail?.user ?? null);
      if (!detail?.user) {
        setSent(false);
        setCode("");
        setError("");
      }
    };
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    return () => {
      active = false;
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    };
  }, []);

  if (checking)
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F5EFE3] text-[#2A3320]">
        Loading secure session...
      </div>
    );

  const hasAccess =
    !requiredRoles ||
    requiredRoles.length === 0 ||
    (user !== null && requiredRoles.includes(user.role));

  if (user && hasAccess) return <>{children}</>;

  if (user && !hasAccess) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#F5EFE3] px-4 py-6 text-[#2A3320] sm:px-5">
        <div className="w-full max-w-md border-2 border-[#2A3320] bg-[#FDFBF7] p-5 shadow-[5px_5px_0px_0px_#2A3320] sm:border-4 sm:p-6 sm:shadow-[8px_8px_0px_0px_#2A3320]">
          <p className="eyebrow">NagarDrishti access check</p>
          <h1 className="display-title mt-2 text-2xl">Switch workspace role</h1>
          <p className="mt-3 text-sm text-[#2A3320]/70">
            Signed in as <b>{user.name}</b> ({user.role}). This portal requires{" "}
            <b>{requiredRoles?.join(" or ")}</b> access.
          </p>
          {error && (
            <p className="mt-4 border-2 border-red-800 bg-red-50 p-3 text-xs font-bold text-red-800">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await authApi.logout();
                setUser(null);
                setRole(defaultRole);
              } catch (caught: unknown) {
                setError(
                  caught instanceof Error ? caught.message : "Sign out failed"
                );
              } finally {
                setBusy(false);
              }
            }}
            className="mt-6 w-full border-2 border-[#2A3320] bg-[#4F5B2A] px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-50"
          >
            {busy ? "Signing out..." : "Sign out and switch account"}
          </button>
          <div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
            <a href="/" className="underline">
              Back to home
            </a>
            <a href="/transparency" className="underline">
              Public map
            </a>
          </div>
        </div>
      </main>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (demoLoginEnabled) {
        const current = await authApi.login(role);
        setUser(current);
        return;
      }
      if (!sent) {
        await authApi.requestOtp(destination);
        setSent(true);
      } else {
        const current = await authApi.verifyOtp(
          destination,
          code,
          "email",
          role
        );
        setUser(current);
      }
    } catch (caught: unknown) {
      const message =
        caught instanceof Error ? caught.message : "Authentication failed";
      const status = caught instanceof ApiError ? caught.status : undefined;
      if (status === 403) {
        setError(
          `${message} You can change Account type below and try again.`
        );
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#F5EFE3] px-4 py-6 text-[#2A3320] sm:px-5">
      <form
        onSubmit={submit}
        className="w-full max-w-md border-2 border-[#2A3320] bg-[#FDFBF7] p-5 shadow-[5px_5px_0px_0px_#2A3320] sm:border-4 sm:p-6 sm:shadow-[8px_8px_0px_0px_#2A3320]"
      >
        <p className="eyebrow">NagarDrishti secure access</p>
        <h1 className="display-title mt-2 text-3xl">
          {demoLoginEnabled
            ? "Choose your workspace"
            : sent
              ? "Enter your code"
              : "Sign in with email"}
        </h1>
        <p className="mt-3 text-sm text-[#2A3320]/65">
          {demoLoginEnabled
            ? "Temporary demo access: select a role to open the dashboard. Email OTP verification will be added soon."
            : sent
              ? `We sent a six-digit code to ${destination}.`
              : "Use a verified identity to submit reports and receive status updates."}
        </p>
        {!sent && !demoLoginEnabled && (
          <label className="mt-6 block text-[10px] font-black uppercase tracking-wider">
            Email address
            <input
              required
              type="email"
              value={destination}
              onChange={event => setDestination(event.target.value)}
              className="mt-2 w-full border-2 border-[#2A3320] bg-white px-3 py-3 outline-none"
            />
          </label>
        )}
        <label className="mt-4 block text-[10px] font-black uppercase tracking-wider">
          Account type
          <select
            value={role}
            onChange={event => setRole(event.target.value)}
            className="mt-2 w-full border-2 border-[#2A3320] bg-white px-3 py-3"
          >
            {ROLE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {sent && !demoLoginEnabled && (
          <label className="mt-4 block text-[10px] font-black uppercase tracking-wider">
            Verification code
            <input
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={event => setCode(event.target.value)}
              className="mt-2 w-full border-2 border-[#2A3320] bg-white px-3 py-3 text-xl tracking-[.4em] outline-none"
            />
          </label>
        )}
        {error && (
          <p className="mt-4 border-2 border-red-800 bg-red-50 p-3 text-xs font-bold text-red-800">
            {error}
          </p>
        )}
        <button
          disabled={busy}
          className="mt-6 w-full border-2 border-[#2A3320] bg-[#4F5B2A] px-4 py-3 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-50"
        >
          {busy
            ? "Working..."
            : demoLoginEnabled
              ? "Enter dashboard"
              : sent
                ? "Verify and continue"
                : "Send verification code"}
        </button>
        {sent && !demoLoginEnabled && (
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setCode("");
              setError("");
            }}
            className="mt-3 w-full px-4 py-2 text-[10px] font-black uppercase tracking-wider underline"
          >
            Use a different email
          </button>
        )}
        <div className="mt-5 flex items-center justify-between border-t-2 border-[#E8E0D0] pt-4 text-[10px] font-black uppercase tracking-wider">
          <a href="/" className="underline">
            Back to home
          </a>
          <a href="/transparency" className="underline">
            Public map
          </a>
        </div>
      </form>
    </main>
  );
}
