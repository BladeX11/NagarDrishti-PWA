import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#F5EFE3] px-5 text-center text-[#2A3320]">
      <div className="flex h-16 w-16 items-center justify-center border-4 border-[#2A3320] bg-[#D8C9A8] shadow-[4px_4px_0px_0px_#2A3320]">
        <MapPin size={28} />
      </div>
      <p className="eyebrow mt-6">404 · wrong turn</p>
      <h1 className="display-title mt-3 text-3xl">This page isn’t on the map.</h1>
      <p className="mt-3 max-w-md text-sm text-[#2A3320]/65">
        Choose a dashboard below and keep exploring NagarDrishti.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className="inline-flex min-h-[44px] items-center gap-2 border-2 border-[#2A3320] bg-[#4F5B2A] px-4 py-3 text-xs font-black uppercase text-white sm:text-[10px]"
        >
          <ArrowLeft size={14} />
          Home
        </Link>
        <Link
          to="/transparency"
          className="inline-flex min-h-[44px] items-center border-2 border-[#2A3320] bg-[#FDFBF7] px-4 py-3 text-xs font-black uppercase sm:text-[10px]"
        >
          Public map
        </Link>
      </div>
    </main>
  );
}
