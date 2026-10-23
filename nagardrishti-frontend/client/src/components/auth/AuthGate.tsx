import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { authApi } from "../../lib/api";

export function AuthGate({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<{ role: string; name: string } | null>(null);
  const [destination, setDestination] = useState("");
  const [code, setCode] = useState("");
  const [role, setRole] = useState("citizen");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const developmentRoleLogin = import.meta.env.DEV;

  useEffect(() => {
    authApi
      .me()
      .then(current => setUser(current))
      .catch(() => undefined)
      .finally(() => setChecking(false));
  }, []);
  if (checking)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5EFE3] text-[#2A3320]">
        Loading secure session…
      </div>
    );
  if (user) return <>{children}</>;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (developmentRoleLogin) {
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
    } catch (caught: any) {
      setError(caught.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5EFE3] px-5 text-[#2A3320]">
      <form
        onSubmit={submit}
        className="w-full max-w-md border-4 border-[#2A3320] bg-[#FDFBF7] p-6 shadow-[8px_8px_0px_0px_#2A3320]"
      >
        <p className="eyebrow">NagarDrishti secure access</p>
        <h1 className="display-title mt-2 text-3xl">
          {developmentRoleLogin ? "Choose your workspace" : sent ? "Enter your code" : "Sign in with email"}
        </h1>
        <p className="mt-3 text-sm text-[#2A3320]/65">
          {developmentRoleLogin
            ? "Development mode: select a role to open the prototype dashboard."
            : sent
            ? `We sent a six-digit code to ${destination}.`
            : "Use a verified identity to submit reports and receive status updates."}
        </p>
        {!sent && (
          <>
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
            <label className="mt-4 block text-[10px] font-black uppercase tracking-wider">
              Account type
              <select
                value={role}
                onChange={event => setRole(event.target.value)}
                className="mt-2 w-full border-2 border-[#2A3320] bg-white px-3 py-3"
              >
                <option value="citizen">Citizen</option>
                <option value="officer">Officer</option>
              </select>
            </label>
          </>
        )}
        {sent && (
          <label className="mt-6 block text-[10px] font-black uppercase tracking-wider">
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
            ? "Working…"
            : developmentRoleLogin
              ? "Enter dashboard"
              : sent
              ? "Verify and continue"
              : "Send verification code"}
        </button>
        {sent && (
          <button
            type="button"
            onClick={() => {
              setSent(false);
              setCode("");
            }}
            className="mt-3 w-full px-4 py-2 text-[10px] font-black uppercase tracking-wider underline"
          >
            Use a different email
          </button>
        )}
      </form>
    </main>
  );
}
