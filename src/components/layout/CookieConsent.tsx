import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, ShieldCheck, X } from 'lucide-react';
import { Button } from '../ui';
import { supabase } from '../../lib/supabase';

const STORAGE_KEY = 'wedplan_cookie_consent_v1';
const ANON_KEY = 'wedplan_anonymous_id';

type ConsentPayload = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
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

export const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [consent, setConsent] = useState<ConsentPayload>(defaultConsent);

  useEffect(() => {
    setVisible(!localStorage.getItem(STORAGE_KEY));
  }, []);

  const saveConsent = async (payload: ConsentPayload) => {
    const record = {
      ...payload,
      anonymous_id: getAnonymousId(),
      policy_version: '2026-08-27',
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    setVisible(false);

    const { error } = await supabase.from('cookie_consents').insert(record);
    if (error) console.warn('[CookieConsent] Não foi possível registrar consentimento:', error.message);
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
