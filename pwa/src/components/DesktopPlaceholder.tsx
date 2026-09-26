import { Monitor, Smartphone, ArrowRight } from 'lucide-react';

/**
 * DesktopPlaceholder
 *
 * Shown to desktop visitors while the web UI is under development.
 *
 * ─── INTEGRATION GUIDE FOR WEB UI TEAMMATE ────────────────────────────────
 *
 * When the officer dashboard / public web UI is ready, replace this component
 * in one of two ways:
 *
 * Option A — Replace this whole component:
 *   In src/App.tsx, swap <DesktopPlaceholder /> with <WebApp /> (your root component).
 *   The device gate in useDeviceType will still route mobile users to the PWA.
 *
 * Option B — Separate Vite project (recommended for the dashboard):
 *   The officer/public dashboard is a separate React app (e.g. /dashboard).
 *   In that case, remove the device gate entirely from this repo and deploy
 *   the two apps on different paths behind the same reverse proxy:
 *     /          → PWA (this repo)
 *     /dashboard → Officer/public web UI
 *
 * Shared contracts between both apps:
 *   - API base: /api/v1  (FastAPI backend)
 *   - Auth: JWT Bearer tokens (same OTP flow, same role system)
 *   - Issue status enum: src/types.ts → IssueStatus
 *   - Category keys: src/types.ts → CategoryKey
 *   These types/constants can be extracted into a shared package later.
 *
 * ──────────────────────────────────────────────────────────────────────────
 */
export function DesktopPlaceholder() {
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-family)',
      overflow: 'hidden',
    }}>

      {/* Top bar */}
      <header style={{
        borderBottom: '3px solid var(--color-border)',
        padding: '14px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--color-white)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Logo mark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--color-primary)', display: 'block' }} />
            <span style={{ width: 12, height: 12, background: 'var(--color-accent)', display: 'block' }} />
            <span style={{
              width: 0, height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderBottom: '12px solid var(--color-danger)',
              display: 'block',
            }} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9a8e7a' }}>
              Civic Transparency
            </span>
            <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: 900, letterSpacing: '-0.02em', textTransform: 'uppercase', color: 'var(--color-primary)', lineHeight: 1 }}>
              NagarDrishti
            </span>
          </div>
        </div>

        <nav style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {['Public Map', 'Scorecards', 'SLA Breaches'].map(label => (
            <span key={label} style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a8e7a', cursor: 'not-allowed' }}>
              {label}
            </span>
          ))}
        </nav>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>

        {/* Left panel — Forest Green color block */}
        <div style={{
          flex: '0 0 55%',
          background: 'var(--color-primary)',
          padding: '80px 60px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 32,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Background geometric decorations */}
          <div aria-hidden="true" style={{
            position: 'absolute', top: -40, left: -40,
            width: 200, height: 200, borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.1)',
          }} />
          <div aria-hidden="true" style={{
            position: 'absolute', bottom: 40, right: -20,
            width: 120, height: 120,
            background: 'rgba(196,144,10,0.2)',
            transform: 'rotate(45deg)',
          }} />
          <div aria-hidden="true" style={{
            position: 'absolute', top: '40%', right: 30,
            width: 60, height: 60,
            border: '3px solid rgba(255,255,255,0.15)',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{
              fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)',
              marginBottom: 12,
            }}>
              Web Dashboard
            </p>

            <h1 style={{
              fontSize: 'clamp(2.5rem, 4vw, 4.5rem)',
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: '-0.03em',
              textTransform: 'uppercase',
              color: 'white',
              marginBottom: 20,
            }}>
              Under<br />Develop-<br />ment
            </h1>

            <p style={{
              fontSize: '1rem', fontWeight: 500,
              color: 'rgba(255,255,255,0.8)',
              lineHeight: 1.6, maxWidth: 360,
              marginBottom: 28,
            }}>
              The officer dashboard, public transparency map, and ward scorecards are being built. The citizen PWA is available on your mobile device.
            </p>

            {/* Divider */}
            <div style={{ width: 60, height: 3, background: 'var(--color-accent)', marginBottom: 28 }} />

            {/* Feature list — coming soon */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'Public issue map with PostGIS geospatial data',
                'Officer triage queue and assignment console',
                'Ward & department scorecard snapshots',
                'SLA breach wall and forgotten-issues ranking',
                'Proof-of-fix review and verification dashboard',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 18, height: 18, border: '2px solid rgba(255,255,255,0.4)',
                    background: 'rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 1,
                  }}>
                    <div style={{ width: 6, height: 6, background: 'var(--color-accent)' }} />
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel — Cream / call-to-action */}
        <div style={{
          flex: 1,
          padding: '80px 60px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 32,
          position: 'relative',
        }}>
          {/* Golden accent block top-right */}
          <div aria-hidden="true" style={{
            position: 'absolute', top: 0, right: 0,
            width: 120, height: 120,
            background: 'var(--color-accent)',
            borderBottom: '3px solid var(--color-border)',
            borderLeft: '3px solid var(--color-border)',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{
              fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.15em',
              textTransform: 'uppercase', color: '#9a8e7a', marginBottom: 8,
            }}>
              Available now
            </p>
            <h2 style={{
              fontSize: 'clamp(1.5rem, 2.5vw, 2.5rem)',
              fontWeight: 900, letterSpacing: '-0.02em',
              textTransform: 'uppercase', lineHeight: 1,
              marginBottom: 16,
            }}>
              Citizen PWA<br />on Mobile
            </h2>

            {/* Device card */}
            <div style={{
              border: '2px solid var(--color-border)',
              background: 'var(--color-white)',
              boxShadow: '6px 6px 0px 0px var(--color-border)',
              padding: '20px',
              marginBottom: 24,
              display: 'flex',
              gap: 16,
              alignItems: 'flex-start',
            }}>
              <div style={{
                width: 48, height: 48, border: '2px solid var(--color-border)',
                background: 'var(--color-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Smartphone size={24} color="var(--color-primary)" />
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 4 }}>
                  Open on your phone
                </p>
                <p style={{ fontSize: '0.78rem', fontWeight: 500, color: '#7a7060', lineHeight: 1.5 }}>
                  Visit this URL on any Android or iPhone browser. Tap "Add to Home Screen" to install the PWA.
                </p>
              </div>
            </div>

            {/* QR placeholder */}
            <div style={{
              border: '2px solid var(--color-border)',
              background: 'var(--color-muted)',
              boxShadow: '4px 4px 0px 0px var(--color-border)',
              width: 120, height: 120,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              marginBottom: 24,
            }}>
              {/* Simple mock QR pattern */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 10px)', gap: 2 }}>
                {[1,1,1,1,1, 1,0,0,0,1, 1,0,1,0,1, 1,0,0,0,1, 1,1,1,1,1].map((c, i) => (
                  <div key={i} style={{ width: 10, height: 10, background: c ? 'var(--color-fg)' : 'transparent' }} />
                ))}
              </div>
              <span style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7a7060', marginTop: 4 }}>
                Scan to open
              </span>
            </div>

            {/* Desktop vs Mobile split */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '2px solid var(--color-border)', background: 'var(--color-muted)' }}>
                <Monitor size={14} color="#9a8e7a" />
                <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#9a8e7a' }}>
                  Web UI — Coming Soon
                </span>
              </div>
              <ArrowRight size={14} color="#9a8e7a" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', border: '2px solid var(--color-primary)', background: '#edf4e0' }}>
                <Smartphone size={14} color="var(--color-primary)" />
                <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-primary)' }}>
                  PWA — Ready
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom strip */}
      <footer style={{
        borderTop: '3px solid var(--color-border)',
        background: 'var(--color-fg)',
        padding: '12px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
          NagarDrishti · Student Prototype · Demo Data Only
        </span>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
          API: /api/v1 · Auth: JWT Bearer
        </span>
      </footer>
    </div>
  );
}
