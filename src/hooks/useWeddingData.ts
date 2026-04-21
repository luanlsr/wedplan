import { useState, useEffect, useCallback } from "react";
import type { WeddingData, Supplier, Installment, Guest, Task, UserRole } from "../types";
import { INITIAL_DATA } from "../data/initialData";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

const STORAGE_KEY = "wedding_manager_data";

export const useWeddingData = () => {
  const { user } = useAuth();
  const [data, setData] = useState<WeddingData>(INITIAL_DATA);
  const [loading, setLoading] = useState(true);

  // Helper to ensure a wedding exists for the user and return its ID
  const ensureWeddingExists = useCallback(async (userId: string) => {
    try {

      // 1. Buscar Perfil (que contém o wedding_id)
      let { data: profile } = await supabase
        .from('profiles')
        .select('wedding_id, role')
        .eq('id', userId)
        .maybeSingle();

      // Se não houver perfil, decidir se cria (novo usuário) ou sai (usuário deletado)
      if (!profile) {
        const createdAtStr = user?.created_at;
        const createdAt = createdAtStr ? new Date(createdAtStr) : new Date();
        const isNewUser = !isNaN(createdAt.getTime()) && (new Date().getTime() - createdAt.getTime()) < 5 * 60 * 1000;

        if (isNewUser) {
          const { data: newProfile, error: pError } = await supabase
            .from('profiles')
            .upsert({ id: userId, role: 'couple' })
            .select()
            .single();
          if (pError) throw pError;
          profile = newProfile;
        } else {
          console.warn('Perfil não encontrado para usuário antigo. Possível deleção de conta.');
          return null; // Retorna null para indicar que não há vínculo válido
        }
      }

      // 2. Se já tem wedding_id vinculado, retorna ele
      if (profile?.wedding_id) {
        return profile.wedding_id;
      }

      // 3. Se não tem no perfil, buscar se ele é OWNER de algum casamento
      const { data: ownedWedding } = await supabase
        .from('weddings')
        .select('id')
        .eq('owner_id', userId)
        .limit(1)
        .maybeSingle();

      if (ownedWedding) {
        // Atualiza o perfil para guardar esse ID fixo
        await supabase.from('profiles').update({ wedding_id: ownedWedding.id }).eq('id', userId);
        return ownedWedding.id;
      }

      // 4. Se realmente não existe nada, garante o registro único via upsert
      const { data: wedding, error: wError } = await supabase
        .from('weddings')
        .upsert({
          owner_id: userId,
          couple_name1: INITIAL_DATA.casal.nome1 || '',
          couple_name2: INITIAL_DATA.casal.nome2 || '',
          wedding_date: INITIAL_DATA.casal.data || null,
          total_budget: INITIAL_DATA.configuracoes.orcamentoTotal,
          theme: INITIAL_DATA.configuracoes.tema
        }, { onConflict: 'owner_id' })
        .select()
        .single();

      if (wError) throw wError;

      // Vincula o perfil a este ID (seja novo ou recuperado)
      await supabase.from('profiles').update({ wedding_id: wedding.id }).eq('id', userId);

      return wedding.id;
    } catch (err) {
      console.error('Falha crítica na gestão de vínculo do casamento:', err);
      throw err;
    }
  }, [user?.created_at]);

  const loadData = useCallback(async () => {
    if (!user) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setData(JSON.parse(stored));
      setLoading(false);
      return;
    }

    if (!data.id) setLoading(true);

    try {
      const weddingId = await ensureWeddingExists(user.id);

      if (!weddingId) {
        setData(INITIAL_DATA);
        setLoading(false);
        return;
      }

      const { data: wedding, error: weddingError } = await supabase
        .from('weddings')
        .select('*')
        .eq('id', weddingId)
        .single();

      if (weddingError) throw weddingError;

      const [
        { data: suppliersData },
        { data: guestsData },
        { data: tasksData },
        { data: profileData }
      ] = await Promise.all([
        supabase.from('suppliers').select('*, parcelas:installments(*)').eq('wedding_id', weddingId),
        supabase.from('guests').select('*').eq('wedding_id', weddingId).order('nome'),
        supabase.from('tasks').select('*').eq('wedding_id', weddingId).order('ordem'),
        supabase.from('profiles').select('role').eq('id', user.id).single()
      ]);

      const transformedData: WeddingData = {
        id: wedding.id,
        role: profileData?.role as UserRole,
        public_checkin_token: wedding.public_checkin_token,
        casal: {
          nome1: wedding.couple_name1 || '',
          nome2: wedding.couple_name2 || '',
          data: wedding.wedding_date || '',
        },
        fornecedores: (suppliersData || []).map((s) => ({
          id: s.id,
          fornecedor: s.fornecedor,
          servico: s.servico,
          categoria: s.categoria,
          valorTotal: parseFloat(s.valor_total),
          tipoPagamento: s.tipo_pagamento,
          status: 'pendente', // Calculado em tempo de execução geralmente
          dataContrato: s.data_contrato,
          staff_names: s.staff_names,
          parcelas: (s.parcelas || []).map((p: any) => ({
            id: p.id,
            numero: p.numero,
            dataVencimento: p.data_venc_original || p.data_vencimento,
            valor: parseFloat(p.valor),
            status: p.status as "pago" | "pendente"
          })).sort((a: Installment, b: Installment) => a.numero - b.numero)
        })),
        convidados: (guestsData || []).map((g) => ({
          id: g.id,
          nome: g.nome,
          categoria: g.categoria,
          status: g.status as "confirmado" | "pendente" | "recusado",
          adultos: g.adultos,
          criancas: g.criancas,
          children_names: g.children_names,
          telefone: g.telefone,
          observacoes: g.observacoes,
          is_present: g.is_present
        })),
        tarefas: (tasksData || []).map((t) => ({
          id: t.id,
          titulo: t.titulo,
          descricao: t.descricao,
          categoria: t.categoria,
          dataLimite: t.data_limite,
          status: t.status as "pendente" | "em_progresso" | "concluido",
          ordem: t.ordem
        })),
        configuracoes: {
          orcamentoTotal: parseFloat(wedding.total_budget),
          tema: wedding.theme || 'light'
        }
      };

      setData(transformedData);
    } catch (error) {
      console.error('Falha ao carregar dados do Supabase:', error);
      setData(INITIAL_DATA);
    } finally {
      setLoading(false);
    }
  }, [user, data.id, ensureWeddingExists]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // CRUD Operations
  const addSupplier = async (supplier: Omit<Supplier, 'id'>) => {
    if (!user || !data.id) return;
    try {
      const { data: sData, error: sError } = await supabase.from('suppliers').insert({
        wedding_id: data.id,
        fornecedor: supplier.fornecedor,
        servico: supplier.servico,
        categoria: supplier.categoria,
        valor_total: supplier.valorTotal,
        tipo_pagamento: supplier.tipoPagamento,
        data_contrato: supplier.dataContrato,
        staff_names: supplier.staff_names
      }).select().single();

      if (sError) throw sError;

      if (supplier.parcelas?.length > 0) {
        const installments = supplier.parcelas.map(p => ({
          supplier_id: sData.id,
          numero: p.numero,
          data_vencimento: p.dataVencimento,
          valor: p.valor,
          status: p.status
        }));
        await supabase.from('installments').insert(installments);
      }
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const updateSupplier = async (id: string, updated: Partial<Supplier>) => {
    if (!user) return;
    try {
      const payload: any = {};
      if (updated.fornecedor) payload.fornecedor = updated.fornecedor;
      if (updated.servico) payload.servico = updated.servico;
      if (updated.categoria) payload.categoria = updated.categoria;
      if (updated.valorTotal !== undefined) payload.valor_total = updated.valorTotal;
      if (updated.staff_names !== undefined) payload.staff_names = updated.staff_names;
      if (updated.tipoPagamento) payload.tipo_pagamento = updated.tipoPagamento;
      if (updated.dataContrato) payload.data_contrato = updated.dataContrato;

      await supabase.from('suppliers').update(payload).eq('id', id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteSupplier = async (id: string) => {
    if (!user) return;
    try {
      await supabase.from('suppliers').delete().eq('id', id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const updateInstallment = async (_supplierId: string, installmentId: string, updated: Partial<Installment>) => {
    if (!user) return;
    try {
      const payload: any = {};
      if (updated.status) payload.status = updated.status;
      if (updated.valor !== undefined) payload.valor = updated.valor;
      if (updated.dataVencimento) payload.data_vencimento = updated.dataVencimento;

      await supabase.from('installments').update(payload).eq('id', installmentId);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const addGuest = async (guest: Omit<Guest, 'id'>) => {
    if (!user || !data.id) return;
    try {
      await supabase.from('guests').insert({
        wedding_id: data.id,
        nome: guest.nome,
        categoria: guest.categoria,
        status: guest.status,
        adultos: guest.adultos,
        criancas: guest.criancas,
        children_names: guest.children_names,
        telefone: guest.telefone,
        observacoes: guest.observacoes,
        is_present: guest.is_present || false
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const updateGuest = async (id: string, updated: Partial<Guest>) => {
    if (!user) return;
    try {
      const payload: any = {};
      if (updated.nome) payload.nome = updated.nome;
      if (updated.categoria) payload.categoria = updated.categoria;
      if (updated.status) payload.status = updated.status;
      if (updated.adultos !== undefined) payload.adultos = updated.adultos;
      if (updated.criancas !== undefined) payload.criancas = updated.criancas;
      if (updated.children_names !== undefined) payload.children_names = updated.children_names;
      if (updated.telefone !== undefined) payload.telefone = updated.telefone;
      if (updated.observacoes !== undefined) payload.observacoes = updated.observacoes;
      if (updated.is_present !== undefined) payload.is_present = updated.is_present;

      await supabase.from('guests').update(payload).eq('id', id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteGuest = async (id: string) => {
    if (!user) return;
    try {
      await supabase.from('guests').delete().eq('id', id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const addTask = async (task: Omit<Task, 'id'>) => {
    if (!user || !data.id) return;
    try {
      await supabase.from('tasks').insert({
        wedding_id: data.id,
        titulo: task.titulo,
        descricao: task.descricao,
        categoria: task.categoria,
        data_limite: task.dataLimite,
        status: task.status,
        ordem: task.ordem
      });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const updateTask = async (id: string, updated: Partial<Task>) => {
    if (!user) return;
    try {
      const payload: any = {};
      if (updated.titulo) payload.titulo = updated.titulo;
      if (updated.descricao !== undefined) payload.descricao = updated.descricao;
      if (updated.categoria) payload.categoria = updated.categoria;
      if (updated.dataLimite !== undefined) payload.data_limite = updated.dataLimite;
      if (updated.status) payload.status = updated.status;
      if (updated.ordem !== undefined) payload.ordem = updated.ordem;

      await supabase.from('tasks').update(payload).eq('id', id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTask = async (id: string) => {
    if (!user) return;
    try {
      await supabase.from('tasks').delete().eq('id', id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const updateWeddingInfo = async (info: Partial<WeddingData["casal"]>) => {
    if (!user || !data.id) return;
    try {
      const payload: any = {};
      if (info.nome1) payload.couple_name1 = info.nome1;
      if (info.nome2) payload.couple_name2 = info.nome2;
      if (info.data) payload.wedding_date = info.data;
      await supabase.from('weddings').update(payload).eq('id', data.id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const updateConfig = async (config: Partial<WeddingData["configuracoes"]>) => {
    if (!user || !data.id) return;
    try {
      const payload: any = {};
      if (config.orcamentoTotal !== undefined) payload.total_budget = config.orcamentoTotal;
      if (config.tema) payload.theme = config.tema;
      await supabase.from('weddings').update(payload).eq('id', data.id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const reorderSuppliers = async (newOrder: Supplier[]) => {
    setData(prev => ({ ...prev, fornecedores: newOrder }));
    // No Supabase novo precisaríamos de uma coluna de ordem estável
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
    reorderSuppliers,
    refreshData: loadData
  };
};
