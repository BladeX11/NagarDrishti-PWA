import { useState, useEffect } from 'react';

// Mobile: width < 768px OR a mobile/tablet UA string
// This matches the PWA target: "installable on Android and desktop browsers"
// but the citizen PWA experience is designed for mobile-first.

function isMobileUA(): boolean {
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|Tablet|tablet/i.test(
    navigator.userAgent,
  );
}

function isMobileWidth(): boolean {
  return window.innerWidth < 768;
}

export type DeviceType = 'mobile' | 'desktop';

/**
 * Returns 'mobile' if the viewport is < 768px OR the user agent is a mobile device.
 * Reacts to window resize so the gate updates if the user resizes their browser.
 *
 * Integration note for web UI:
 * When the web UI is ready, the desktop team can remove this hook entirely
 * and render their own app at the /desktop/* route prefix, or replace the
 * DesktopPlaceholder in App.tsx directly.
 */
export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>(() =>
    isMobileUA() || isMobileWidth() ? 'mobile' : 'desktop',
  );

  useEffect(() => {
    function handleResize() {
      setDeviceType(isMobileUA() || isMobileWidth() ? 'mobile' : 'desktop');
    }

    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return deviceType;
}
