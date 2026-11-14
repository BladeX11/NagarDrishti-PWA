import { useRef, useState, type ChangeEvent } from 'react';
import { displayCategories, suggestReportCategory, type CategorySuggestion } from '../lib/categorySuggestion';
import { liveApi, type LiveIssue } from '../lib/liveApi';

function compressPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read this photo.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Could not load this photo.'));
      image.onload = () => {
        const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext('2d');
        if (!context) return reject(new Error('Photo processing is unavailable.'));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

type Props = { onClose: () => void; onCreated: (issue: LiveIssue) => void };

export function ReportSheet({ onClose, onCreated }: Props) {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [location, setLocation] = useState<[number, number] | null>(null);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [suggestion, setSuggestion] = useState<CategorySuggestion | null>(null);
  const [suggestionError, setSuggestionError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<LiveIssue | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoError('');
    try {
      const data = await compressPhoto(file);
      if (data.length > 5_600_000) throw new Error('Choose a smaller photo (under about 4 MB after compression).');
      setPhoto(data);
      setSuggestion(null);
      setSuggestionError('');
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'Could not process this photo.');
    }
    event.target.value = '';
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationError('This browser does not provide location. Try a recent mobile browser over HTTPS.');
      return;
    }
    setLocationBusy(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation([position.coords.latitude, position.coords.longitude]);
        setLocationBusy(false);
      },
      (error) => {
        setLocationError(error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. Allow location access in your browser settings and try again.'
          : 'Could not get your location. Move to an area with a signal and retry.');
        setLocationBusy(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  }

  async function handleSuggestion() {
    if (!description.trim()) return;
    setLoading(true);
    setSuggestionError('');
    try {
      const result = await suggestReportCategory({ description: description.trim(), category: category || 'other', imageDataUrl: photo || undefined });
      setSuggestion(result);
    } catch (error) {
      setSuggestionError(error instanceof Error ? error.message : 'Category suggestion is unavailable. Choose a category manually.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!description.trim() || !category || !location) {
      setFormError('Add a description, choose a category, and set your location before submitting.');
      return;
    }
    setLoading(true);
    setFormError('');
    try {
      const title = description.trim().replace(/\s+/g, ' ').slice(0, 90);
      const issue = await liveApi.createIssue({
        title,
        description: description.trim(),
        category,
        latitude: location[0],
        longitude: location[1],
        language: 'en',
        photoDataUrl: photo || undefined,
      });
      setCreated(issue);
      onCreated(issue);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not submit the report. Check the connection and retry.');
    } finally {
      setLoading(false);
    }
  }

  return <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="report-sheet" role="dialog" aria-modal="true" aria-labelledby="report-title">
      <div className="sheet-handle" />
      {!created ? <>
        <div className="sheet-heading"><div><p className="eyebrow">New public report</p><h2 id="report-title">Show us what<br />you’re seeing.</h2></div><button className="close-button" onClick={onClose} aria-label="Close report form">×</button></div>
        <input ref={cameraInput} className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={handlePhoto} />
        <input ref={photoInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} />
        <div className="photo-actions">
          <button className="photo-choice camera-choice" type="button" onClick={() => cameraInput.current?.click()}><span className="camera-icon">▧</span><strong>Take a photo</strong><small>Open your camera</small></button>
          <button className="photo-choice" type="button" onClick={() => photoInput.current?.click()}><span className="camera-icon">▤</span><strong>Choose photo</strong><small>Select from gallery</small></button>
        </div>
        {photoError && <p className="ai-error" role="alert">{photoError}</p>}
        {photo && <div className="photo-selected"><img className="photo-preview" src={photo} alt="Selected report photo" /><button type="button" className="text-button" onClick={() => { setPhoto(''); setSuggestion(null); }}>Remove photo</button></div>}
        <label className="field-label" htmlFor="description">What’s happening?</label><textarea id="description" maxLength={500} value={description} onChange={(event) => { setDescription(event.target.value); setSuggestion(null); setSuggestionError(''); }} placeholder="Describe the issue so the city team can respond" rows={3} />
        <div className="field-counter">{description.length}/500</div>
        <label className="field-label" htmlFor="category">Category</label><select id="category" value={category} onChange={(event) => { setCategory(event.target.value); setSuggestion(null); }}><option value="">Choose a category</option>{displayCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
        <div className="privacy-disclosure">Your report is sent to the NagarDrishti server. When you request an AI suggestion, the description and photo may also be forwarded to Google if Gemini is enabled. In local mode, the model receives text only. Avoid personal details.</div>
        <button className="suggest-button" type="button" onClick={handleSuggestion} disabled={loading || !description.trim()}>{loading ? 'Working…' : 'Get an AI category suggestion'}</button>
        {suggestionError && <p className="ai-error" role="alert">{suggestionError}</p>}
        {suggestion && <div className="suggestion-card" aria-live="polite"><p className="eyebrow">Advisory suggestion · {suggestion.source === 'local-ml' ? 'Local ML' : suggestion.source === 'gemini' ? 'Gemini' : 'Rules fallback'}</p><strong>{displayCategories.find((item) => item.value === suggestion.category)?.label ?? suggestion.category}</strong><p>{suggestion.reason}</p><button type="button" className="text-button" onClick={() => setCategory(suggestion.category)}>Use this category</button></div>}
        <div className="location-note"><span>⌖</span><div><strong>{location ? 'Location ready' : 'Add your location'}</strong><small>{location ? 'The public map pin will be coarsened for privacy.' : 'Your precise coordinates are not shown on the public map.'}</small></div><button type="button" onClick={useCurrentLocation} disabled={locationBusy}>{locationBusy ? 'Finding…' : location ? 'Update' : 'Use my location'}</button></div>
        {locationError && <p className="ai-error" role="alert">{locationError}</p>}
        {formError && <p className="ai-error" role="alert">{formError}</p>}
        <button className="submit-button" onClick={handleSubmit} disabled={loading || !description.trim() || !category || !location}>{loading ? 'Submitting…' : 'Submit report'} <span>→</span></button>
      </> : <div className="submitted-state"><div className="success-mark">✓</div><p className="eyebrow">Report submitted</p><h2>Your report is<br />on the map.</h2><p>Reference <strong>{created.publicRef}</strong> · {created.status}</p><button className="submit-button" onClick={onClose}>Back to map <span>→</span></button></div>}
    </section>
  </div>;
}
