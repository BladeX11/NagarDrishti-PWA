import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, MapPin, CheckCircle2, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { AppBar } from '../components/AppBar';
import type { CategoryKey } from '../types';
import { CATEGORY_META } from '../types';

// Steps of the report flow
type Step = 'photo' | 'category' | 'location' | 'review';

const STEPS: { id: Step; label: string }[] = [
  { id: 'photo',    label: 'Photo'    },
  { id: 'category', label: 'Category' },
  { id: 'location', label: 'Location' },
  { id: 'review',   label: 'Review'   },
];

export function ReportIssuePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('photo');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<CategoryKey | null>(null);
  const [description, setDescription] = useState('');
  const [locationSource, setLocationSource] = useState<'device' | 'manual' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const stepIndex = STEPS.findIndex(s => s.id === step);

  // Simulate AI suggestion after photo upload
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
    // Simulate async AI classification
    setTimeout(() => setAiSuggestion('pothole/road'), 800);
  }

  function handleSubmit() {
    setSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1500);
  }

  if (submitted) {
    return <SuccessScreen onDone={() => navigate('/')} />;
  }

  return (
    <div className="page">
      <AppBar title="Report Issue" showBack backPath="/" />

      {/* Step indicator */}
      <div style={{ padding: '12px 16px', borderBottom: '2px solid var(--color-border)', background: 'var(--color-white)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {STEPS.map((s, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                  <div style={{
                    width: 28, height: 28,
                    border: '2px solid var(--color-border)',
                    background: done ? 'var(--color-primary)' : active ? 'var(--color-accent)' : 'var(--color-muted)',
                    color: done || active ? 'var(--color-white)' : 'var(--color-fg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem', fontWeight: 900,
                    boxShadow: active ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 200ms ease-out',
                  }}>
                    {done ? <CheckCircle2 size={14} aria-hidden="true" /> : i + 1}
                  </div>
                  <span style={{
                    fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: active ? 'var(--color-primary)' : done ? 'var(--color-primary)' : '#9a8e7a',
                  }}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{
                    height: 2, flex: 1, maxWidth: 32,
                    background: done ? 'var(--color-primary)' : 'var(--color-muted)',
                    margin: '0 4px', marginBottom: 18,
                  }} aria-hidden="true" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }} className="animate-fade-in">

        {/* --- STEP: Photo --- */}
        {step === 'photo' && (
          <>
            <div>
              <h2 className="text-heading" style={{ marginBottom: 4, fontSize: '1.25rem' }}>Add a Photo</h2>
              <p className="text-body" style={{ color: '#7a7060', fontSize: '0.875rem' }}>
                A photo is the fastest way to file — capture or choose from gallery.
              </p>
            </div>

            {photoPreview ? (
              <div style={{ position: 'relative' }}>
                <img
                  src={photoPreview}
                  alt="Preview of the reported issue"
                  style={{ width: '100%', height: 220, objectFit: 'cover', border: '2px solid var(--color-border)', display: 'block' }}
                />
                <button
                  className="btn btn-outline"
                  onClick={() => { setPhotoPreview(null); setAiSuggestion(null); }}
                  style={{ position: 'absolute', top: 8, right: 8, padding: '4px 10px', fontSize: '0.65rem' }}
                >
                  Retake
                </button>

                {/* AI suggestion chip */}
                {aiSuggestion && (
                  <div className="animate-slide-up" style={{
                    position: 'absolute', bottom: 8, left: 8, right: 8,
                    background: 'rgba(26,26,14,0.85)', backdropFilter: 'blur(4px)',
                    border: '1.5px solid var(--color-accent)', padding: '8px 10px',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>
                      AI Suggestion
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
                      {CATEGORY_META[aiSuggestion].emoji} {CATEGORY_META[aiSuggestion].label}
                    </span>
                    <span style={{ fontSize: '0.6rem', color: '#ccc', marginLeft: 'auto' }}>Editable</span>
                  </div>
                )}
              </div>
            ) : (
              <label className="photo-upload" aria-label="Upload a photo of the issue">
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} />
                <div style={{
                  width: 48, height: 48,
                  border: '2px solid var(--color-border)',
                  background: 'var(--color-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  <Camera size={22} color="var(--color-primary)" aria-hidden="true" />
                </div>
                <p className="text-subheading" style={{ fontSize: '0.8rem' }}>Tap to capture</p>
                <p style={{ fontSize: '0.75rem', color: '#9a8e7a', fontWeight: 500 }}>or choose from gallery</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <Upload size={12} color="#9a8e7a" aria-hidden="true" />
                  <span style={{ fontSize: '0.65rem', color: '#9a8e7a', fontWeight: 500 }}>Max 10 MB · JPG, PNG, HEIC</span>
                </div>
              </label>
            )}

            <textarea
              className="input-field"
              placeholder="Optional: Describe the issue (English, Hindi, or Marathi)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              aria-label="Issue description (optional)"
              lang="en"
            />

            <button
              className="btn btn-primary btn-full"
              onClick={() => setStep('category')}
              disabled={!photoPreview && !description.trim()}
              style={{ opacity: (!photoPreview && !description.trim()) ? 0.5 : 1 }}
            >
              Continue <ChevronRight size={16} aria-hidden="true" />
            </button>
          </>
        )}

        {/* --- STEP: Category --- */}
        {step === 'category' && (
          <>
            <div>
              <h2 className="text-heading" style={{ marginBottom: 4, fontSize: '1.25rem' }}>Select Category</h2>
              <p className="text-body" style={{ color: '#7a7060', fontSize: '0.875rem' }}>
                {aiSuggestion
                  ? `AI suggests "${CATEGORY_META[aiSuggestion].label}" — confirm or change.`
                  : 'What type of issue is this?'}
              </p>
            </div>

            {/* AI confidence notice */}
            {aiSuggestion && (
              <div style={{
                background: '#fdf6da', border: '2px solid var(--color-accent)',
                padding: '8px 12px', display: 'flex', gap: 8, alignItems: 'center',
              }} role="note">
                <AlertCircle size={14} color="var(--color-accent)" aria-hidden="true" />
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#7A6010' }}>
                  Suggested category · Confidence 84% · Always editable
                </p>
              </div>
            )}

            <div className="category-grid" role="radiogroup" aria-label="Issue category">
              {(Object.entries(CATEGORY_META) as [CategoryKey, typeof CATEGORY_META[CategoryKey]][]).map(([key, meta]) => {
                const isSelected = (selectedCategory ?? aiSuggestion) === key;
                return (
                  <button
                    key={key}
                    className={`category-chip ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedCategory(key)}
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={meta.label}
                    style={isSelected ? { '--card-accent': meta.color } as React.CSSProperties : undefined}
                  >
                    <span className="chip-icon" aria-hidden="true">{meta.emoji}</span>
                    <span className="chip-label">{meta.label}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" onClick={() => setStep('photo')} style={{ flex: 1 }}>Back</button>
              <button
                className="btn btn-primary"
                onClick={() => setStep('location')}
                disabled={!selectedCategory && !aiSuggestion}
                style={{ flex: 2, opacity: (!selectedCategory && !aiSuggestion) ? 0.5 : 1 }}
              >
                Continue <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </>
        )}

        {/* --- STEP: Location --- */}
        {step === 'location' && (
          <>
            <div>
              <h2 className="text-heading" style={{ marginBottom: 4, fontSize: '1.25rem' }}>Approximate Location</h2>
              <p className="text-body" style={{ color: '#7a7060', fontSize: '0.875rem' }}>
                We'll coarsen your location before publishing — your exact address stays private.
              </p>
            </div>

            {/* Privacy notice */}
            <div style={{
              background: '#edf4e0', border: '2px solid var(--color-primary)',
              borderLeft: '6px solid var(--color-primary)', padding: '10px 12px',
            }} role="note">
              <p className="text-label" style={{ color: 'var(--color-primary)', marginBottom: 3 }}>Privacy notice</p>
              <p style={{ fontSize: '0.78rem', fontWeight: 500, color: '#3a5020', lineHeight: 1.5 }}>
                Your exact location is stored privately. The public map will only show a neighbourhood-level area, not your doorstep.
              </p>
            </div>

            {/* Location options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className={`btn ${locationSource === 'device' ? 'btn-primary' : 'btn-outline'} btn-full`}
                onClick={() => setLocationSource('device')}
                aria-pressed={locationSource === 'device'}
              >
                <MapPin size={16} aria-hidden="true" />
                Use my current location
              </button>
              <button
                className={`btn ${locationSource === 'manual' ? 'btn-accent' : 'btn-outline'} btn-full`}
                onClick={() => setLocationSource('manual')}
                aria-pressed={locationSource === 'manual'}
              >
                Pin on map manually
              </button>
            </div>

            {/* Map pin preview */}
            {locationSource && (
              <div className="animate-slide-up">
                <div className="map-placeholder" style={{ height: 160 }} aria-label="Map showing approximate location">
                  <div aria-hidden="true" style={{
                    width: 20, height: 20, background: 'var(--color-primary)',
                    border: '3px solid var(--color-border)',
                    boxShadow: 'var(--shadow-sm)',
                    position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%,-50%)',
                  }} />
                </div>
                <p className="text-label" style={{ color: '#7a7060', textAlign: 'center', marginTop: 6 }}>
                  {locationSource === 'device' ? 'Location detected — approximate pin shown' : 'Tap map to adjust pin'}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" onClick={() => setStep('category')} style={{ flex: 1 }}>Back</button>
              <button
                className="btn btn-primary"
                onClick={() => setStep('review')}
                disabled={!locationSource}
                style={{ flex: 2, opacity: !locationSource ? 0.5 : 1 }}
              >
                Continue <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </>
        )}

        {/* --- STEP: Review & Submit --- */}
        {step === 'review' && (
          <>
            <div>
              <h2 className="text-heading" style={{ marginBottom: 4, fontSize: '1.25rem' }}>Review &amp; Submit</h2>
              <p className="text-body" style={{ color: '#7a7060', fontSize: '0.875rem' }}>
                Check your report before submitting. You can edit any field.
              </p>
            </div>

            {/* Summary card */}
            <div className="card" style={{ '--card-accent': 'var(--color-accent)' } as React.CSSProperties}>
              <div className="card-corner geo-circle" style={{ background: 'var(--color-accent)' }} aria-hidden="true" />
              <div className="card-pad" style={{ paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {photoPreview && (
                  <img src={photoPreview} alt="Issue photo" style={{ width: '100%', height: 140, objectFit: 'cover', border: '2px solid var(--color-border)' }} />
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <ReviewRow label="Category" value={`${CATEGORY_META[selectedCategory ?? aiSuggestion ?? 'other'].emoji} ${CATEGORY_META[selectedCategory ?? aiSuggestion ?? 'other'].label}`} onEdit={() => setStep('category')} />
                  {description && <ReviewRow label="Description" value={description} onEdit={() => setStep('photo')} />}
                  <ReviewRow label="Location" value={locationSource === 'device' ? 'Current location (coarsened)' : 'Manual pin (coarsened)'} onEdit={() => setStep('location')} />
                  <ReviewRow label="Privacy" value="Exact location stays private · Media redacted before publishing" />
                </div>
              </div>
            </div>

            {/* Consent confirmation */}
            <div style={{
              background: 'var(--color-muted)', border: '2px solid var(--color-border)',
              padding: '12px', display: 'flex', gap: 10, alignItems: 'flex-start',
            }}>
              <CheckCircle2 size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
              <p style={{ fontSize: '0.75rem', fontWeight: 500, color: '#5a4a30', lineHeight: 1.5 }}>
                By submitting, you consent to storing and publishing a coarsened version of your report for civic transparency purposes. Your identity and exact location remain private.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline" onClick={() => setStep('location')} style={{ flex: 1 }}>Back</button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
                style={{ flex: 2 }}
              >
                {submitting ? (
                  <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" /> Submitting...</>
                ) : (
                  'Submit Report'
                )}
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit?: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, paddingBottom: 8, borderBottom: '1px solid var(--color-muted)' }}>
      <div>
        <span className="text-label" style={{ color: '#9a8e7a', display: 'block', marginBottom: 1 }}>{label}</span>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-fg)' }}>{value}</span>
      </div>
      {onEdit && (
        <button className="btn btn-outline" onClick={onEdit} style={{ padding: '3px 10px', fontSize: '0.6rem', flexShrink: 0 }}>
          Edit
        </button>
      )}
    </div>
  );
}

function SuccessScreen({ onDone }: { onDone: () => void }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Green success block */}
      <div className="block-primary" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden="true" style={{ position: 'absolute', top: -30, right: -30, width: 150, height: 150, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.15)' }} />
        <div aria-hidden="true" style={{ position: 'absolute', bottom: 20, left: 20, width: 60, height: 60, background: 'rgba(196,144,10,0.3)', transform: 'rotate(45deg)' }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 80, height: 80,
            border: '3px solid rgba(255,255,255,0.5)',
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-lg)',
          }}>
            <CheckCircle2 size={40} color="white" aria-hidden="true" />
          </div>

          <h1 className="text-display" style={{ color: 'white', fontSize: '2.5rem' }}>
            Report<br />Filed!
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500, maxWidth: 280, lineHeight: 1.5 }}>
            Your issue has been submitted. Officers will review it and you can track progress from My Reports.
          </p>

          <div style={{ background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', padding: '8px 16px', marginTop: 8 }}>
            <p className="text-label" style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 2 }}>Reference ID</p>
            <p style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, color: 'white', letterSpacing: '0.08em' }}>
              f9a2b4c6d8e0
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="block-accent" style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 10, borderTop: '3px solid var(--color-border)' }}>
        <button className="btn btn-outline btn-full" onClick={onDone} style={{ background: 'var(--color-fg)', color: 'white' }}>
          Back to Home
        </button>
        <button className="btn btn-outline btn-full" style={{ background: 'transparent' }}>
          View My Report
        </button>
      </div>
    </div>
  );
}
