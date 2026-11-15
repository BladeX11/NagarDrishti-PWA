import { useEffect, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Languages,
  MapPin,
  Sparkles,
} from "lucide-react";
import { issues as seedIssues } from "../../data/seed";
import { issuesApi, type ApiIssue } from "../../lib/api";
import type { Category } from "../../types";
import { categories } from "../../types";
import { Button } from "../../components/shared/Button";
import { MapView } from "../../components/shared/MapView";
import {
  CategoryIcon,
  DemoNote,
  PageHeader,
  Panel,
} from "../../components/shared/Primitives";
import {
  clearReportDraft,
  loadReportDraft,
  queueSubmission,
  saveReportDraft,
} from "../../pwa/offlineQueue";
import {
  categoryDepartmentFor,
  categoryNames,
  deriveWardFromCoords,
  formatWardLabel,
  normalizeWardKey,
} from "./constants";

const OPEN_DUPLICATE_STATUSES = new Set([
  "Open",
  "Triaged",
  "Assigned",
  "In Progress",
  "Reopened",
]);

function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const EMPTY_SUGGESTION = {
  category: "pothole/road" as Category,
  reason: "",
  source: null as "gemini" | "local-ml" | "rules" | null,
  modelVersion: "",
  loading: false,
};

export function ReportFlow() {
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<Category>("pothole/road");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState(() => {
    try {
      const saved = localStorage.getItem("nd-language");
      if (saved && ["English", "हिन्दी", "मराठी"].includes(saved)) return saved;
    } catch {
      // Ignore storage read errors.
    }
    return "English";
  });
  const [photo, setPhoto] = useState("");
  const [location, setLocation] = useState<[number, number]>([
    18.5204, 73.8567,
  ]);
  const [submitted, setSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState("");
  const [submissionState, setSubmissionState] = useState<
    "synced" | "queued" | null
  >(null);
  const [selectedDuplicate, setSelectedDuplicate] = useState(false);
  const [supportingDupId, setSupportingDupId] = useState<string | null>(null);
  const [supportedDupIds, setSupportedDupIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(EMPTY_SUGGESTION);
  const [apiDuplicates, setApiDuplicates] = useState<ApiIssue[]>([]);
  const [nearbyIssues, setNearbyIssues] = useState<any[]>(
    seedIssues.slice(0, 7)
  );
  const [isLiveMap, setIsLiveMap] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    issuesApi
      .list({ limit: 25 })
      .then(res => {
        if (!active) return;
        setNearbyIssues(res.items);
        setIsLiveMap(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    loadReportDraft()
      .then(draft => {
        if (!draft) return;
        setStep(Math.max(0, Math.min(2, draft.step)));
        if (categories.includes(draft.category as Category))
          setCategory(draft.category as Category);
        setDescription(draft.description);
        if (draft.language) setLanguage(draft.language);
        setPhoto(draft.photoDataUrl);
        setLocation([draft.latitude, draft.longitude]);
      })
      .finally(() => setDraftHydrated(true));
  }, []);

  useEffect(() => {
    if (!draftHydrated || submitted) return;
    void saveReportDraft({
      step,
      category,
      description,
      language,
      photoDataUrl: photo,
      latitude: location[0],
      longitude: location[1],
    });
  }, [
    draftHydrated,
    submitted,
    step,
    category,
    description,
    language,
    photo,
    location,
  ]);

  async function runClassify(text: string, languageName: string) {
    if (!text.trim()) {
      setAiSuggestion(EMPTY_SUGGESTION);
      return;
    }
    setAiSuggestion(s => ({ ...s, reason: "", source: null, loading: true }));
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL ?? "/api";
      const classifyHeaders: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (import.meta.env.DEV) {
        classifyHeaders["x-demo-role"] =
          localStorage.getItem("nd-role") || "citizen";
      }
      const res = await fetch(`${apiBase}/ai/classify`, {
        method: "POST",
        headers: classifyHeaders,
        credentials: "include",
        body: JSON.stringify({
          text,
          language: languageName,
          category,
          imageDataUrl: photo || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.data) {
        setAiSuggestion({
          category: json.data.category as Category,
          reason: json.data.reason,
          source: json.data.source,
          modelVersion: json.data.modelVersion,
          loading: false,
        });
      } else {
        setAiSuggestion(s => ({
          ...s,
          source: null,
          reason:
            json?.error ||
            "Category suggestion is unavailable. Keep or choose a category manually.",
          loading: false,
        }));
      }
    } catch {
      setAiSuggestion(s => ({
        ...s,
        source: null,
        reason:
          "Category suggestion is unavailable. Keep or choose a category manually.",
        loading: false,
      }));
    }
  }

  const compressImage = (
    file: File,
    maxDimension = 1280,
    quality = 0.75
  ): Promise<string> => {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        const result = e.target?.result;
        if (typeof result !== "string" || !result) {
          resolve("");
          return;
        }
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (!width || !height) {
            resolve("");
            return;
          }
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve("");
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = () => resolve("");
        img.src = result;
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  };

  const onPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await compressImage(file);
    if (dataUrl) {
      setPhoto(dataUrl);
    } else {
      event.target.value = "";
      toast.error(
        "Could not process this image file. Please select a valid photo."
      );
    }
  };

  const go = (next: number) => setStep(Math.max(0, Math.min(2, next)));
  const derivedWard = deriveWardFromCoords(location[0], location[1]);
  const coarsenedLat = Math.round(location[0] * 200) / 200;
  const coarsenedLng = Math.round(location[1] * 200) / 200;

  const handleNext = async () => {
    if (step === 0) {
      if (description.trim()) {
        void runClassify(description, language);
      } else {
        setAiSuggestion(EMPTY_SUGGESTION);
      }
    }
    if (step === 1) {
      setSelectedDuplicate(false);
      setSupportedDupIds([]);
      setApiDuplicates([]);
      const targetWardKey = normalizeWardKey(derivedWard);
      issuesApi
        .list({ category, limit: 25 })
        .then(r => {
          const candidates = r.items
            .filter(item => OPEN_DUPLICATE_STATUSES.has(item.status))
            .map(item => {
              const hasCoords =
                typeof item.latitude === "number" &&
                typeof item.longitude === "number";
              const dist = hasCoords
                ? distanceMeters(
                    location[0],
                    location[1],
                    item.latitude!,
                    item.longitude!
                  )
                : Number.POSITIVE_INFINITY;
              const sameWard =
                normalizeWardKey(item.ward || item.wardId) === targetWardKey;
              return { item, dist, hasCoords, sameWard };
            })
            .filter(({ dist, hasCoords, sameWard }) =>
              hasCoords ? dist <= 1500 : sameWard
            )
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 4)
            .map(({ item }) => item);
          setApiDuplicates(candidates);
        })
        .catch(() => setApiDuplicates([]));
    }
    go(step + 1);
  };

  const handleSupportDuplicate = async (issue: ApiIssue) => {
    if (supportingDupId || supportedDupIds.includes(issue.id)) return;
    setSupportingDupId(issue.id);
    try {
      await issuesApi.support(issue.id);
      setSupportedDupIds(prev => [...prev, issue.id]);
      setSelectedDuplicate(true);
      toast.success("Support added to the existing report.");
    } catch (err: any) {
      const msg = err?.message || "Could not add support right now.";
      if (msg.toLowerCase().includes("already supporting")) {
        setSupportedDupIds(prev => [...prev, issue.id]);
        setSelectedDuplicate(true);
        toast.info("You are already supporting this report.");
      } else {
        toast.error(msg);
      }
    } finally {
      setSupportingDupId(null);
    }
  };

  if (submitted)
    return (
      <div className="mx-auto max-w-2xl py-8">
        <Panel className="border-2 px-5 py-10 text-center sm:border-4 sm:px-6 sm:py-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#2A3320] bg-[#4F5B2A] text-white">
            <Check size={30} />
          </div>
          <p className="eyebrow mt-6 sm:mt-7">
            {submissionState === "queued" ? "Saved offline" : "Report received"}
          </p>
          <h1 className="display-title mt-2 text-2xl sm:text-3xl">
            {submissionState === "queued"
              ? "Waiting to upload"
              : "Your report is visible"}
          </h1>
          <p className="mt-3 text-sm text-[#2A3320]/70">
            Issue ID <b>{submittedId}</b>.{" "}
            {submissionState === "queued"
              ? "The report is stored securely on this device and will upload automatically when the connection returns."
              : "Your report is now publicly visible with a coarsened location. Track progress in My Reports."}
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Link to="/citizen/my-reports" className="w-full sm:w-auto">
              <Button className="min-h-[48px] w-full sm:w-auto">
                View my report →
              </Button>
            </Link>
            <Link to="/citizen/explore" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="min-h-[48px] w-full sm:w-auto"
              >
                Back to map →
              </Button>
            </Link>
          </div>
        </Panel>
      </div>
    );

  const steps = ["Photo & Note", "Pin & Category", "Review & Submit"];
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col lg:min-h-0">
      <div className="sticky top-0 z-30 -mx-4 border-b-2 border-[#2A3320] bg-[#F5EFE3] px-4 py-2.5 sm:static sm:mx-0 sm:border-b-0 sm:bg-transparent sm:px-0 sm:py-0">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/citizen"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#2A3320] hover:underline"
          >
            <ArrowLeft size={15} /> Exit
          </Link>
          <span className="text-xs font-black uppercase tracking-wider">
            Step {step + 1} of 3
          </span>
          <span className="text-xs font-black text-[#4F5B2A]">
            {Math.round(((step + 1) / 3) * 100)}%
          </span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {steps.map((name, index) => (
            <button
              key={name}
              type="button"
              onClick={() => index < step && go(index)}
              disabled={index > step}
              className="text-left disabled:cursor-default"
            >
              <div
                className={`h-2 border border-[#2A3320] ${
                  index <= step ? "bg-[#4F5B2A]" : "bg-[#E8E0D0]"
                }`}
              />
              <span
                className={`mt-1 block truncate text-[11px] font-bold ${
                  index === step ? "text-[#2A3320]" : "text-[#2A3320]/60"
                }`}
              >
                {name}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="hidden pt-4 sm:block">
        <PageHeader
          eyebrow="Community reporting"
          title="Report an issue"
          description="A short report helps your neighbourhood turn a concern into a visible, trackable action."
        />
      </div>

      <Panel
        className="mt-4 flex-1 border-2 md:border-4"
        padding="p-4 sm:p-6 md:p-8"
      >
        <div className="mb-5 flex items-center justify-between border-b-2 border-[#E8E0D0] pb-3 sm:mb-6 sm:pb-4">
          <div>
            <p className="eyebrow">Step {step + 1} of 3</p>
            <h2 className="display-title mt-1 text-xl">{steps[step]}</h2>
          </div>
          {step === 0 && photo && (
            <button
              type="button"
              onClick={() => setPhoto("")}
              className="min-h-[40px] border-2 border-[#2A3320] bg-white px-3 text-xs font-bold uppercase"
            >
              Clear photo
            </button>
          )}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <label className="flex min-h-[168px] cursor-pointer flex-col items-center justify-center border-2 border-dashed border-[#2A3320] bg-[#D8C9A8]/20 p-5 text-center transition-colors hover:bg-[#D8C9A8]/40 sm:min-h-60 sm:border-4">
              {photo ? (
                <img
                  src={photo}
                  alt="Selected report"
                  className="max-h-52 max-w-full border-2 border-[#2A3320] object-contain"
                />
              ) : (
                <>
                  <Camera size={32} />
                  <span className="display-title mt-3 text-lg sm:text-xl">
                    Tap to capture
                  </span>
                  <span className="mt-1.5 text-xs text-[#2A3320]/70">
                    or choose a photo from your gallery (optional)
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={onPhoto}
              />
            </label>

            <div>
              <label htmlFor="description" className="eyebrow mb-2 block">
                Describe what you’re seeing (optional)
              </label>
              <textarea
                id="description"
                rows={3}
                maxLength={500}
                value={description}
                onChange={e => {
                  const next = e.target.value;
                  setDescription(next);
                  if (!next.trim()) {
                    setAiSuggestion(EMPTY_SUGGESTION);
                  }
                }}
                placeholder="Share helpful context: what happened, when it started, or how it affects the area…"
                className="input-block min-h-28 resize-y text-sm sm:min-h-36"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  {["English", "हिन्दी", "मराठी"].map(name => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setLanguage(name)}
                      className={`inline-flex min-h-[40px] items-center border-2 border-[#2A3320] px-3 text-xs font-black ${language === name ? "bg-[#4F5B2A] text-white" : "bg-white"}`}
                    >
                      <Languages size={13} className="mr-1.5 inline" />
                      {name}
                    </button>
                  ))}
                </div>
                <span className="text-xs font-bold text-[#2A3320]/60">
                  {description.length} / 500
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#2A3320]/60">
                Original photo metadata is stripped. Descriptions help suggest a
                category—always editable in the next step.
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <div className="mb-3 flex items-center gap-2 border-2 border-[#B8892D] bg-[#B8892D]/10 p-3 text-xs font-bold">
                <MapPin size={16} className="shrink-0" />
                <span>
                  Your pin is rounded for privacy. Tap the map or use GPS.
                </span>
              </div>
              <MapView
                issues={nearbyIssues}
                height="220px"
                pinPosition={location}
                onPinChange={setLocation}
              />
              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
                <Button
                  variant="gold"
                  className="min-h-[44px] text-[#2A3320]"
                  onClick={() => {
                    if (!navigator.geolocation) {
                      toast.error(
                        "Location services are not available in this browser."
                      );
                      return;
                    }
                    navigator.geolocation.getCurrentPosition(
                      position => {
                        setLocation([
                          Math.round(position.coords.latitude * 200) / 200,
                          Math.round(position.coords.longitude * 200) / 200,
                        ]);
                        toast.success("Your approximate location is set.");
                      },
                      () =>
                        toast.error(
                          "Location could not be accessed. You can place the pin manually."
                        ),
                      {
                        enableHighAccuracy: false,
                        timeout: 8000,
                        maximumAge: 300000,
                      }
                    );
                  }}
                >
                  Use my location
                </Button>
                <Button
                  variant="outline"
                  className="min-h-[44px]"
                  onClick={() =>
                    toast.info(
                      "Tap anywhere on the map to place the approximate pin."
                    )
                  }
                >
                  Tap map
                </Button>
              </div>
            </div>

            <div>
              <p className="eyebrow mb-2.5">Choose category</p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
                {categories.map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`flex min-h-[84px] flex-col items-start justify-between border-2 border-[#2A3320] p-3 text-left shadow-[3px_3px_0px_0px_#2A3320] transition-all sm:min-h-28 sm:border-4 sm:shadow-[4px_4px_0px_0px_#2A3320] ${category === item ? "bg-[#4F5B2A] text-white" : "bg-[#FDFBF7] text-[#2A3320] hover:-translate-y-1"}`}
                  >
                    <CategoryIcon category={item} size={20} />
                    <span className="text-xs font-black uppercase tracking-wide sm:text-[10px]">
                      {categoryNames[item]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {(aiSuggestion.loading ||
              aiSuggestion.source ||
              aiSuggestion.reason ||
              description.trim()) && (
              <div className="border-2 border-[#B8892D] bg-[#D8C9A8]/25 p-3.5 sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-[#B8892D]" />
                    <p className="text-xs font-black uppercase tracking-wider">
                      {aiSuggestion.loading
                        ? "Checking description…"
                        : "AI category suggestion"}
                    </p>
                  </div>
                  {!aiSuggestion.loading &&
                    !aiSuggestion.source &&
                    description.trim() && (
                      <button
                        type="button"
                        onClick={() => void runClassify(description, language)}
                        className="min-h-[36px] border-2 border-[#2A3320] bg-white px-2.5 text-xs font-bold uppercase"
                      >
                        Suggest
                      </button>
                    )}
                </div>
                {aiSuggestion.source ? (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black">
                        {categoryNames[aiSuggestion.category] ||
                          aiSuggestion.category}
                      </p>
                      <p className="mt-0.5 text-xs text-[#2A3320]/70">
                        {aiSuggestion.reason}
                      </p>
                    </div>
                    {aiSuggestion.category !== category && (
                      <button
                        type="button"
                        onClick={() => setCategory(aiSuggestion.category)}
                        className="min-h-[40px] border-2 border-[#2A3320] bg-[#4F5B2A] px-3 text-xs font-black uppercase text-white"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                ) : (
                  !aiSuggestion.loading &&
                  aiSuggestion.reason && (
                    <p className="mt-2 text-xs text-[#2A3320]/70">
                      {aiSuggestion.reason}
                    </p>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            {apiDuplicates.length > 0 && (
              <div className="border-2 border-[#2A3320] bg-[#D8C9A8]/25 p-3.5">
                <p className="eyebrow mb-2">Similar nearby reports</p>
                <p className="mb-3 text-xs text-[#2A3320]/75">
                  Support an existing report instead of creating a duplicate, or
                  continue below to submit yours.
                </p>
                <div className="space-y-2.5">
                  {apiDuplicates.map((issue: ApiIssue) => {
                    const isSupported = supportedDupIds.includes(issue.id);
                    const isBusy = supportingDupId === issue.id;
                    return (
                      <div
                        key={issue.id}
                        className="border-2 border-[#2A3320] bg-[#FDFBF7] p-3"
                      >
                        <p className="text-sm font-black">{issue.title}</p>
                        <p className="mt-1 text-xs font-bold text-[#2A3320]/65">
                          {issue.category} ·{" "}
                          {formatWardLabel(issue.ward, issue.wardId, "Pune")} ·{" "}
                          {issue.status}
                        </p>
                        <button
                          type="button"
                          disabled={isBusy || isSupported}
                          onClick={() => void handleSupportDuplicate(issue)}
                          className="mt-2.5 inline-flex min-h-[40px] items-center border-2 border-[#2A3320] bg-[#B8892D] px-3 text-xs font-black uppercase tracking-wider text-[#2A3320] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isBusy
                            ? "Supporting..."
                            : isSupported
                              ? "Supported"
                              : "＋ Support this instead"}
                        </button>
                      </div>
                    );
                  })}
                </div>
                {selectedDuplicate && (
                  <p className="mt-2.5 text-xs font-bold text-[#4F5B2A]">
                    Support recorded. You can exit above or submit a separate
                    report below.
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
              {photo && (
                <img
                  src={photo}
                  alt="Report attachment preview"
                  className="h-36 w-full border-2 border-[#2A3320] object-cover grayscale sm:border-4"
                />
              )}
              <div className="space-y-3">
                <div>
                  <p className="eyebrow">Category &amp; service</p>
                  <p className="mt-1 font-black">
                    {categoryNames[category]} ·{" "}
                    {categoryDepartmentFor(category)}
                  </p>
                </div>
                <div>
                  <p className="eyebrow">Approximate location</p>
                  <p className="mt-1 font-bold">
                    {derivedWard}, Pune · Coarsened pin (
                    {coarsenedLat.toFixed(3)}, {coarsenedLng.toFixed(3)})
                  </p>
                </div>
                <div>
                  <p className="eyebrow">Description</p>
                  <p className="mt-1 text-sm">
                    {description || "No additional description provided."}
                  </p>
                </div>
              </div>
            </div>
            <MapView issues={[]} height="130px" pinPosition={location} />
            <div className="border-2 border-[#B8892D] bg-[#B8892D]/10 p-3.5 text-xs leading-relaxed">
              <b>Privacy preview:</b> Public: approximate location, category,
              status. Private: your identity, exact coordinates, and original
              photo metadata.
            </div>
          </div>
        )}
      </Panel>

      <div className="sticky bottom-0 z-30 -mx-4 mt-5 flex items-center gap-3 border-t-2 border-[#2A3320] bg-[#FDFBF7] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:mt-6 sm:justify-between sm:border-t-0 sm:bg-transparent sm:px-0 sm:pb-8">
        {step > 0 && (
          <Button
            variant="outline"
            className="min-h-[48px]"
            onClick={() => go(step - 1)}
          >
            <ArrowLeft size={15} />
            Back
          </Button>
        )}
        {step < 2 ? (
          <Button
            className="min-h-[48px] flex-1 sm:ml-auto sm:flex-none"
            onClick={handleNext}
          >
            Continue <ArrowRight size={15} />
          </Button>
        ) : (
          <Button
            size="lg"
            variant="gold"
            className="min-h-[48px] flex-1 text-[#2A3320] sm:ml-auto sm:flex-none"
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true);
              const langCode =
                language === "\u0939\u093f\u0928\u094d\u0926\u0940"
                  ? "hi"
                  : language === "\u092e\u0930\u093e\u0920\u0940"
                    ? "mr"
                    : "en";
              const payload = {
                title: `${categoryNames[category]} reported in ${derivedWard}`,
                description:
                  description ||
                  `A ${categoryNames[category].toLowerCase()} issue.`,
                category,
                language: langCode,
                latitude: location[0],
                longitude: location[1],
                photoDataUrl: photo || undefined,
              };
              try {
                if (!navigator.onLine) {
                  await queueSubmission(payload);
                  await clearReportDraft();
                  setSubmittedId(
                    "OFFLINE-" + Date.now().toString(36).toUpperCase()
                  );
                  setSubmissionState("queued");
                  setSubmitted(true);
                  toast.success(
                    "Report saved on this device. It will upload when you reconnect."
                  );
                  return;
                }
                const created = await issuesApi.create(payload);
                await clearReportDraft();
                setSubmittedId(created.publicRef);
                setSubmissionState("synced");
                setSubmitted(true);
                toast.success(
                  `Issue ${created.publicRef} is on the public map.`
                );
              } catch (e: any) {
                if (!navigator.onLine || e instanceof TypeError) {
                  try {
                    await queueSubmission(payload);
                    await clearReportDraft();
                    setSubmittedId(
                      "OFFLINE-" + Date.now().toString(36).toUpperCase()
                    );
                    setSubmissionState("queued");
                    setSubmitted(true);
                    toast.info(
                      "Connection lost. Report saved and queued for upload."
                    );
                  } catch {
                    toast.error("Report could not be saved on this device.");
                  }
                } else toast.error(e.message || "Submit failed.");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? "Submitting…" : "Submit report"}
          </Button>
        )}
      </div>
      {!isLiveMap && (
        <div className="pb-6">
          <DemoNote />
        </div>
      )}
    </div>
  );
}
