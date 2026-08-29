import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Bug, Clock, RefreshCw, Search, ShieldCheck, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Badge, Button, Card, Input, cn } from '../ui';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type AppEvent = {
  id: string;
  occurred_at: string;
  level: LogLevel;
  event_name: string;
  source: string | null;
  route: string | null;
  user_id: string | null;
  account_id: string | null;
  wedding_id: string | null;
  role: string | null;
  anonymous_id: string | null;
  session_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  duration_ms: number | null;
  metadata: Record<string, unknown>;
  error_message: string | null;
  user_agent: string | null;
};

const levelLabels: Record<LogLevel | 'all', string> = {
  all: 'Todos',
  debug: 'Debug',
  info: 'Info',
  warn: 'Avisos',
  error: 'Erros',
};

const levelTone = (level: LogLevel) => {
  if (level === 'error') return 'error';
  if (level === 'warn') return 'warning';
  if (level === 'info') return 'success';
  return 'outline';
};

export function AdminLogs() {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<LogLevel | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    void fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('app_events')
        .select('id, occurred_at, level, event_name, source, route, user_id, account_id, wedding_id, role, anonymous_id, session_id, entity_type, entity_id, duration_ms, metadata, error_message, user_agent')
        .order('occurred_at', { ascending: false })
        .limit(200);

      if (level !== 'all') query = query.eq('level', level);

      const { data, error } = await query;
      if (error) throw error;

      setEvents((data || []) as AppEvent[]);
    } catch (err: any) {
      console.error('[AdminLogs] Erro ao carregar logs:', err);
      setError('Não foi possível carregar os logs. Verifique se a migration de observabilidade foi aplicada no Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchEvents();
  }, [level]);

  const filteredEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return events;

    return events.filter((event) => {
      const haystack = [
        event.event_name,
        event.level,
        event.source,
        event.route,
        event.role,
        event.error_message,
        event.entity_type,
        event.entity_id,
        event.user_id,
        event.account_id,
        event.wedding_id,
        event.session_id,
      ].filter(Boolean).join(' ').toLowerCase();

      return haystack.includes(term);
    });
  }, [events, search]);

  const counters = useMemo(() => ({
    total: events.length,
    errors: events.filter((event) => event.level === 'error').length,
    warnings: events.filter((event) => event.level === 'warn').length,
  }), [events]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/15 p-3 text-primary">
            <Bug size={24} />
          </div>
          <div>
            <h1 className="pt-1 text-2xl font-black uppercase tracking-widest">Observabilidade</h1>
            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Eventos, erros e rastreabilidade do sistema</p>
          </div>
        </div>
        <Button onClick={fetchEvents} disabled={loading} className="h-11 rounded-xl text-xs font-black uppercase tracking-widest">
          <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Eventos recentes" value={String(counters.total)} icon={Clock} />
        <MetricCard label="Avisos" value={String(counters.warnings)} icon={AlertTriangle} />
        <MetricCard label="Erros" value={String(counters.errors)} icon={ShieldCheck} />
      </div>

      <Card className="border-border/50 bg-secondary/20 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-xl flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por evento, rota, usuário, sessão ou erro..."
              className="rounded-xl bg-background pl-10 pr-10"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X size={15} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(levelLabels) as Array<LogLevel | 'all'>).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setLevel(item)}
                className={cn(
                  'h-10 rounded-xl border border-border px-3 text-xs font-black uppercase tracking-widest text-muted-foreground transition',
                  level === item && 'border-primary bg-primary text-white'
                )}
              >
                {levelLabels[item]}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {error && (
        <Card className="border-destructive/20 bg-destructive/10 p-4 text-sm font-bold text-destructive">
          {error}
        </Card>
      )}

      <Card className="overflow-hidden border-border/50 bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left">
                <th className="p-4 text-xs font-black uppercase tracking-wider text-muted-foreground">Quando</th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-muted-foreground">Nível</th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-muted-foreground">Evento</th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-muted-foreground">Rota</th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-muted-foreground">Usuário</th>
                <th className="p-4 text-xs font-black uppercase tracking-wider text-muted-foreground">Duração</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => {
                const expanded = expandedId === event.id;

                return (
                  <tr
                    key={event.id}
                    className="cursor-pointer border-b border-border/40 bg-card transition-colors hover:bg-accent/40"
                    onClick={() => setExpandedId(expanded ? null : event.id)}
                  >
                    <td className="p-4 align-top text-xs font-bold text-muted-foreground">
                      {new Date(event.occurred_at).toLocaleString('pt-BR')}
                      {expanded && <EventDetails event={event} />}
                    </td>
                    <td className="p-4 align-top">
                      <Badge variant={levelTone(event.level) as any}>{levelLabels[event.level]}</Badge>
                    </td>
                    <td className="p-4 align-top">
                      <p className="font-black text-foreground">{event.event_name}</p>
                      {event.error_message && <p className="mt-1 text-xs font-bold text-destructive">{event.error_message}</p>}
                    </td>
                    <td className="max-w-xs p-4 align-top text-xs font-bold text-muted-foreground">
                      <span className="line-clamp-2">{event.route || '-'}</span>
                    </td>
                    <td className="p-4 align-top text-xs font-bold text-muted-foreground">
                      {event.role || 'anon'}
                    </td>
                    <td className="p-4 align-top text-xs font-black text-muted-foreground">
                      {event.duration_ms ? `${event.duration_ms} ms` : '-'}
                    </td>
                  </tr>
                );
              })}

              {!loading && filteredEvents.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm font-bold text-muted-foreground">
                    Nenhum evento encontrado.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm font-bold text-muted-foreground">
                    Carregando logs...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

const MetricCard = ({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Clock }) => (
  <Card className="border-border/50 bg-secondary/20 p-5">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-black text-foreground">{value}</p>
      </div>
      <div className="rounded-xl bg-primary/10 p-3 text-primary">
        <Icon size={22} />
      </div>
    </div>
  </Card>
);

const EventDetails = ({ event }: { event: AppEvent }) => (
  <div className="mt-4 w-[620px] max-w-[80vw] rounded-xl border border-border bg-background p-4 text-left">
    <div className="grid gap-2 text-xs">
      <Detail label="ID" value={event.id} />
      <Detail label="Fonte" value={event.source || '-'} />
      <Detail label="Conta" value={event.account_id || '-'} />
      <Detail label="Casamento" value={event.wedding_id || '-'} />
      <Detail label="Sessão" value={event.session_id || '-'} />
      <Detail label="Entidade" value={event.entity_type ? `${event.entity_type}: ${event.entity_id || '-'}` : '-'} />
      <Detail label="User agent" value={event.user_agent || '-'} />
    </div>
    <pre className="mt-4 max-h-72 overflow-auto rounded-lg bg-secondary p-3 text-[11px] leading-5 text-muted-foreground">
      {JSON.stringify(event.metadata || {}, null, 2)}
    </pre>
  </div>
);

const Detail = ({ label, value }: { label: string; value: string }) => (
  <div className="grid grid-cols-[96px_1fr] gap-3">
    <span className="font-black uppercase tracking-wider text-muted-foreground">{label}</span>
    <span className="break-all font-bold text-foreground">{value}</span>
  </div>
);
