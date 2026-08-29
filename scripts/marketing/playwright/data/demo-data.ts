import path from 'node:path';

export type MarketingPlanCode = 'essential' | 'premium' | 'pro_couple' | 'pro_agency';

export type MarketingAccount = {
  code: MarketingPlanCode;
  label: string;
  email: string;
  password: string;
};

export type MarketingViewport = {
  name: 'desktop' | 'instagram' | 'story' | 'horizontal';
  width: number;
  height: number;
};

export type MarketingRoute = {
  id: string;
  label: string;
  path: string;
};

export const marketingOutputDir = path.resolve(process.cwd(), 'marketing-output');
export const publicMarketingScreenshotsDir = path.resolve(process.cwd(), 'public', 'marketing', 'screenshots');
export const authStateDir = path.resolve(process.cwd(), 'scripts', 'marketing', 'playwright', '.auth');

export const screenshotViewports: MarketingViewport[] = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'instagram', width: 1080, height: 1350 },
  { name: 'story', width: 1080, height: 1920 },
  { name: 'horizontal', width: 1200, height: 628 },
];

export const appMarketingRoutes: MarketingRoute[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/' },
  { id: 'budget', label: 'Financeiro', path: '/financeiro' },
  { id: 'guests', label: 'Convidados', path: '/convidados' },
  { id: 'checklist', label: 'Tarefas', path: '/tarefas' },
  { id: 'vendors', label: 'Fornecedores', path: '/fornecedores' },
  { id: 'timeline', label: 'Planejamento', path: '/planejamento' },
  { id: 'tools', label: 'Ferramentas', path: '/ferramentas' },
  { id: 'wedding-site', label: 'Site do Casal', path: '/site' },
];

const planLabels: Record<MarketingPlanCode, string> = {
  essential: 'Essencial',
  premium: 'Premium',
  pro_couple: 'Pro Casal',
  pro_agency: 'Pro Assessoria',
};

const planEnvPrefix: Record<MarketingPlanCode, string> = {
  essential: 'MARKETING_DEMO_ESSENTIAL',
  premium: 'MARKETING_DEMO_PREMIUM',
  pro_couple: 'MARKETING_DEMO_PRO_COUPLE',
  pro_agency: 'MARKETING_DEMO_PRO_AGENCY',
};

export const demoWedding = {
  couple: 'Mariana & Gabriel',
  dateLabel: '15/05/2027',
  guests: 148,
  confirmedGuests: 113,
  budgetLabel: 'R$ 62.000',
  vendors: 12,
  checklistProgress: '68%',
};

export function getBaseUrl() {
  return process.env.MARKETING_BASE_URL || 'http://127.0.0.1:5173';
}

export function storageStatePath(planCode: MarketingPlanCode) {
  return path.join(authStateDir, `${planCode}.json`);
}

export function getCapturePlanCodes(): MarketingPlanCode[] {
  const raw = process.env.MARKETING_CAPTURE_PLANS || 'pro_couple';
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item): item is MarketingPlanCode => item in planLabels);
}

export function getDemoAccounts() {
  const genericEmail = process.env.MARKETING_DEMO_EMAIL;
  const genericPassword = process.env.MARKETING_DEMO_PASSWORD;

  return getCapturePlanCodes().map((code) => {
    const prefix = planEnvPrefix[code];
    const email = process.env[`${prefix}_EMAIL`] || genericEmail;
    const password = process.env[`${prefix}_PASSWORD`] || genericPassword;

    if (!email || !password) {
      throw new Error(
        [
          `Credenciais demo ausentes para o plano ${code}.`,
          `Defina ${prefix}_EMAIL e ${prefix}_PASSWORD ou use MARKETING_DEMO_EMAIL/MARKETING_DEMO_PASSWORD.`,
          'Nunca use conta real de cliente para gerar materiais de marketing.',
        ].join(' ')
      );
    }

    return {
      code,
      label: planLabels[code],
      email,
      password,
    };
  });
}
