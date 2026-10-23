import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from './Button';

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('nd-install-dismissed') === '1');

  useEffect(() => {
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const handleInstalled = () => setInstallEvent(null);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (!installEvent || dismissed) return null;

  const install = async () => {
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  };

  const dismiss = () => {
    localStorage.setItem('nd-install-dismissed', '1');
    setDismissed(true);
  };

  return <div className="fixed inset-x-3 bottom-24 z-[70] mx-auto flex max-w-md items-center gap-3 border-4 border-[#2A3320] bg-[#FDFBF7] p-3 shadow-[5px_5px_0px_0px_#2A3320] lg:bottom-5 lg:left-auto lg:right-5 lg:mx-0">
    <Download size={20} className="shrink-0 text-[#4F5B2A]" />
    <div className="min-w-0 flex-1"><p className="text-xs font-black">Install NagarDrishti</p><p className="mt-1 text-[10px] text-[#2A3320]/65">Keep civic reporting one tap away.</p></div>
    <Button size="sm" onClick={install}>Install</Button>
    <button aria-label="Dismiss install prompt" onClick={dismiss} className="p-1"><X size={16}/></button>
  </div>;
}
