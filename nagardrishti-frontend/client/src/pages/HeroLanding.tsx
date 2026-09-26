import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, Html, Sparkles } from "@react-three/drei";
import {
  ArrowRight,
  BarChart3,
  Camera,
  Check,
  ChevronDown,
  Circle,
  Eye,
  MapPin,
  Menu,
  Shield,
  Square,
  Triangle,
  Users,
  X,
} from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { BoxGeometry } from "three";
import type { Group, Mesh } from "three";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const C = {
  parchment: "#F5EFE3",
  forest: "#2A3320",
  olive: "#4F5B2A",
  gold: "#B8892D",
  sand: "#D8C9A8",
  paper: "#FDFBF7",
  darkOlive: "#3A4420",
};

function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-end gap-1" aria-hidden="true">
        <span className="h-4 w-4 rounded-full bg-[#4F5B2A]" />
        <span className="h-4 w-4 bg-[#B8892D]" />
        <span className="mb-0.5 h-0 w-0 border-x-[8px] border-b-[14px] border-x-transparent border-b-[#D8C9A8]" />
      </div>
      <span className={`font-['Outfit'] text-sm font-black uppercase tracking-[0.22em] ${inverse ? "text-white" : "text-[#2A3320]"}`}>NagarDrishti</span>
    </div>
  );
}

function GeometricScene() {
  const group = useRef<Group>(null);
  const sphere = useRef<Mesh>(null);
  const cone = useRef<Mesh>(null);
  const cube = useRef<Mesh>(null);
  const torus = useRef<Mesh>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const cubes = useMemo(() => Array.from({ length: 11 }, (_, i) => ({
    position: [((i * 37) % 11 - 5) / 1.8, ((i * 19) % 9 - 4) / 2.1, ((i * 13) % 8 - 4) / 2.5] as [number, number, number],
    color: [C.olive, C.gold, C.sand][i % 3],
    scale: 0.12 + (i % 3) * 0.045,
  })), []);

  useFrame(({ pointer, clock }) => {
    const t = clock.getElapsedTime();
    if (group.current) {
      group.current.rotation.y += 0.0018;
      group.current.rotation.x += (pointer.y * 0.14 - group.current.rotation.x) * 0.025;
      group.current.rotation.z += (-pointer.x * 0.14 - group.current.rotation.z) * 0.025;
    }
    if (sphere.current) sphere.current.position.y = 1.55 + Math.sin(t * 1.4) * 0.22;
    if (cube.current) cube.current.rotation.y += 0.004;
    if (cone.current) cone.current.rotation.z += 0.006;
    if (torus.current) torus.current.rotation.x += 0.003;
  });

  return (
    <group ref={group}>
      <mesh ref={cube} position={[0, 0, 0]} onClick={() => { window.location.href = "/transparency"; }} onPointerOver={() => setHovered("PUBLIC MAP")} onPointerOut={() => setHovered(null)}>
        <boxGeometry args={[2.55, 2.55, 2.55]} />
        <meshStandardMaterial color={C.sand} flatShading roughness={1} />
        <lineSegments>
          <edgesGeometry args={[new BoxGeometry(2.58, 2.58, 2.58)]} />
          <lineBasicMaterial color={C.forest} linewidth={2} />
        </lineSegments>
      </mesh>
      <mesh ref={sphere} position={[-2.05, 1.55, 0.4]} onClick={() => { window.location.href = "/citizen"; }} onPointerOver={() => setHovered("CITIZEN REPORTING")} onPointerOut={() => setHovered(null)}>
        <sphereGeometry args={[0.86, 20, 12]} />
        <meshStandardMaterial color={C.gold} flatShading roughness={1} />
      </mesh>
      <mesh ref={cone} position={[2.25, -1.55, 0.3]} onClick={() => { window.location.href = "/officer"; }} onPointerOver={() => setHovered("OFFICER PORTAL")} onPointerOut={() => setHovered(null)}>
        <coneGeometry args={[1.15, 2.1, 4]} />
        <meshStandardMaterial color={C.olive} flatShading roughness={1} />
      </mesh>
      <mesh ref={torus} position={[0.25, 0.15, -1.45]} onClick={() => { window.location.href = "/transparency"; }} onPointerOver={() => setHovered("PUBLIC TRANSPARENCY")} onPointerOut={() => setHovered(null)}>
        <torusGeometry args={[1.78, 0.12, 8, 28]} />
        <meshStandardMaterial color={C.parchment} flatShading roughness={1} />
      </mesh>
      {cubes.map((item, i) => <Float key={i} speed={0.6 + (i % 3) * 0.2} rotationIntensity={0.8} floatIntensity={0.35}>
        <mesh position={item.position} scale={item.scale} rotation={[i * 0.6, i * 0.4, i * 0.25]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={item.color} flatShading roughness={1} />
        </mesh>
      </Float>)}
      {hovered && <Html position={[0, 3.35, 0]} center><div className="border-2 border-[#2A3320] bg-[#FDFBF7] px-3 py-2 text-[10px] font-black tracking-widest text-[#2A3320] shadow-[4px_4px_0px_0px_#2A3320]">{hovered}</div></Html>}
    </group>
  );
}

function HeroCanvas() {
  return <Canvas camera={{ position: [0, 0, 8], fov: 45 }} dpr={[1, 1.5]} frameloop="always">
    <ambientLight color={C.parchment} intensity={0.7} />
    <directionalLight position={[5, 7, 6]} color="#fff7e6" intensity={3} />
    <Suspense fallback={<Html center><div className="font-black tracking-widest text-[#D8C9A8]">LOADING CITY...</div></Html>}>
      <GeometricScene />
      <Sparkles count={35} scale={8} size={2} speed={0.2} color={C.sand} />
    </Suspense>
    <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
  </Canvas>;
}


function MapPreview3D() {
  const mapNode = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mapNode.current) return;
    const map = L.map(mapNode.current, { zoomControl: true, scrollWheelZoom: false }).setView([18.5204, 73.8567], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    const issues = [
      [18.5314, 73.8446, C.gold, "Open · Footpath obstruction"], [18.5162, 73.8567, C.olive, "In progress · Streetlight repair"],
      [18.5059, 73.8668, C.sand, "Resolved · Waste pickup"], [18.5421, 73.8512, C.gold, "Open · Water leak"],
      [18.5238, 73.8784, C.olive, "In progress · Road resurfacing"], [18.4945, 73.8429, C.sand, "Resolved · Drainage"],
    ] as const;
    issues.forEach(([lat, lng, color, title]) => {
      const icon = L.divIcon({ className: "civic-leaflet-pin", html: `<span style="background:${color}"></span>`, iconSize: [22, 22], iconAnchor: [11, 11] });
      L.marker([lat, lng], { icon, title }).addTo(map).bindTooltip(title, { direction: "top", offset: [0, -10] }).on("click", () => { window.location.href = "/transparency"; });
    });
    window.setTimeout(() => map.invalidateSize(), 100);
    return () => { map.remove(); };
  }, []);
  return <div ref={mapNode} className="absolute inset-0" aria-label="Interactive Pune civic issue map" />;
}

const steps = [
  ["01", "REPORT", "Snap a photo, drop a pin, choose a category. AI suggests, you confirm. 20 seconds.", "gold"],
  ["02", "TRIAGE", "Officers receive prioritised queues with explainable urgency scores. No issue gets buried.", "olive"],
  ["03", "PROVE", "Resolution requires photo evidence. Our system flags reused, stale, or wrong-location proof.", "sand"],
  ["04", "VERIFY", "You decide if the fix is real. Two nearby not-fixed votes automatically reopen the issue.", "gold"],
];
const features = [
  [MapPin, "PRIVACY-FIRST MAPPING", "Locations are coarsened to ward/street level. No doorstep coordinates published. Ever."],
  [Eye, "AI CLASSIFICATION", "Category, department, and urgency suggested in seconds. Always editable. Never final."],
  [Users, "DUPLICATE DETECTION", "Found a nearby report? Support it instead of filing again. Community demand, not noise."],
  [Shield, "PROOF-OF-FIX VERIFICATION", "Officers must submit photo evidence. Reused or stale images are flagged automatically."],
  [Check, "CITIZEN VERIFICATION", "You vote on whether the fix is real. Two no votes reopen the ticket. Closure requires truth."],
  [BarChart3, "WARD SCORECARDS", "Department performance, SLA compliance, reopen rates — all public. No individual officers named."],
];

function ButtonLink({ href, children, inverse = false }: { href: string; children: React.ReactNode; inverse?: boolean }) {
  return <a href={href} className={`inline-flex items-center justify-center gap-3 border-4 border-[#2A3320] px-6 py-4 font-['Outfit'] text-sm font-black uppercase tracking-widest shadow-[7px_7px_0px_0px_#2A3320] transition-all duration-150 hover:-translate-y-1 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${inverse ? "bg-transparent text-white hover:bg-white hover:text-[#2A3320]" : "bg-[#B8892D] text-[#2A3320] hover:bg-[#D8C9A8]"}`}>{children}</a>;
}

export default function HeroLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => { const onScroll = () => setScrolled(window.scrollY > 30); window.addEventListener("scroll", onScroll); return () => window.removeEventListener("scroll", onScroll); }, []);
  return <div className="hero-landing min-h-screen overflow-x-hidden bg-[#F5EFE3] text-[#2A3320]">
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-[#B8892D] focus:px-4 focus:py-3 focus:font-black">SKIP TO CONTENT</a>
    <header className={`fixed inset-x-0 top-0 z-50 border-b-4 border-[#2A3320] transition-shadow ${scrolled ? "bg-[#F5EFE3]/95 shadow-[0_4px_0px_0px_#2A3320]" : "bg-[#F5EFE3]"}`}>
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-5 lg:px-10"><a href="/"><BrandMark /></a>
        <nav className="hidden items-center gap-7 lg:flex"><a href="/transparency" className="nav-link">EXPLORE</a><a href="#features" className="nav-link">ABOUT</a><a href="#how-it-works" className="nav-link">HOW IT WORKS</a><a href="/transparency/scorecards" className="nav-link">SCORECARDS</a></nav>
        <div className="hidden items-center gap-3 md:flex"><a href="/citizen" className="pill-button bg-[#4F5B2A] text-white">CITIZEN LOGIN</a><a href="/officer" className="pill-button border-2 border-[#2A3320] bg-transparent text-[#2A3320]">OFFICER PORTAL</a></div>
        <button className="border-2 border-[#2A3320] p-2 lg:hidden" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu /></button>
      </div>
    </header>
    {menuOpen && <div className="fixed inset-0 z-[60] flex flex-col bg-[#4F5B2A] p-6 text-white"><div className="flex items-center justify-between"><BrandMark inverse /><button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="border-2 border-white p-2"><X /></button></div><nav className="mt-16 flex flex-col gap-6 text-3xl font-black uppercase tracking-tight"><a onClick={() => setMenuOpen(false)} href="#features">ABOUT</a><a onClick={() => setMenuOpen(false)} href="#how-it-works">HOW IT WORKS</a><a href="/transparency">EXPLORE PUBLIC DATA</a><a href="/transparency/scorecards">SCORECARDS</a></nav><div className="mt-auto grid gap-3"><a className="border-4 border-[#2A3320] bg-[#B8892D] px-5 py-4 text-center font-black text-[#2A3320]" href="/citizen">I'M A CITIZEN</a><a className="border-4 border-[#2A3320] bg-[#D8C9A8] px-5 py-4 text-center font-black text-[#2A3320]" href="/officer">I'M AN OFFICER</a></div></div>}
    <main id="main">
      <section className="border-b-4 border-[#2A3320] bg-[#4F5B2A] pt-[68px] text-white"><div className="mx-auto grid min-h-[720px] max-w-[1440px] lg:grid-cols-2"><div className="relative z-10 flex flex-col justify-center px-6 py-20 sm:px-12 lg:px-16 lg:py-24"><p className="mb-6 font-['Outfit'] text-xs font-black uppercase tracking-[0.28em] text-[#D8C9A8]">Civic transparency platform</p><h1 className="max-w-2xl whitespace-nowrap font-['Outfit'] text-6xl font-black uppercase leading-[0.86] tracking-[-0.08em] sm:text-8xl lg:text-[5.45rem] xl:text-[6.5rem]">Your city.<br />Your voice.<br /><span className="text-[#D8C9A8]">Your lens.</span></h1><p className="mt-8 max-w-xl font-['Outfit'] text-lg font-medium leading-relaxed text-[#D8C9A8]">Report neighbourhood issues in 20 seconds. Track progress publicly. Challenge false closures. Hold departments accountable — not individuals.</p><div className="mt-9 flex flex-wrap gap-4"><ButtonLink href="/citizen/report">Report an issue <ArrowRight size={18} /></ButtonLink><ButtonLink href="/transparency" inverse>Explore issues <ArrowRight size={18} /></ButtonLink></div><p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-[#D8C9A8]/80">247 issues tracked · 12 wards active · 89% acted upon</p></div><div className="relative min-h-[440px] lg:min-h-0"><div className="absolute inset-0 opacity-90"><HeroCanvas /></div><div className="pointer-events-none absolute bottom-8 left-8 border-l-4 border-[#B8892D] pl-4 text-xs font-black uppercase tracking-[0.18em] text-[#D8C9A8]">Interactive civic geometry<br /><span className="font-medium tracking-normal">Click a form to enter a role</span></div></div></div></section>
      <section className="grid border-b-4 border-[#2A3320] bg-[#D8C9A8] md:grid-cols-2 lg:grid-cols-4">{[["247", "ISSUES FILED", "square"], ["89%", "ACTED UPON", "circle"], ["12", "WARDS ACTIVE", "diamond"], ["1.2K", "CIVIC VOTES", "square"]].map(([num, label, shape], i) => <div key={label} className="flex flex-col items-center border-b-4 border-[#2A3320] p-8 text-center last:border-0 md:border-r-4 md:last:border-r-0 lg:border-b-0"><div className={`mb-4 flex h-16 w-16 items-center justify-center border-4 border-[#2A3320] shadow-[4px_4px_0px_0px_#2A3320] ${shape === "circle" ? "rounded-full" : shape === "diamond" ? "rotate-45" : ""} ${i === 1 ? "bg-[#B8892D]" : i === 2 ? "bg-[#D8C9A8]" : "bg-[#4F5B2A]"}`}><span className="text-white">{i === 0 ? <Square size={22} /> : i === 1 ? <Circle size={22} /> : i === 2 ? <Triangle size={22} /> : <BarChart3 size={22} />}</span></div><strong className="font-['Outfit'] text-5xl font-black tracking-[-0.08em]">{num}</strong><span className="mt-2 font-['Outfit'] text-xs font-black uppercase tracking-[0.18em] text-[#4F5B2A]">{label}</span></div>)}</section>
      <section id="how-it-works" className="border-b-4 border-[#2A3320] px-6 py-20 lg:px-12 lg:py-28"><div className="mx-auto max-w-[1440px]"><p className="eyebrow">The process</p><h2 className="section-title">From report to resolution</h2><div className="relative mt-14 grid gap-0 md:grid-cols-2 lg:grid-cols-4">{steps.map(([number, title, body, color], i) => <article key={number} className="group relative border-4 border-[#2A3320] bg-[#FDFBF7] p-8 transition-all duration-200 hover:-translate-y-1 lg:-ml-1 lg:first:ml-0"><div className={`mx-auto mb-7 flex h-14 w-14 rotate-45 items-center justify-center border-4 border-[#2A3320] shadow-[4px_4px_0px_0px_#2A3320] ${color === "gold" ? "bg-[#B8892D]" : color === "sand" ? "bg-[#D8C9A8]" : "bg-[#4F5B2A]"}`}><span className={`-rotate-45 font-black ${color === "sand" ? "text-[#2A3320]" : "text-white"}`}>{number}</span></div><h3 className="text-center font-black uppercase tracking-wider">{title}</h3><p className="mt-3 text-center text-sm font-medium leading-relaxed text-[#2A3320]/70">{body}</p><span className={`absolute right-3 top-3 h-3 w-3 ${i === 1 ? "bg-[#4F5B2A]" : i === 2 ? "bg-[#D8C9A8]" : "rounded-full bg-[#B8892D]"}`} /></article>)}</div></div></section>
      <section id="features" className="border-b-4 border-[#2A3320] bg-[#4F5B2A] px-6 py-20 text-white lg:px-12 lg:py-28"><div className="mx-auto max-w-[1440px]"><p className="eyebrow text-[#D8C9A8]">Capabilities</p><h2 className="section-title text-white">Built for trust, not theatre</h2><div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{features.map(([Icon, title, body]) => <article key={title as string} className="relative border-4 border-[#2A3320] bg-[#FDFBF7] p-6 text-[#2A3320] shadow-[8px_8px_0px_0px_#2A3320] transition-all duration-200 hover:-translate-y-1"><div className="mb-5 flex h-12 w-12 items-center justify-center border-4 border-[#2A3320] bg-white shadow-[4px_4px_0px_0px_#2A3320]"><Icon size={23} className="text-[#4F5B2A]" /></div><h3 className="font-black uppercase tracking-wider">{title as string}</h3><p className="mt-3 text-sm font-medium leading-relaxed text-[#2A3320]/70">{body as string}</p><span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[#B8892D]" /></article>)}</div></div></section>
      <section className="border-b-4 border-[#2A3320] px-6 py-20 lg:px-12 lg:py-28"><div className="mx-auto max-w-[1440px]"><p className="eyebrow">Live demo</p><h2 className="section-title">See what's happening near you</h2><p className="mt-4 font-medium text-[#2A3320]/70">Synthetic demo data shown below. Real issues, real accountability — once deployed.</p><div className="relative mx-auto mt-10 h-[420px] max-w-5xl overflow-hidden border-4 border-[#2A3320] bg-[#D8C9A8] shadow-[8px_8px_0px_0px_#2A3320]"><MapPreview3D /><div className="absolute bottom-4 left-4 z-10 flex gap-4 border-4 border-[#2A3320] bg-[#FDFBF7] px-4 py-3 text-[10px] font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_#2A3320]"><span><i className="mr-2 inline-block h-3 w-3 rounded-full bg-[#B8892D]" />Open</span><span><i className="mr-2 inline-block h-3 w-3 rounded-full bg-[#4F5B2A]" />In progress</span><span><i className="mr-2 inline-block h-3 w-3 rounded-full bg-[#D8C9A8]" />Resolved</span></div><a href="/transparency" className="absolute bottom-4 right-4 z-10 border-4 border-[#2A3320] bg-[#4F5B2A] px-4 py-3 text-xs font-black uppercase tracking-wider text-white shadow-[4px_4px_0px_0px_#2A3320]">Explore map →</a></div></div></section>
      <section className="grid gap-12 border-b-4 border-[#2A3320] bg-[#B8892D] px-6 py-20 lg:grid-cols-2 lg:px-12 lg:py-24"><div className="mx-auto max-w-xl"><p className="eyebrow text-[#2A3320]">Why it matters</p><h2 className="section-title">Built on transparency</h2><p className="mt-6 text-lg font-medium leading-relaxed text-[#2A3320]/80">Every civic system claims accountability. NagarDrishti enforces it through architecture, not promises.</p></div><div className="mx-auto w-full max-w-xl">{[["TAMPER-EVIDENT HISTORY", "Every status change is hash-chained. Modifications are detectable."], ["PRIVACY BY DESIGN", "Locations are coarsened. No names, phone numbers, or exact coordinates are published."], ["AI ASSISTS, HUMANS DECIDE", "All suggestions are editable. No model can reject, close, or punish autonomously."], ["CITIZEN VETO POWER", "Closures require proof. Verification requires your vote. False fixes get reopened."]].map(([title, body]) => <div key={title} className="flex gap-4 border-b-2 border-[#2A3320]/30 py-4"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[#2A3320] bg-[#D8C9A8]"><Check size={16} strokeWidth={3} /></div><div><strong className="text-sm font-black uppercase tracking-wider">{title}</strong><p className="mt-1 text-sm font-medium text-[#2A3320]/70">{body}</p></div></div>)}</div></section>
      <section className="border-b-4 border-[#2A3320] px-6 py-20 lg:px-12 lg:py-28"><div className="mx-auto max-w-[1440px]"><p className="eyebrow">Get started</p><h2 className="section-title">Choose your role</h2><p className="mt-4 font-medium text-[#2A3320]/70">NagarDrishti serves different users with purpose-built experiences.</p><div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">{[[Camera, "CITIZEN", "Report issues, track progress, support neighbours, and verify fixes.", "/citizen", "bg-[#4F5B2A]"], [Shield, "OFFICER", "Triage queue, assign departments, upload proof-of-fix, manage workflow.", "/officer", "bg-[#B8892D]"], [Eye, "PUBLIC", "Explore the issue map, ward scorecards, SLA breaches, and forgotten issues.", "/transparency", "bg-[#D8C9A8]"], [BarChart3, "RESEARCHER", "Inspect model predictions, audit ledger, duplicate analysis, and metrics.", "/research", "bg-[#4F5B2A]"]].map(([Icon, title, body, href, color]) => <a key={title as string} href={href as string} className="group relative border-4 border-[#2A3320] bg-white p-8 shadow-[8px_8px_0px_0px_#2A3320] transition-all duration-200 hover:-translate-y-2"><div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#2A3320] ${color} shadow-[4px_4px_0px_0px_#2A3320] transition-transform group-hover:scale-110`}><Icon className={color === "bg-[#D8C9A8]" ? "text-[#2A3320]" : "text-white"} size={32} /></div><h3 className="text-center text-xl font-black uppercase tracking-wider">{title as string}</h3><p className="mt-3 text-center text-sm font-medium leading-relaxed text-[#2A3320]/70">{body as string}</p><div className="mt-6 text-center"><span className="inline-flex border-4 border-[#2A3320] bg-[#4F5B2A] px-5 py-3 text-sm font-black uppercase tracking-wider text-white shadow-[4px_4px_0px_0px_#2A3320]">Enter dashboard →</span></div><span className="absolute right-3 top-3 h-3 w-3 rounded-full bg-[#B8892D]" /></a>)}</div></div></section>
      <section className="relative overflow-hidden border-b-4 border-[#2A3320] bg-[#D8C9A8] px-6 py-20 text-center lg:py-28"><div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[#4F5B2A]/20" /><div className="absolute -bottom-10 -right-10 h-32 w-32 rotate-45 bg-[#B8892D]/20" /><div className="relative mx-auto max-w-3xl"><h2 className="section-title">Ready to make your neighbourhood visible?</h2><p className="mx-auto mt-5 max-w-xl text-lg font-medium text-[#2A3320]/70">Join the citizens who believe public issues deserve public accountability.</p><div className="mt-9 flex flex-wrap justify-center gap-4"><ButtonLink href="/citizen/report">Start reporting <ArrowRight size={18} /></ButtonLink><ButtonLink href="/transparency" inverse>Explore issues <ArrowRight size={18} /></ButtonLink></div></div></section>
    </main>
    <footer className="bg-[#2A3320] px-6 py-14 text-white lg:px-12"><div className="mx-auto grid max-w-[1440px] gap-10 sm:grid-cols-2 lg:grid-cols-4"><div><BrandMark inverse /><p className="mt-5 font-medium text-[#D8C9A8]">Civic issues, clearly seen.</p><p className="mt-3 text-sm text-white/50">A research prototype by the CivicLens team.</p></div><div><h3 className="footer-heading">Platform</h3><a className="footer-link" href="/citizen">Citizen dashboard</a><a className="footer-link" href="/officer">Officer console</a><a className="footer-link" href="/transparency">Public map</a><a className="footer-link" href="/research">Research portal</a></div><div><h3 className="footer-heading">Transparency</h3><a className="footer-link" href="/transparency/scorecards">Ward scorecards</a><a className="footer-link" href="/transparency/sla-breaches">SLA breaches</a><a className="footer-link" href="/transparency/forgotten">Forgotten issues</a><a className="footer-link" href="/transparency">Open data export</a></div><div><h3 className="footer-heading">Project</h3><a className="footer-link" href="#features">About CivicLens</a><a className="footer-link" href="#main">Privacy notice</a><a className="footer-link" href="#how-it-works">Documentation</a><a className="footer-link" href="https://github.com">GitHub repository</a></div></div><div className="mx-auto mt-12 flex max-w-[1440px] flex-col gap-3 border-t-2 border-white/20 pt-6 text-xs font-bold uppercase tracking-wider text-[#D8C9A8] sm:flex-row sm:justify-between"><span>© 2026 NagarDrishti · Demo prototype with synthetic data</span><span>⌖ Public pins are coarsened to protect privacy</span></div></footer>
  </div>;
}
