export type ClientEvidence = {
  locale: string | null;
  timezone: string | null;
  screenResolution: string | null;
  referrer: string | null;
  deviceType: 'desktop' | 'tablet' | 'mobile' | 'unknown';
  browserName: string | null;
  operatingSystem: string | null;
};

const detectDeviceType = (userAgent: string): ClientEvidence['deviceType'] => {
  if (/ipad|tablet/i.test(userAgent)) return 'tablet';
  if (/mobi|android|iphone|ipod/i.test(userAgent)) return 'mobile';
  if (userAgent) return 'desktop';
  return 'unknown';
};

const detectBrowserName = (userAgent: string) => {
  if (/edg\//i.test(userAgent)) return 'Microsoft Edge';
  if (/opr\//i.test(userAgent)) return 'Opera';
  if (/chrome|crios/i.test(userAgent)) return 'Chrome';
  if (/firefox|fxios/i.test(userAgent)) return 'Firefox';
  if (/safari/i.test(userAgent)) return 'Safari';
  return null;
};

const detectOperatingSystem = (userAgent: string) => {
  if (/windows/i.test(userAgent)) return 'Windows';
  if (/android/i.test(userAgent)) return 'Android';
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'iOS';
  if (/mac os|macintosh/i.test(userAgent)) return 'macOS';
  if (/linux/i.test(userAgent)) return 'Linux';
  return null;
};

export const getClientEvidence = (): ClientEvidence => {
  const userAgent = navigator.userAgent || '';
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  const screenResolution = window.screen?.width && window.screen?.height
    ? `${window.screen.width}x${window.screen.height}`
    : null;

  return {
    locale: navigator.language || null,
    timezone,
    screenResolution,
    referrer: document.referrer || null,
    deviceType: detectDeviceType(userAgent),
    browserName: detectBrowserName(userAgent),
    operatingSystem: detectOperatingSystem(userAgent),
  };
};
