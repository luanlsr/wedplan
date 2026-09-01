import { supabase } from '../lib/supabase';

const SESSION_KEY = 'wedplan_observability_session_id';
const ANONYMOUS_KEY = 'wedplan_anonymous_id';
const MAX_METADATA_LENGTH = 8000;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type ObservabilityContext = {
  userId?: string | null;
  accountId?: string | null;
  weddingId?: string | null;
  role?: string | null;
};

type LogEventInput = {
  level?: LogLevel;
  eventName: string;
  source?: string;
  route?: string;
  entityType?: string;
  entityId?: string | null;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  error?: unknown;
};

let context: ObservabilityContext = {};

const shouldSendRemoteEvents = () =>
  import.meta.env.PROD || import.meta.env.VITE_ENABLE_REMOTE_OBSERVABILITY === 'true';

const sensitiveKeys = [
  'password',
  'senha',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'apikey',
  'api_key',
  'cpf',
  'cpfcnpj',
  'cpf_cnpj',
  'cnpj',
  'phone',
  'telefone',
  'mobilephone',
  'card',
  'cartao',
  'cvv',
];

const getOrCreateStorageValue = (key: string, storage: Storage) => {
  const current = storage.getItem(key);
  if (current) return current;

  const next = crypto.randomUUID();
  storage.setItem(key, next);
  return next;
};

export const getObservabilitySessionId = () => getOrCreateStorageValue(SESSION_KEY, sessionStorage);

export const getObservabilityAnonymousId = () => getOrCreateStorageValue(ANONYMOUS_KEY, localStorage);

export const setObservabilityContext = (next: ObservabilityContext) => {
  context = {
    ...context,
    ...next,
  };
};

const normalizeValue = (key: string, value: unknown): unknown => {
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (sensitiveKeys.some((sensitive) => normalizedKey.includes(sensitive))) return '[redacted]';

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
    };
  }

  if (Array.isArray(value)) return value.slice(0, 30).map((item) => sanitizeMetadata(item));

  if (value && typeof value === 'object') return sanitizeMetadata(value as Record<string, unknown>);

  return value;
};

const sanitizeMetadata = (metadata: Record<string, unknown>) => {
  const sanitized = Object.entries(metadata).reduce<Record<string, unknown>>((acc, [key, value]) => {
    acc[key] = normalizeValue(key, value);
    return acc;
  }, {});

  const serialized = JSON.stringify(sanitized);
  if (serialized.length <= MAX_METADATA_LENGTH) return sanitized;

  return {
    truncated: true,
    preview: serialized.slice(0, MAX_METADATA_LENGTH),
  };
};

const normalizeError = (error: unknown) => {
  if (!error) return { errorMessage: null, stack: null };
  if (error instanceof Error) return { errorMessage: error.message, stack: error.stack || null };
  if (typeof error === 'string') return { errorMessage: error, stack: null };

  const maybeError = error as { message?: string; error_description?: string; stack?: string };
  return {
    errorMessage: maybeError.message || maybeError.error_description || 'Erro desconhecido',
    stack: maybeError.stack || null,
  };
};

export const logEvent = async ({
  level = 'info',
  eventName,
  source = 'web',
  route = window.location.pathname,
  entityType,
  entityId,
  durationMs,
  metadata,
  error,
}: LogEventInput) => {
  const { errorMessage, stack } = normalizeError(error);
  const userId = context.userId || null;
  const payload = {
    level,
    event_name: eventName,
    source,
    route,
    user_id: userId,
    account_id: userId ? context.accountId || null : null,
    wedding_id: userId ? context.weddingId || null : null,
    role: context.role || null,
    anonymous_id: getObservabilityAnonymousId(),
    session_id: getObservabilitySessionId(),
    entity_type: entityType || null,
    entity_id: entityId || null,
    duration_ms: Number.isFinite(durationMs) ? Math.round(Number(durationMs)) : null,
    metadata: sanitizeMetadata(metadata || {}),
    error_message: errorMessage,
    stack,
    user_agent: navigator.userAgent,
  };

  if (import.meta.env.DEV) {
    const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'debug';
    console[method]('[observability]', eventName, payload);
  }

  if (!shouldSendRemoteEvents()) return;

  const { error: insertError } = await supabase.from('app_events').insert(payload);
  if (insertError && import.meta.env.DEV) {
    console.warn('[observability] Falha ao registrar evento:', insertError.message);
  }
};

export const logError = (eventName: string, error: unknown, metadata?: Record<string, unknown>) => {
  void logEvent({
    level: 'error',
    eventName,
    metadata,
    error,
  });
};

export const measureEvent = async <T>(
  eventName: string,
  callback: () => Promise<T>,
  metadata?: Record<string, unknown>
) => {
  const startedAt = performance.now();

  try {
    const result = await callback();
    await logEvent({
      level: 'info',
      eventName: `${eventName}.success`,
      durationMs: performance.now() - startedAt,
      metadata,
    });
    return result;
  } catch (error) {
    await logEvent({
      level: 'error',
      eventName: `${eventName}.failure`,
      durationMs: performance.now() - startedAt,
      metadata,
      error,
    });
    throw error;
  }
};
