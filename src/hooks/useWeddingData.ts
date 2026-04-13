import { useState, useEffect, useCallback } from "react";
import type { WeddingData, Supplier, Installment, Guest, Task } from "../types";
import { INITIAL_DATA } from "../data/initialData";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

const STORAGE_KEY = "wedding_manager_data";

export const useWeddingData = () => {
  const { user } = useAuth();
  const [data, setData] = useState<WeddingData>(INITIAL_DATA);
  const [loading, setLoading] = useState(true);

  // Helper to ensure a wedding exists for the user
  const ensureWeddingExists = async (userId: string) => {
    try {
      console.log('Iniciando verificação de sanidade para o usuário:', userId);
      
      // 0. Garantir perfil (Upsert evita 409 se o registro existir mas o SELECT falhar por RLS)
      await supabase.from('profiles').upsert({
        id: userId,
        email: user?.email || '',
        full_name: user?.user_metadata?.full_name || 'Usuário'
      }, { onConflict: 'id' });

      // 1. Buscar casamento vinculado
      const { data: membership } = await supabase
        .from('wedding_members')
        .select('wedding_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (membership?.wedding_id) {
        console.log('Casamento vinculado encontrado:', membership.wedding_id);
        return membership.wedding_id;
      }

      console.log('Nenhum vínculo encontrado. Criando novo casamento...');
      // 2. Criar casamento (Se o SELECT falhou, o INSERT pode falhar se já existir, então usamos lógica de RLS manual)
      const { data: newWedding, error: wError } = await supabase
        .from('weddings')
        .insert({
          couple_name1: INITIAL_DATA.casal.nome1 || 'Cônjuge 1',
          couple_name2: INITIAL_DATA.casal.nome2 || 'Cônjuge 2',
          wedding_date: INITIAL_DATA.casal.data || null,
          total_budget: INITIAL_DATA.configuracoes.orcamentoTotal,
          theme: INITIAL_DATA.configuracoes.tema,
          creator_id: userId
        })
        .select()
        .single();

      if (wError) {
        console.error('Erro ao criar casamento:', wError);
        // Se der erro aqui, talvez o casamento já exista mas não temos permissão de ver
        throw wError;
      }

      // 3. Vincular (Upsert evita o erro 409 que você viu)
      const { error: memError } = await supabase.from('wedding_members').upsert({
        wedding_id: newWedding.id,
        user_id: userId,
        role: 'owner'
      }, { onConflict: 'wedding_id,user_id' });

      if (memError) {
        console.error('Erro ao vincular membro:', memError);
        throw memError;
      }

      return newWedding.id;
    } catch (err) {
      console.error('Falha no motor de dados:', err);
      // Fallback: tentar buscar qualquer casamento que o usuário criou se o fluxo acima falhar
      const { data: fallback } = await supabase.from('weddings').select('id').eq('creator_id', userId).limit(1).maybeSingle();
      if (fallback) return fallback.id;
      throw err;
    }
  };

  const loadData = useCallback(async () => {
    if (!user) {
      console.log('No user authenticated, using local search.');
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setData(JSON.parse(stored));
      setLoading(false);
      return;
    }

    // Only show global loading on the very first load
    if (!data.id) {
      setLoading(true);
    }
    try {
      console.log('Loading Supabase data for user:', user.id);
      const weddingId = await ensureWeddingExists(user.id);
      
      const { data: wedding, error: weddingError } = await supabase
        .from('weddings')
        .select('*')
        .eq('id', weddingId)
        .single();

      if (weddingError) {
        console.error('Error fetching wedding details:', weddingError);
        throw weddingError;
      }

      console.log('Fetching related modules...');
      const [
        { data: suppliersData, error: sErr },
        { data: guestsData, error: gErr },
        { data: tasksData, error: tErr },
        { data: simulationData, error: simErr }
      ] = await Promise.all([
        supabase.from('suppliers').select('*, parcelas:installments(*)').eq('wedding_id', weddingId).order('order_index'),
        supabase.from('guests').select('*').eq('wedding_id', weddingId).order('name'),
        supabase.from('tasks').select('*').eq('wedding_id', weddingId).order('order_index'),
        supabase.from('planning_simulations').select('*').eq('wedding_id', weddingId).maybeSingle()
      ]);

      if (sErr) console.error('Suppliers Load Error:', sErr);
      if (gErr) console.error('Guests Load Error:', gErr);
      if (tErr) console.error('Tasks Load Error:', tErr);
      if (simErr) console.error('Simulation Load Error:', simErr);

      const transformedData: WeddingData = {
        id: wedding.id,
        casal: {
          nome1: wedding.couple_name1 || '',
          nome2: wedding.couple_name2 || '',
          data: wedding.wedding_date || '',
        },
        fornecedores: (suppliersData || []).map((s: any) => ({
          id: s.id,
          fornecedor: s.name,
          servico: s.service,
          categoria: s.category,
          valorTotal: parseFloat(s.total_value),
          tipoPagamento: s.payment_type,
          status: s.status,
          dataContrato: s.contract_date,
          regraPagamento: s.payment_rule,
          observacoes: s.notes,
          order: s.order_index,
          valorEntrada: parseFloat(s.entry_value),
          porcentagemEntrada: parseFloat(s.entry_percentage),
          entradaEmParcelas: s.entry_installments,
          numeroParcelas: s.num_installments,
          diasPagamentoFinalAntesCasamento: s.final_payment_days_before,
          parcelas: (s.parcelas || []).map((p: any) => ({
            id: p.id,
            numero: p.number,
            dataVencimento: p.due_date,
            valor: parseFloat(p.value),
            status: p.status,
            dataPagamento: p.payment_date
          })).sort((a: any, b: any) => a.numero - b.numero)
        })),
        convidados: (guestsData || []).map((g: any) => ({
          id: g.id,
          nome: g.name,
          categoria: g.category,
          status: g.status,
          adultos: g.adults_count,
          criancas: g.children_count,
          telefone: g.phone,
          observacoes: g.notes
        })),
        tarefas: (tasksData || []).map((t: any) => ({
          id: t.id,
          titulo: t.title,
          descricao: t.description,
          categoria: t.category,
          dataLimite: t.due_date,
          status: t.status,
          ordem: t.order_index
        })),
        configuracoes: {
          orcamentoTotal: parseFloat(wedding.total_budget),
          tema: wedding.theme || 'light'
        },
        simulation: simulationData ? {
          step: simulationData.current_step,
          index: simulationData.current_month_index,
          aportes: simulationData.simulated_aportes
        } : undefined
      };

      console.log('Transformed Data Ready. id:', transformedData.id);
      setData(transformedData);
    } catch (error) {
      console.error('Critical load failure:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Suppliers CRUD
  const addSupplier = async (supplier: Omit<Supplier, 'id'>) => {
    console.log('Adding supplier...', supplier.fornecedor);
    if (!user) {
      const newSupplier = { ...supplier, id: crypto.randomUUID() } as Supplier;
      setData(prev => ({ ...prev, fornecedores: [...prev.fornecedores, newSupplier] }));
      return;
    }

    if (!data.id) {
      console.error('Cant add supplier: No wedding_id');
      return;
    }

    try {
      const { data: sData, error: sError } = await supabase.from('suppliers').insert({
        wedding_id: data.id,
        name: supplier.fornecedor,
        service: supplier.servico,
        category: supplier.categoria,
        total_value: supplier.valorTotal,
        payment_type: supplier.tipoPagamento,
        status: supplier.status,
        contract_date: supplier.dataContrato,
        payment_rule: supplier.regraPagamento,
        notes: supplier.observacoes,
        entry_value: supplier.valorEntrada || 0,
        entry_percentage: supplier.porcentagemEntrada || 0,
        entry_installments: supplier.entradaEmParcelas || 0,
        num_installments: supplier.numeroParcelas || 0,
        final_payment_days_before: supplier.diasPagamentoFinalAntesCasamento || 15,
        order_index: supplier.order || 0
      }).select().single();

      if (sError) throw sError;

      if (sData && supplier.parcelas && supplier.parcelas.length > 0) {
        console.log('Inserting installments for supplier:', sData.id);
        const installments = supplier.parcelas.map(p => ({
          supplier_id: sData.id,
          number: p.numero,
          due_date: p.dataVencimento,
          value: p.valor,
          status: p.status,
          payment_date: p.dataPagamento
        }));
        const { error: iErr } = await supabase.from('installments').insert(installments);
        if (iErr) console.error('Error saving installments:', iErr);
      }

      console.log('Supplier and installments saved to Supabase.');
      loadData();
    } catch (err) {
      console.error('Failed to add supplier:', err);
    }
  };

  const updateSupplier = async (id: string, updated: Partial<Supplier>) => {
    console.log('Updating supplier:', id, updated);
    if (!user) {
      setData(prev => ({
        ...prev,
        fornecedores: prev.fornecedores.map(s => s.id === id ? { ...s, ...updated } : s)
      }));
      return;
    }

    try {
      const payload: any = {};
      if (updated.fornecedor) payload.name = updated.fornecedor;
      if (updated.servico) payload.service = updated.servico;
      if (updated.categoria) payload.category = updated.categoria;
      if (updated.valorTotal !== undefined) payload.total_value = updated.valorTotal;
      if (updated.status) payload.status = updated.status;
      if (updated.observacoes !== undefined) payload.notes = updated.observacoes;
      if (updated.regraPagamento !== undefined) payload.payment_rule = updated.regraPagamento;
      if (updated.tipoPagamento) payload.payment_type = updated.tipoPagamento;
      if (updated.dataContrato) payload.contract_date = updated.dataContrato;
      if (updated.order !== undefined) payload.order_index = updated.order;

      const { error } = await supabase.from('suppliers').update(payload).eq('id', id);
      if (error) throw error;
      console.log('Supplier updated in Supabase.');
      loadData();
    } catch (err) {
      console.error('Failed to update supplier:', err);
    }
  };

  const deleteSupplier = async (id: string) => {
    console.log('Deleting supplier:', id);
    if (!user) {
      setData(prev => ({ ...prev, fornecedores: prev.fornecedores.filter(s => s.id !== id) }));
      return;
    }

    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
      console.log('Supplier deleted from Supabase.');
      loadData();
    } catch (err) {
      console.error('Failed to delete supplier:', err);
    }
  };

  const updateInstallment = async (supplierId: string, installmentId: string, updated: Partial<Installment>) => {
    console.log('Updating installment:', installmentId, updated);
    if (!user) {
      setData(prev => ({
        ...prev,
        fornecedores: prev.fornecedores.map(s => {
          if (s.id !== supplierId) return s;
          return {
            ...s,
            parcelas: s.parcelas.map(p => p.id === installmentId ? { ...p, ...updated } : p)
          };
        })
      }));
      return;
    }

    try {
      const payload: any = {};
      if (updated.status) payload.status = updated.status;
      if (updated.dataPagamento !== undefined) payload.payment_date = updated.dataPagamento;
      if (updated.valor !== undefined) payload.value = updated.valor;
      if (updated.dataVencimento) payload.due_date = updated.dataVencimento;

      const { error } = await supabase.from('installments').update(payload).eq('id', installmentId);
      if (error) throw error;
      console.log('Installment updated in Supabase.');
      loadData();
    } catch (err) {
      console.error('Failed to update installment:', err);
    }
  };

  // Guests CRUD
  const addGuest = async (guest: Omit<Guest, 'id'>) => {
    console.log('Adding guest...', guest.nome);
    if (!user || !data.id) {
      const newGuest = { ...guest, id: crypto.randomUUID() } as Guest;
      setData(prev => ({ ...prev, convidados: [...(prev.convidados || []), newGuest] }));
      return;
    }

    try {
      const { error } = await supabase.from('guests').insert({
        wedding_id: data.id,
        name: guest.nome,
        category: guest.categoria,
        status: guest.status,
        adults_count: guest.adultos,
        children_count: guest.criancas,
        phone: guest.telefone,
        notes: guest.observacoes
      });
      if (error) throw error;
      console.log('Guest saved to Supabase.');
      loadData();
    } catch (err) {
      console.error('Failed to add guest:', err);
    }
  };

  const updateGuest = async (id: string, updated: Partial<Guest>) => {
    console.log('Updating guest:', id, updated);
    if (!user) {
      setData(prev => ({
        ...prev,
        convidados: (prev.convidados || []).map(g => g.id === id ? { ...g, ...updated } : g)
      }));
      return;
    }

    try {
      const payload: any = {};
      if (updated.nome) payload.name = updated.nome;
      if (updated.categoria) payload.category = updated.categoria;
      if (updated.status) payload.status = updated.status;
      if (updated.adultos !== undefined) payload.adults_count = updated.adultos;
      if (updated.criancas !== undefined) payload.children_count = updated.criancas;
      if (updated.telefone !== undefined) payload.phone = updated.telefone;
      if (updated.observacoes !== undefined) payload.notes = updated.observacoes;

      const { error } = await supabase.from('guests').update(payload).eq('id', id);
      if (error) throw error;
      console.log('Guest updated in Supabase.');
      loadData();
    } catch (err) {
      console.error('Failed to update guest:', err);
    }
  };

  const deleteGuest = async (id: string) => {
    console.log('Deleting guest:', id);
    if (!user) {
      setData(prev => ({ ...prev, convidados: (prev.convidados || []).filter(g => g.id !== id) }));
      return;
    }

    try {
      const { error } = await supabase.from('guests').delete().eq('id', id);
      if (error) throw error;
      console.log('Guest deleted from Supabase.');
      loadData();
    } catch (err) {
      console.error('Failed to delete guest:', err);
    }
  };

  // Tasks CRUD
  const addTask = async (task: Omit<Task, 'id'>) => {
    console.log('Adding task...', task.titulo);
    if (!user || !data.id) {
      const newTask = { ...task, id: crypto.randomUUID() } as Task;
      setData(prev => ({ ...prev, tarefas: [...(prev.tarefas || []), newTask] }));
      return;
    }

    try {
      const { error } = await supabase.from('tasks').insert({
        wedding_id: data.id,
        title: task.titulo,
        description: task.descricao,
        category: task.categoria,
        due_date: task.dataLimite,
        status: task.status,
        order_index: task.ordem || 0
      });
      if (error) throw error;
      console.log('Task saved to Supabase.');
      loadData();
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  };

  const updateTask = async (id: string, updated: Partial<Task>) => {
    console.log('Updating task:', id, updated);
    if (!user) {
      setData(prev => ({
        ...prev,
        tarefas: (prev.tarefas || []).map(t => t.id === id ? { ...t, ...updated } : t)
      }));
      return;
    }

    try {
      const payload: any = {};
      if (updated.titulo) payload.title = updated.titulo;
      if (updated.descricao !== undefined) payload.description = updated.descricao;
      if (updated.categoria) payload.category = updated.categoria;
      if (updated.dataLimite !== undefined) payload.due_date = updated.dataLimite;
      if (updated.status) payload.status = updated.status;
      if (updated.ordem !== undefined) payload.order_index = updated.ordem;

      const { error } = await supabase.from('tasks').update(payload).eq('id', id);
      if (error) throw error;
      console.log('Task updated in Supabase.');
      loadData();
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const deleteTask = async (id: string) => {
    console.log('Deleting task:', id);
    if (!user) {
      setData(prev => ({ ...prev, tarefas: (prev.tarefas || []).filter(t => t.id !== id) }));
      return;
    }

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      console.log('Task deleted from Supabase.');
      loadData();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const updateWeddingInfo = async (info: Partial<WeddingData["casal"]>) => {
    console.log('Updating wedding info...', info);
    setData(prev => ({ ...prev, casal: { ...prev.casal, ...info } }));
    if (user && data.id) {
      const payload: any = {};
      if (info.nome1) payload.couple_name1 = info.nome1;
      if (info.nome2) payload.couple_name2 = info.nome2;
      if (info.data) payload.wedding_date = info.data;
      await supabase.from('weddings').update(payload).eq('id', data.id);
      console.log('Wedding info updated in Supabase.');
    }
  };

  const updateConfig = async (config: Partial<WeddingData["configuracoes"]>) => {
    console.log('Updating config...', config);
    setData(prev => ({ ...prev, configuracoes: { ...prev.configuracoes, ...config } }));
    if (user && data.id) {
      const payload: any = {};
      if (config.orcamentoTotal !== undefined) payload.total_budget = config.orcamentoTotal;
      if (config.tema) payload.theme = config.tema;
      await supabase.from('weddings').update(payload).eq('id', data.id);
      console.log('Config updated in Supabase.');
    }
  };

  const updateSimulation = async (simulationData: any) => {
    console.log('Saving simulation state...', simulationData);
    if (!user || !data.id) return;

    try {
      const { error } = await supabase.from('planning_simulations').upsert({
        wedding_id: data.id,
        current_step: simulationData.step,
        current_month_index: simulationData.index,
        simulated_aportes: simulationData.aportes,
        updated_at: new Date().toISOString()
      }, { onConflict: 'wedding_id' });
      
      if (error) throw error;
      console.log('Simulation state saved to Supabase.');
    } catch (err) {
      console.error('Failed to save simulation:', err);
    }
  };

  const reorderSuppliers = async (newOrder: Supplier[]) => {
    setData(prev => ({ ...prev, fornecedores: newOrder }));
    if (user) {
      console.log('Reordering suppliers in Supabase...');
      const promises = newOrder.map((s, index) => 
        supabase.from('suppliers').update({ order_index: index }).eq('id', s.id)
      );
      await Promise.all(promises);
      console.log('Suppliers reordered.');
    }
  };

  return {
    data,
    loading,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    updateInstallment,
    addGuest,
    updateGuest,
    deleteGuest,
    addTask,
    updateTask,
    deleteTask,
    updateWeddingInfo,
    updateConfig,
    updateSimulation,
    reorderSuppliers,
    refreshData: loadData
  };
};
