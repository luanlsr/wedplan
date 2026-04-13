import { useState, useEffect } from "react";
import type { WeddingData, Supplier, Installment } from "../types";
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
    // 1. Try to find existing membership
    const { data: membership } = await supabase
      .from('wedding_members')
      .select('wedding_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();

    if (membership) return membership.wedding_id;

    // 2. If no membership, check if there's a legacy profile link (backward compatibility)
    const { data: profile } = await supabase
      .from('profiles')
      .select('wedding_id' as any)
      .eq('id', userId)
      .maybeSingle();
      
    if (profile && (profile as any).wedding_id) {
       // Create membership if it was missing but profile had it
       await supabase.from('wedding_members').insert({
         wedding_id: (profile as any).wedding_id,
         user_id: userId,
         role: 'owner'
       });
       return (profile as any).wedding_id;
    }

    // 3. Create a new wedding
    const { data: newWedding, error: wError } = await supabase
      .from('weddings')
      .insert({
        couple_name1: INITIAL_DATA.casal.nome1,
        couple_name2: INITIAL_DATA.casal.nome2,
        wedding_date: INITIAL_DATA.casal.data,
        total_budget: INITIAL_DATA.configuracoes.orcamentoTotal,
        theme: INITIAL_DATA.configuracoes.tema
      })
      .select()
      .single();

    if (wError) throw wError;

    // 4. Create membership
    await supabase.from('wedding_members').insert({
      wedding_id: newWedding.id,
      user_id: userId,
      role: 'owner'
    });

    return newWedding.id;
  };

  // Load either from Supabase or LocalStorage
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) setData(JSON.parse(stored));
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const weddingId = await ensureWeddingExists(user.id);

        // Fetch Wedding Info
        const { data: wedding, error: wError } = await supabase
          .from('weddings')
          .select('*')
          .eq('id', weddingId)
          .single();

        if (wError) throw wError;

        // Fetch Suppliers, Installments, Guests, Tasks
        const [
          { data: suppliersData },
          { data: guestsData },
          { data: tasksData }
        ] = await Promise.all([
          supabase.from('suppliers').select('*, parcelas:installments(*)').eq('wedding_id', weddingId).order('order_index'),
          supabase.from('guests').select('*').eq('wedding_id', weddingId).order('name'),
          supabase.from('tasks').select('*').eq('wedding_id', weddingId).order('order_index')
        ]);

        // Transform DB data
        const transformedData: WeddingData = {
          id: wedding.id,
          casal: {
            nome1: wedding.couple_name1 || 'Noivo(a) 1',
            nome2: wedding.couple_name2 || 'Noivo(a) 2',
            data: wedding.wedding_date || '',
          },
          fornecedores: (suppliersData || []).map((s: any) => ({
            id: s.id,
            fornecedor: s.name,
            servico: s.service,
            categoria: s.category,
            valorTotal: s.total_value,
            tipoPagamento: s.payment_type,
            status: s.status,
            dataContrato: s.contract_date,
            regraPagamento: s.payment_rule,
            observacoes: s.notes,
            order: s.order_index,
            valorEntrada: s.entry_value,
            porcentagemEntrada: s.entry_percentage,
            entradaEmParcelas: s.entry_installments,
            numeroParcelas: s.num_installments,
            diasPagamentoFinalAntesCasamento: s.final_payment_days_before,
            parcelas: (s.parcelas || []).map((p: any) => ({
              id: p.id,
              numero: p.number,
              dataVencimento: p.due_date,
              valor: p.value,
              status: p.status,
              dataPagamento: p.payment_date
            })).sort((a: any, b: any) => a.numero - b.numero)
          })),
          convidados: (guestsData || []).map((g: any) => ({
            id: g.id,
            nome: g.name,
            categoria: g.category,
            status: g.status,
            adultos: g.adultos_count,
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
            orcamentoTotal: wedding.total_budget,
            tema: wedding.theme || 'light'
          }
        };

        setData(transformedData);
      } catch (error) {
        console.error('Error loading comprehensive data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Persistence for offline/unauth
  useEffect(() => {
    if (!user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data, user]);

  const addSupplier = async (supplier: Supplier) => {
    setData(prev => ({ ...prev, fornecedores: [...prev.fornecedores, supplier] }));
    if (user && data.id) {
      const { data: sData } = await supabase.from('suppliers').insert({
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
        entry_value: supplier.valorEntrada,
        entry_percentage: supplier.porcentagemEntrada,
        entry_installments: supplier.entradaEmParcelas,
        num_installments: supplier.numeroParcelas,
        final_payment_days_before: supplier.diasPagamentoFinalAntesCasamento,
        order_index: supplier.order || 0
      }).select().single();

      if (sData) {
        const installments = supplier.parcelas.map(p => ({
          supplier_id: sData.id,
          number: p.numero,
          due_date: p.dataVencimento,
          value: p.valor,
          status: p.status,
          payment_date: p.dataPagamento
        }));
        await supabase.from('installments').insert(installments);
      }
    }
  };

  const updateSupplier = async (id: string, updated: Partial<Supplier>) => {
    setData(prev => ({
      ...prev,
      fornecedores: prev.fornecedores.map(s => s.id === id ? { ...s, ...updated } : s)
    }));
    if (user) {
      const payload: any = {};
      if (updated.fornecedor) payload.name = updated.fornecedor;
      if (updated.servico) payload.service = updated.servico;
      if (updated.categoria) payload.category = updated.categoria;
      if (updated.valorTotal !== undefined) payload.total_value = updated.valorTotal;
      if (updated.status) payload.status = updated.status;
      if (updated.observacoes) payload.notes = updated.observacoes;
      if (updated.regraPagamento) payload.payment_rule = updated.regraPagamento;
      
      await supabase.from('suppliers').update(payload).eq('id', id);
    }
  };

  const deleteSupplier = async (id: string) => {
    setData(prev => ({ ...prev, fornecedores: prev.fornecedores.filter(s => s.id !== id) }));
    if (user) await supabase.from('suppliers').delete().eq('id', id);
  };

  const updateWeddingInfo = async (info: Partial<WeddingData["casal"]>) => {
    setData(prev => ({ ...prev, casal: { ...prev.casal, ...info } }));
    if (user && data.id) {
      const payload: any = {};
      if (info.nome1) payload.couple_name1 = info.nome1;
      if (info.nome2) payload.couple_name2 = info.nome2;
      if (info.data) payload.wedding_date = info.data;
      await supabase.from('weddings').update(payload).eq('id', data.id);
    }
  };

  const updateConfig = async (config: Partial<WeddingData["configuracoes"]>) => {
    setData(prev => ({ ...prev, configuracoes: { ...prev.configuracoes, ...config } }));
    if (user && data.id) {
      const payload: any = {};
      if (config.orcamentoTotal !== undefined) payload.total_budget = config.orcamentoTotal;
      if (config.tema) payload.theme = config.tema;
      await supabase.from('weddings').update(payload).eq('id', data.id);
    }
  };

  const updateInstallment = async (supplierId: string, installmentId: string, updated: Partial<Installment>) => {
    setData(prev => ({
      ...prev,
      fornecedores: prev.fornecedores.map(s => {
        if (s.id !== supplierId) return s;
        const newParcelas = s.parcelas.map(p => p.id === installmentId ? { ...p, ...updated } : p);
        return { ...s, parcelas: newParcelas };
      })
    }));
    if (user) {
      const payload: any = {};
      if (updated.status) payload.status = updated.status;
      if (updated.dataPagamento) payload.payment_date = updated.dataPagamento;
      await supabase.from('installments').update(payload).eq('id', installmentId);
    }
  };

  return {
    data,
    loading,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    updateConfig,
    updateWeddingInfo,
    updateInstallment,
    reorderSuppliers: (suppliers: Supplier[]) => setData(prev => ({ ...prev, fornecedores: suppliers }))
  };
};
