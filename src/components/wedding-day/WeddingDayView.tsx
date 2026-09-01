import { useCallback, useEffect, useMemo, useState } from 'react';
import { Armchair, Edit2, Plus, Search, Trash2, UserPlus, Users, X } from 'lucide-react';
import { Badge, Button, Card, Input, useConfirm, cn } from '../ui';
import { supabase } from '../../lib/supabase';
import type { Guest, WeddingReceptionTable, WeddingTableGuest } from '../../types';

type TableWithGuests = WeddingReceptionTable & {
  guestIds: string[];
};

type TableForm = {
  name: string;
  chair_count: string;
  notes: string;
};

const emptyForm: TableForm = {
  name: '',
  chair_count: '8',
  notes: '',
};

const peopleCount = (guest?: Guest) => guest ? (guest.adultos || 0) + (guest.criancas || 0) : 0;

const isSeatEligible = (guest: Guest) =>
  guest.status !== 'recusado' && guest.categoria.trim().toLowerCase() !== 'staff';

export const WeddingDayView = ({ weddingId, guests }: { weddingId?: string; guests: Guest[] }) => {
  const { confirm, alert: customAlert, toast } = useConfirm();
  const [tables, setTables] = useState<TableWithGuests[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<TableForm>(emptyForm);
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [selectedGuestByTable, setSelectedGuestByTable] = useState<Record<string, string>>({});

  const guestsById = useMemo(
    () => new Map(guests.map((guest) => [guest.id, guest])),
    [guests]
  );

  const assignedGuestIds = useMemo(
    () => new Set(tables.flatMap((table) => table.guestIds)),
    [tables]
  );

  const availableGuests = useMemo(() => {
    const term = search.trim().toLowerCase();
    return guests
      .filter((guest) => isSeatEligible(guest) && !assignedGuestIds.has(guest.id))
      .filter((guest) => !term || guest.nome.toLowerCase().includes(term) || guest.categoria.toLowerCase().includes(term))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [assignedGuestIds, guests, search]);

  const totals = useMemo(() => {
    const seats = tables.reduce((sum, table) => sum + Number(table.chair_count || 0), 0);
    const allocatedGuests = tables.flatMap((table) => table.guestIds).length;
    const allocatedPeople = tables.reduce((sum, table) => (
      sum + table.guestIds.reduce((tableSum, guestId) => tableSum + peopleCount(guestsById.get(guestId)), 0)
    ), 0);
    const eligiblePeople = guests.filter(isSeatEligible).reduce((sum, guest) => sum + peopleCount(guest), 0);

    return {
      tables: tables.length,
      seats,
      allocatedGuests,
      allocatedPeople,
      unallocatedPeople: Math.max(eligiblePeople - allocatedPeople, 0),
    };
  }, [guests, guestsById, tables]);

  const loadTables = useCallback(async () => {
    if (!weddingId) {
      setTables([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [tablesResult, assignmentsResult] = await Promise.all([
        supabase
          .from('wedding_reception_tables')
          .select('*')
          .eq('wedding_id', weddingId)
          .order('sort_order')
          .order('name'),
        supabase
          .from('wedding_table_guests')
          .select('*')
          .eq('wedding_id', weddingId),
      ]);

      if (tablesResult.error) throw tablesResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;

      const assignments = (assignmentsResult.data || []) as WeddingTableGuest[];
      const assignmentsByTable = new Map<string, string[]>();
      assignments.forEach((assignment) => {
        const current = assignmentsByTable.get(assignment.table_id) || [];
        current.push(assignment.guest_id);
        assignmentsByTable.set(assignment.table_id, current);
      });

      setTables(((tablesResult.data || []) as WeddingReceptionTable[]).map((table) => ({
        ...table,
        guestIds: assignmentsByTable.get(table.id) || [],
      })));
    } catch (error) {
      console.error('[WeddingDayView] Erro ao carregar mesas:', error);
      setTables([]);
    } finally {
      setLoading(false);
    }
  }, [weddingId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTables();
  }, [loadTables]);

  const startEdit = (table: TableWithGuests) => {
    setEditingTableId(table.id);
    setForm({
      name: table.name,
      chair_count: String(table.chair_count),
      notes: table.notes || '',
    });
  };

  const resetForm = () => {
    setEditingTableId(null);
    setForm(emptyForm);
  };

  const saveTable = async () => {
    if (!weddingId || !form.name.trim()) return;

    setSaving(true);
    try {
      const payload = {
        wedding_id: weddingId,
        name: form.name.trim(),
        chair_count: Math.max(1, Number(form.chair_count) || 1),
        notes: form.notes.trim() || null,
        sort_order: editingTableId ? tables.find((table) => table.id === editingTableId)?.sort_order || 0 : tables.length,
      };

      if (editingTableId) {
        const { error } = await supabase
          .from('wedding_reception_tables')
          .update(payload)
          .eq('id', editingTableId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('wedding_reception_tables')
          .insert(payload);

        if (error) throw error;
      }

      resetForm();
      await loadTables();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar a mesa.';
      await customAlert({
        title: 'Não foi possível salvar',
        description: message,
        type: 'danger',
        confirmLabel: 'Entendi',
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteTable = async (table: TableWithGuests) => {
    const isConfirmed = await confirm({
      title: 'Excluir mesa?',
      description: `A mesa "${table.name}" será removida e os convidados dela voltarão para a lista sem mesa.`,
      type: 'danger',
      confirmLabel: 'Excluir mesa',
      cancelLabel: 'Cancelar',
    });

    if (!isConfirmed) return;

    const { error } = await supabase
      .from('wedding_reception_tables')
      .delete()
      .eq('id', table.id);

    if (error) {
      await customAlert({
        title: 'Não foi possível excluir',
        description: error.message,
        type: 'danger',
        confirmLabel: 'Entendi',
      });
      return;
    }

    toast({
      title: 'Mesa removida',
      description: 'Os convidados voltaram para a lista sem mesa.',
      type: 'success',
    });
    await loadTables();
  };

  const addGuestToTable = async (table: TableWithGuests) => {
    const guestId = selectedGuestByTable[table.id];
    const guest = guestsById.get(guestId);
    if (!weddingId || !guest) return;

    const occupied = table.guestIds.reduce((sum, id) => sum + peopleCount(guestsById.get(id)), 0);
    if (occupied + peopleCount(guest) > table.chair_count) {
      await customAlert({
        title: 'Mesa sem lugares suficientes',
        description: 'Essa mesa não tem cadeiras suficientes para esse convidado e acompanhantes.',
        type: 'warning',
        confirmLabel: 'Entendi',
      });
      return;
    }

    const { error: clearError } = await supabase
      .from('wedding_table_guests')
      .delete()
      .eq('guest_id', guestId);

    if (clearError) {
      await customAlert({
        title: 'Não foi possível alocar',
        description: clearError.message,
        type: 'danger',
        confirmLabel: 'Entendi',
      });
      return;
    }

    const { error } = await supabase
      .from('wedding_table_guests')
      .insert({
        wedding_id: weddingId,
        table_id: table.id,
        guest_id: guestId,
      });

    if (error) {
      await customAlert({
        title: 'Não foi possível alocar',
        description: error.message,
        type: 'danger',
        confirmLabel: 'Entendi',
      });
      return;
    }

    setSelectedGuestByTable((current) => ({ ...current, [table.id]: '' }));
    await loadTables();
  };

  const removeGuestFromTable = async (guestId: string) => {
    const { error } = await supabase
      .from('wedding_table_guests')
      .delete()
      .eq('guest_id', guestId);

    if (error) {
      await customAlert({
        title: 'Não foi possível remover',
        description: error.message,
        type: 'danger',
        confirmLabel: 'Entendi',
      });
      return;
    }

    toast({
      title: 'Convidado removido da mesa',
      type: 'success',
    });
    await loadTables();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Armchair size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-foreground">Dia do casamento</h2>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                Organize mesas, cadeiras e integrantes para a recepção.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-auto">
            <Metric label="Mesas" value={String(totals.tables)} />
            <Metric label="Cadeiras" value={String(totals.seats)} />
            <Metric label="Alocados" value={String(totals.allocatedPeople)} />
            <Metric label="Sem mesa" value={String(totals.unallocatedPeople)} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="h-fit border-border bg-card p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                {editingTableId ? 'Editar mesa' : 'Nova mesa'}
              </p>
              <h3 className="text-lg font-black text-foreground">Dados da mesa</h3>
            </div>
            {editingTableId && (
              <button
                type="button"
                onClick={resetForm}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Cancelar edição"
              >
                <X size={17} />
              </button>
            )}
          </div>

          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-black text-muted-foreground">Nome da mesa</span>
              <Input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Ex: Mesa Família Noiva"
                className="h-11 rounded-xl bg-secondary/40"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-black text-muted-foreground">Quantidade de cadeiras</span>
              <Input
                type="number"
                min="1"
                max="100"
                value={form.chair_count}
                onChange={(event) => setForm((current) => ({ ...current, chair_count: event.target.value }))}
                className="h-11 rounded-xl bg-secondary/40"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-black text-muted-foreground">Observações</span>
              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Ex: próxima à pista, idosos, crianças..."
                className="min-h-24 w-full resize-none rounded-xl border border-border bg-secondary/40 p-3 text-sm font-semibold text-foreground outline-none focus:border-primary/40"
              />
            </label>

            <Button
              type="button"
              className="h-12 w-full rounded-xl font-black"
              onClick={saveTable}
              disabled={saving || !form.name.trim() || !weddingId}
            >
              <Plus size={18} />
              {saving ? 'Salvando...' : editingTableId ? 'Salvar mesa' : 'Criar mesa'}
            </Button>
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar convidado sem mesa..."
                className="h-11 rounded-xl bg-secondary/40 pl-10"
              />
            </div>
            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
              {availableGuests.length === 0 ? (
                <p className="rounded-xl border border-border bg-secondary/20 p-3 text-center text-xs font-bold text-muted-foreground">
                  Nenhum convidado disponível para alocar.
                </p>
              ) : availableGuests.slice(0, 20).map((guest) => (
                <div key={guest.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/20 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-foreground">{guest.nome}</p>
                    <p className="text-xs font-semibold text-muted-foreground">{guest.categoria} · {peopleCount(guest)} pessoa(s)</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          {loading ? (
            <Card className="flex min-h-[320px] items-center justify-center border-border bg-card p-8 text-sm font-bold text-muted-foreground">
              Carregando mesas...
            </Card>
          ) : tables.length === 0 ? (
            <Card className="flex min-h-[320px] flex-col items-center justify-center border-border bg-card p-8 text-center">
              <Armchair className="mb-4 text-muted-foreground" size={42} />
              <h3 className="text-xl font-black text-foreground">Nenhuma mesa criada</h3>
              <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-muted-foreground">
                Crie a primeira mesa para começar a distribuir convidados e acompanhar a quantidade de cadeiras.
              </p>
            </Card>
          ) : tables.map((table) => {
            const tableGuests = table.guestIds
              .map((guestId) => guestsById.get(guestId))
              .filter((guest): guest is Guest => Boolean(guest));
            const occupiedPeople = tableGuests.reduce((sum, guest) => sum + peopleCount(guest), 0);
            const remainingSeats = table.chair_count - occupiedPeople;
            const isFull = remainingSeats === 0;
            const isOver = remainingSeats < 0;

            return (
              <Card key={table.id} className="overflow-hidden border-border bg-card p-0 shadow-sm">
                <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-xl font-black text-foreground">{table.name}</h3>
                      <Badge variant={isOver ? 'error' : isFull ? 'success' : 'outline'}>
                        {occupiedPeople}/{table.chair_count} lugares
                      </Badge>
                    </div>
                    {table.notes && <p className="mt-1 text-sm font-semibold text-muted-foreground">{table.notes}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => startEdit(table)}>
                      <Edit2 size={16} /> Editar
                    </Button>
                    <Button type="button" variant="outline" className="h-10 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => void deleteTable(table)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 p-5 lg:grid-cols-[1fr_280px]">
                  <div className="space-y-2">
                    {tableGuests.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-center text-sm font-bold text-muted-foreground">
                        Mesa sem integrantes.
                      </p>
                    ) : tableGuests.map((guest) => (
                      <div key={guest.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/20 px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Users size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-foreground">{guest.nome}</p>
                            <p className="text-xs font-semibold text-muted-foreground">{guest.categoria} · {peopleCount(guest)} pessoa(s)</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void removeGuestFromTable(guest.id)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Remover ${guest.nome} da mesa`}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-border bg-secondary/20 p-4">
                    <p className="mb-3 text-xs font-black uppercase tracking-widest text-muted-foreground">Adicionar integrante</p>
                    <select
                      value={selectedGuestByTable[table.id] || ''}
                      onChange={(event) => setSelectedGuestByTable((current) => ({ ...current, [table.id]: event.target.value }))}
                      className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground outline-none focus:border-primary/40"
                    >
                      <option value="">Selecione...</option>
                      {availableGuests.map((guest) => (
                        <option key={guest.id} value={guest.id}>
                          {guest.nome} - {peopleCount(guest)} pessoa(s)
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      className="mt-3 h-10 w-full rounded-xl font-black"
                      onClick={() => void addGuestToTable(table)}
                      disabled={!selectedGuestByTable[table.id]}
                    >
                      <UserPlus size={16} /> Adicionar
                    </Button>
                    <div className={cn(
                      'mt-4 rounded-xl px-3 py-2 text-xs font-black',
                      isOver ? 'bg-destructive/10 text-destructive' : isFull ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'
                    )}>
                      {isOver
                        ? `${Math.abs(remainingSeats)} pessoa(s) acima do limite`
                        : `${remainingSeats} cadeira(s) livre(s)`}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-border bg-secondary/20 px-4 py-3">
    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
    <p className="mt-1 text-xl font-black text-foreground">{value}</p>
  </div>
);
