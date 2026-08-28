import { useState, useEffect, useCallback } from "react";
import type { WeddingData, Supplier, Installment, Guest, Task, UserRole } from "../types";
import { INITIAL_DATA } from "../data/initialData";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";

const STORAGE_KEY = "wedding_manager_data";

const calculateSupplierStatus = (parcelas: Installment[]): Supplier["status"] => {
  if (parcelas.length === 0) return "pendente";

  const allPaid = parcelas.every((p) => p.status === "pago");
  const somePaid = parcelas.some((p) => p.status === "pago");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const someOverdue = parcelas.some((p) => p.status !== "pago" && new Date(p.dataVencimento) < today);

  if (allPaid) return "pago";
  if (someOverdue) return "atrasado";
  if (somePaid) return "parcial";
  return "pendente";
};

export const useWeddingData = () => {
  const { user } = useAuth();
  const [data, setData] = useState<WeddingData>(INITIAL_DATA);
  const [loading, setLoading] = useState(true);

  const ensureWeddingExists = useCallback(async (userId: string) => {
    try {
      let { data: profile } = await supabase
        .from('profiles')
        .select('wedding_id, role_id, roles(name)')
        .eq('id', userId)
        .maybeSingle();

      if (profile?.wedding_id) return profile.wedding_id;

      const { data: ownedWedding } = await supabase
        .from('weddings')
        .select('id')
        .eq('owner_id', userId)
        .limit(1)
        .maybeSingle();

      if (ownedWedding) {
        await supabase.from('profiles').update({ wedding_id: ownedWedding.id }).eq('id', userId);
        return ownedWedding.id;
      }

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
      await supabase.from('profiles').update({ wedding_id: wedding.id }).eq('id', userId);
      return wedding.id;
    } catch (err) {
      console.error('Falha crítica na gestão de vínculo do casamento:', err);
      throw err;
    }
  }, []);

  const loadData = useCallback(async () => {
    const searchParams = new URLSearchParams(window.location.search);
    const publicToken = searchParams.get('token');

    if (!user && !publicToken) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setData(JSON.parse(stored));
      setLoading(false);
      return;
    }

    if (!data.id) setLoading(true);

    try {
      let weddingId = null;
      let userProfile: any = null;
      let role = 'couple'; // Papel padrão

        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, wedding_id, role, role_id, guided_tour_completed_at, roles(name), accounts(status)')
            .eq('id', user.id)
            .maybeSingle();
          
          if (profileError) console.error('Erro ao carregar perfil:', profileError);
          
          userProfile = profile;
          
          // Debugging
          console.log('DEBUG AUTH - profile from DB:', profile);

          // Normaliza a role para minúsculo
          const rolesData = profile?.roles as any;
          const dbRole = (Array.isArray(rolesData) ? rolesData[0]?.name : rolesData?.name) || profile?.role || 'couple';
          role = dbRole.toLowerCase();

          console.log('DEBUG AUTH - resolved role:', role);

          if (role === 'master') {
            weddingId = profile?.wedding_id;
          } else {
            weddingId = await ensureWeddingExists(user.id);
          }
        } else if (publicToken) {
          const { data: publicData, error: publicError } = await supabase
            .rpc('public_get_checkin_data', { p_token: publicToken });

          if (publicError) throw publicError;

          setData({
            ...INITIAL_DATA,
            casal: {
              nome1: publicData?.casal?.nome1 || '',
              nome2: publicData?.casal?.nome2 || '',
              data: publicData?.casal?.data || '',
            },
            convidados: publicData?.convidados || [],
            fornecedores: [],
            tarefas: [],
            role: 'staff'
          });
          setLoading(false);
          return;
        }


      // 'role' já leva em conta a blindagem por e-mail feita acima
      const userRole = role || 'couple';
      const accountStatus = userProfile?.accounts?.status || 'active';
      const userName = userProfile?.full_name || '';
      const guidedTourCompletedAt = userProfile?.guided_tour_completed_at || null;

      if (!weddingId) {
        setData({
          ...INITIAL_DATA,
          role: userRole as UserRole,
          account_status: accountStatus,
          userName,
          guided_tour_completed_at: guidedTourCompletedAt
        });
        setLoading(false);
        return;
      }

      const [
        { data: wedding },
        { data: suppliersData },
        { data: guestsData },
        { data: tasksData }
      ] = await Promise.all([
        supabase.from('weddings').select('*').eq('id', weddingId).single(),
        supabase.from('suppliers').select('*, parcelas:installments(*)').eq('wedding_id', weddingId),
        supabase.from('guests').select('*').eq('wedding_id', weddingId).order('nome'),
        supabase.from('tasks').select('*').eq('wedding_id', weddingId).order('ordem')
      ]);

      if (!wedding) throw new Error('Casamento não encontrado');

      const transformedData: WeddingData = {
        id: wedding.id,
        role: userRole as UserRole,
        account_status: accountStatus,
        userName,
        guided_tour_completed_at: guidedTourCompletedAt,
        public_checkin_token: wedding.public_checkin_token,
        casal: {
          nome1: wedding.couple_name1 || '',
          nome2: wedding.couple_name2 || '',
          data: wedding.wedding_date || '',
        },
        fornecedores: (suppliersData || []).map((s: any) => {
          const parcelasFormatadas = (s.parcelas || []).map((p: any) => ({
            id: p.id,
            numero: p.numero,
            dataVencimento: p.data_venc_original || p.data_vencimento,
            dataPagamento: p.data_pagamento,
            valor: parseFloat(p.valor),
            status: p.status
          })).sort((a: any, b: any) => a.numero - b.numero);

          return {
            id: s.id,
            fornecedor: s.fornecedor,
            servico: s.servico,
            categoria: s.categoria,
            valorTotal: parseFloat(s.valor_total),
            tipoPagamento: s.tipo_pagamento,
            status: calculateSupplierStatus(parcelasFormatadas),
            dataContrato: s.data_contrato,
            staff_names: s.staff_names,
            phone: s.phone,
            email: s.email,
            cnpj_cpf: s.cnpj_cpf,
            address: s.address,
            contract_url: s.contract_url,
            parcelas: parcelasFormatadas
          };
        }),
        convidados: (guestsData || []).map((g: any) => ({
          id: g.id,
          nome: g.nome,
          categoria: g.categoria,
          status: g.status,
          adultos: g.adultos,
          criancas: g.criancas,
          children_names: g.children_names,
          telefone: g.telefone,
          observacoes: g.observacoes,
          is_present: g.is_present,
          invitation_sent: g.invitation_sent
        })),
        tarefas: (tasksData || []).map((t: any) => ({
          id: t.id,
          titulo: t.titulo,
          descricao: t.descricao,
          categoria: t.categoria,
          dataLimite: t.data_limite,
          status: t.status,
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
  }, [user, ensureWeddingExists]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Restoring CRUD methods
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
        staff_names: supplier.staff_names,
        phone: supplier.phone,
        email: supplier.email,
        cnpj_cpf: supplier.cnpj_cpf,
        address: supplier.address,
        contract_url: supplier.contract_url
      }).select().single();
      if (sError) throw sError;
      let parcelas: Installment[] = [];
      if (supplier.parcelas?.length > 0) {
        const installments = supplier.parcelas.map(p => ({
          supplier_id: sData.id,
          numero: p.numero,
          data_vencimento: p.dataVencimento,
          data_pagamento: p.dataPagamento || null,
          valor: p.valor,
          status: p.status
        }));
        const { data: installmentData, error: installmentError } = await supabase.from('installments').insert(installments).select();
        if (installmentError) throw installmentError;
        parcelas = (installmentData || []).map((p: any) => ({
          id: p.id,
          numero: p.numero,
          dataVencimento: p.data_venc_original || p.data_vencimento,
          dataPagamento: p.data_pagamento,
          valor: parseFloat(p.valor),
          status: p.status
        })).sort((a, b) => a.numero - b.numero);
      }
      setData(prev => ({
        ...prev,
        fornecedores: [
          ...prev.fornecedores,
          {
            ...supplier,
            id: sData.id,
            parcelas,
            status: calculateSupplierStatus(parcelas)
          }
        ]
      }));
    } catch (err) { console.error(err); }
  };

  const updateSupplier = async (id: string, updated: Partial<Supplier>) => {
    if (!user) return;
    const { parcelas: _parcelas, status: _status, ...localUpdated } = updated;
    try {
      const payload: any = {};
      if (updated.fornecedor) payload.fornecedor = updated.fornecedor;
      if (updated.servico) payload.servico = updated.servico;
      if (updated.categoria) payload.categoria = updated.categoria;
      if (updated.valorTotal !== undefined) payload.valor_total = updated.valorTotal;
      if (updated.staff_names !== undefined) payload.staff_names = updated.staff_names;
      if (updated.tipoPagamento) payload.tipo_pagamento = updated.tipoPagamento;
      if (updated.dataContrato) payload.data_contrato = updated.dataContrato;
      if (updated.phone !== undefined) payload.phone = updated.phone;
      if (updated.email !== undefined) payload.email = updated.email;
      if (updated.cnpj_cpf !== undefined) payload.cnpj_cpf = updated.cnpj_cpf;
      if (updated.address !== undefined) payload.address = updated.address;
      if (updated.contract_url !== undefined) payload.contract_url = updated.contract_url;
      const { error } = await supabase.from('suppliers').update(payload).eq('id', id);
      if (error) throw error;
      setData(prev => ({
        ...prev,
        fornecedores: prev.fornecedores.map((supplier) =>
          supplier.id === id ? { ...supplier, ...localUpdated } : supplier
        )
      }));
    } catch (err) { console.error(err); }
  };

  const deleteSupplier = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
      setData(prev => ({
        ...prev,
        fornecedores: prev.fornecedores.filter((supplier) => supplier.id !== id)
      }));
    } catch (err) { console.error(err); }
  };

  const updateInstallment = async (_supplierId: string, installmentId: string, updated: Partial<Installment>) => {
    if (!user) return;
    const previousSuppliers = data.fornecedores;
    setData(prev => ({
      ...prev,
      fornecedores: prev.fornecedores.map((supplier) => {
        if (supplier.id !== _supplierId) return supplier;

        const parcelas = supplier.parcelas.map((installment) =>
          installment.id === installmentId ? { ...installment, ...updated } : installment
        );

        return {
          ...supplier,
          parcelas,
          status: calculateSupplierStatus(parcelas)
        };
      })
    }));

    try {
      const payload: any = {};
      if (updated.status) payload.status = updated.status;
      if (updated.valor !== undefined) payload.valor = updated.valor;
      if (updated.dataVencimento) payload.data_vencimento = updated.dataVencimento;
      if (updated.dataPagamento !== undefined) payload.data_pagamento = updated.dataPagamento;
      const { error } = await supabase.from('installments').update(payload).eq('id', installmentId);
      if (error) throw error;
    } catch (err) {
      console.error(err);
      setData(prev => ({ ...prev, fornecedores: previousSuppliers }));
    }
  };

  const addGuest = async (guest: Omit<Guest, 'id'>) => {
    if (!user || !data.id) return;
    try {
      const { data: guestData, error } = await supabase.from('guests').insert({
        wedding_id: data.id,
        nome: guest.nome,
        categoria: guest.categoria,
        status: guest.status,
        adultos: guest.adultos,
        criancas: guest.criancas,
        children_names: guest.children_names,
        telefone: guest.telefone,
        observacoes: guest.observacoes,
        is_present: guest.is_present || false,
        invitation_sent: guest.invitation_sent || false
      }).select().single();
      if (error) throw error;
      setData(prev => ({
        ...prev,
        convidados: [
          ...(prev.convidados || []),
          {
            id: guestData.id,
            nome: guestData.nome,
            categoria: guestData.categoria,
            status: guestData.status,
            adultos: guestData.adultos,
            criancas: guestData.criancas,
            children_names: guestData.children_names,
            telefone: guestData.telefone,
            observacoes: guestData.observacoes,
            is_present: guestData.is_present,
            invitation_sent: guestData.invitation_sent
          }
        ].sort((a, b) => a.nome.localeCompare(b.nome))
      }));
    } catch (err) { console.error(err); }
  };

  const updateGuest = async (id: string, updated: Partial<Guest>) => {
    const searchParams = new URLSearchParams(window.location.search);
    const publicToken = searchParams.get('token');
    if (!user && !publicToken) return;

    const previousGuest = (data.convidados || []).find((guest) => guest.id === id);
    setData(prev => ({
      ...prev,
      convidados: (prev.convidados || []).map((guest) =>
        guest.id === id ? { ...guest, ...updated } : guest
      )
    }));

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
      if (updated.invitation_sent !== undefined) payload.invitation_sent = updated.invitation_sent;
      const { error } = publicToken
        ? await supabase.rpc('public_toggle_guest_presence', {
            p_token: publicToken,
            p_guest_id: id,
            p_is_present: Boolean(updated.is_present)
          })
        : await supabase.from('guests').update(payload).eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error(err);
      if (previousGuest) {
        setData(prev => ({
          ...prev,
          convidados: (prev.convidados || []).map((guest) =>
            guest.id === id ? previousGuest : guest
          )
        }));
      }
    }
  };

  const deleteGuest = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('guests').delete().eq('id', id);
      if (error) throw error;
      setData(prev => ({
        ...prev,
        convidados: (prev.convidados || []).filter((guest) => guest.id !== id)
      }));
    } catch (err) { console.error(err); }
  };

  const addTask = async (task: Omit<Task, 'id'>) => {
    if (!user || !data.id) return;
    try {
      const { data: taskData, error } = await supabase.from('tasks').insert({
        wedding_id: data.id,
        titulo: task.titulo,
        descricao: task.descricao,
        categoria: task.categoria,
        data_limite: task.dataLimite,
        status: task.status,
        ordem: task.ordem
      }).select().single();
      if (error) throw error;
      setData(prev => ({
        ...prev,
        tarefas: [
          ...(prev.tarefas || []),
          {
            id: taskData.id,
            titulo: taskData.titulo,
            descricao: taskData.descricao,
            categoria: taskData.categoria,
            dataLimite: taskData.data_limite,
            status: taskData.status,
            ordem: taskData.ordem
          }
        ]
      }));
    } catch (err) { console.error(err); }
  };

  const updateTask = async (id: string, updated: Partial<Task>) => {
    if (!user) return;
    const previousTasks = data.tarefas || [];
    setData(prev => ({
      ...prev,
      tarefas: (prev.tarefas || []).map((task) =>
        task.id === id ? { ...task, ...updated } : task
      )
    }));

    try {
      const payload: any = {};
      if (updated.titulo) payload.titulo = updated.titulo;
      if (updated.descricao !== undefined) payload.descricao = updated.descricao;
      if (updated.categoria) payload.categoria = updated.categoria;
      if (updated.dataLimite !== undefined) payload.data_limite = updated.dataLimite;
      if (updated.status) payload.status = updated.status;
      if (updated.ordem !== undefined) payload.ordem = updated.ordem;
      const { error } = await supabase.from('tasks').update(payload).eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error(err);
      setData(prev => ({ ...prev, tarefas: previousTasks }));
    }
  };

  const deleteTask = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      setData(prev => ({
        ...prev,
        tarefas: (prev.tarefas || []).filter((task) => task.id !== id)
      }));
    } catch (err) { console.error(err); }
  };

  const updateWeddingInfo = async (info: Partial<WeddingData["casal"]>) => {
    if (!user || !data.id) return;
    const previousCasal = data.casal;
    setData(prev => ({
      ...prev,
      casal: {
        ...prev.casal,
        ...info
      }
    }));

    try {
      const payload: any = {};
      if (info.nome1) payload.couple_name1 = info.nome1;
      if (info.nome2) payload.couple_name2 = info.nome2;
      if (info.data) payload.wedding_date = info.data;
      const { error } = await supabase.from('weddings').update(payload).eq('id', data.id);
      if (error) throw error;
    } catch (err) {
      console.error(err);
      setData(prev => ({ ...prev, casal: previousCasal }));
    }
  };

  const updateConfig = async (config: Partial<WeddingData["configuracoes"]>) => {
    if (!user || !data.id) return;
    
    // Update local otimista
    const oldData = { ...data };
    setData(prev => ({
      ...prev,
      configuracoes: {
        ...prev.configuracoes,
        ...config
      }
    }));

    try {
      const payload: any = {};
      if (config.orcamentoTotal !== undefined) payload.total_budget = config.orcamentoTotal;
      if (config.tema) payload.theme = config.tema;
      await supabase.from('weddings').update(payload).eq('id', data.id);
      // Não chamamos loadData() aqui para evitar o reflash completo do app
      // O estado local já foi atualizado
    } catch (err) { 
      console.error(err); 
      setData(oldData); // Reverte se der erro
    }
  };

  const markGuidedTourCompleted = async () => {
    if (!user) return;
    const completedAt = new Date().toISOString();
    const previousValue = data.guided_tour_completed_at || null;

    setData(prev => ({
      ...prev,
      guided_tour_completed_at: completedAt
    }));

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ guided_tour_completed_at: completedAt })
        .eq('id', user.id);

      if (error) throw error;
    } catch (err) {
      console.error('Erro ao salvar conclusão do tour:', err);
      setData(prev => ({
        ...prev,
        guided_tour_completed_at: previousValue
      }));
      throw err;
    }
  };


  const reorderSuppliers = async (suppliers: Supplier[]) => {
    if (!user) return;
    const previousSuppliers = data.fornecedores;
    setData(prev => ({
      ...prev,
      fornecedores: suppliers
    }));

    try {
      for (const [index, supplier] of suppliers.entries()) {
        await supabase.from('suppliers').update({ ordem: index }).eq('id', supplier.id);
      }
    } catch (err) {
      console.error(err);
      setData(prev => ({ ...prev, fornecedores: previousSuppliers }));
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
    markGuidedTourCompleted,
    reorderSuppliers,
    refreshData: loadData
  };
};
