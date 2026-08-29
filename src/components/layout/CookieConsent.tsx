import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, ShieldCheck, X } from 'lucide-react';
import { Button } from '../ui';
import { supabase } from '../../lib/supabase';

const POLICY_VERSION = '2026-08-27';
const STORAGE_KEY = `wedplan_cookie_consent_${POLICY_VERSION}`;
const ANON_KEY = 'wedplan_anonymous_id';
const CONSENT_DAYS = 365;
const OPEN_PREFERENCES_EVENT = 'wedplan:open-cookie-preferences';

type ConsentPayload = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
};

type StoredConsent = ConsentPayload & {
  anonymous_id: string;
  policy_version: string;
  consented_at?: string;
  expires_at: string;
  user_id?: string | null;
};

const defaultConsent: ConsentPayload = {
  necessary: true,
  analytics: false,
  marketing: false,
  preferences: false,
};

const getAnonymousId = () => {
  const current = localStorage.getItem(ANON_KEY);
  if (current) return current;

  const next = crypto.randomUUID();
  localStorage.setItem(ANON_KEY, next);
  return next;
};

const getExpiryDate = () => {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + CONSENT_DAYS);
  return expiry.toISOString();
};

const isValidStoredConsent = (record?: Partial<StoredConsent> | null) => {
  if (!record?.necessary) return false;
  if (record.policy_version !== POLICY_VERSION) return false;
  if (!record.expires_at) return false;
  return new Date(record.expires_at).getTime() > Date.now();
};

const getStoredConsent = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    return isValidStoredConsent(parsed) ? parsed : null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

const toPayload = (record: Partial<ConsentPayload>): ConsentPayload => ({
  necessary: true,
  analytics: Boolean(record.analytics),
  marketing: Boolean(record.marketing),
  preferences: Boolean(record.preferences),
});

export const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [consent, setConsent] = useState<ConsentPayload>(defaultConsent);

  useEffect(() => {
    let mounted = true;

    const openPreferences = () => {
      const stored = getStoredConsent();
      setConsent(stored ? toPayload(stored) : defaultConsent);
      setSettingsOpen(true);
      setVisible(true);
    };

    window.addEventListener(OPEN_PREFERENCES_EVENT, openPreferences);

    const loadConsent = async () => {
      const stored = getStoredConsent();
      if (stored) {
        if (!mounted) return;
        setConsent(toPayload(stored));
        setVisible(false);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (userId) {
        const { data } = await supabase
          .from('cookie_consents')
          .select('anonymous_id, policy_version, necessary, analytics, marketing, preferences, expires_at, created_at')
          .eq('user_id', userId)
          .eq('policy_version', POLICY_VERSION)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data && isValidStoredConsent(data as StoredConsent)) {
          const record = data as StoredConsent;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
          if (!mounted) return;
          setConsent(toPayload(record));
          setVisible(false);
          return;
        }
      }

      if (mounted) setVisible(true);
    };

    loadConsent();

    return () => {
      mounted = false;
      window.removeEventListener(OPEN_PREFERENCES_EVENT, openPreferences);
    };
  }, []);

  const saveConsent = async (payload: ConsentPayload) => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id || null;
    const record = {
      ...toPayload(payload),
      anonymous_id: getAnonymousId(),
      policy_version: POLICY_VERSION,
      consented_at: new Date().toISOString(),
      expires_at: getExpiryDate(),
      user_id: userId,
      user_agent: navigator.userAgent,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    setVisible(false);
    setSettingsOpen(false);

    const { error } = await supabase.from('cookie_consents').insert(record);
    if (!error) return;

    const legacyRecord = {
      necessary: record.necessary,
      analytics: record.analytics,
      marketing: record.marketing,
      preferences: record.preferences,
      anonymous_id: record.anonymous_id,
      policy_version: record.policy_version,
      user_agent: record.user_agent,
    };

    const { error: legacyError } = await supabase.from('cookie_consents').insert(legacyRecord);
    if (legacyError) console.warn('[CookieConsent] Não foi possível registrar consentimento:', legacyError.message);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-4 py-4 shadow-2xl backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Cookie size={20} />
          </div>
          <div>
            <p className="text-sm font-black text-foreground">Privacidade e cookies</p>
            <p className="mt-1 max-w-3xl text-xs font-medium leading-5 text-muted-foreground">
              Usamos cookies necessários para o funcionamento do WedPlan. Cookies de análise, preferências e marketing só serão usados se você autorizar.{' '}
              <Link to="/politica-de-privacidade" className="font-black text-primary underline underline-offset-4">
                Política de Privacidade
              </Link>
            </p>

            {settingsOpen && (
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <Toggle label="Análise" checked={consent.analytics} onChange={(checked) => setConsent((current) => ({ ...current, analytics: checked }))} />
                <Toggle label="Preferências" checked={consent.preferences} onChange={(checked) => setConsent((current) => ({ ...current, preferences: checked }))} />
                <Toggle label="Marketing" checked={consent.marketing} onChange={(checked) => setConsent((current) => ({ ...current, marketing: checked }))} />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
          <Button variant="ghost" className="h-10 rounded-lg px-3 text-xs font-black" onClick={() => saveConsent(defaultConsent)}>
            <X size={15} />
            Recusar
          </Button>
          <Button variant="outline" className="h-10 rounded-lg px-3 text-xs font-black" onClick={() => setSettingsOpen((open) => !open)}>
            Preferências
          </Button>
          <Button
            className="h-10 rounded-lg px-3 text-xs font-black"
            onClick={() => saveConsent({ necessary: true, analytics: true, preferences: true, marketing: true })}
          >
            <ShieldCheck size={15} />
            Aceitar
          </Button>
          {settingsOpen && (
            <Button className="h-10 rounded-lg px-3 text-xs font-black" onClick={() => saveConsent(consent)}>
              Salvar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const Toggle = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-xs font-bold text-muted-foreground">
    <span>{label}</span>
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="h-4 w-4 accent-primary"
    />
  </label>
);
