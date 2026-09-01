import { useState, useEffect, useCallback } from "react";
import type { WeddingData, Supplier, Installment, Guest, GuestCategory, Task, UserRole, TimelineCategory, TimelineItem } from "../types";
import { INITIAL_DATA } from "../data/initialData";
import { supabase } from "../lib/supabase";
import { useAuth } from "./useAuth";
import { logError, logEvent, setObservabilityContext } from "../utils/observability";
import { syncSubscriptionAccess } from "../services/subscriptionAccess";
import { isMissingSupabaseRelationError } from "../services/supabaseErrors";

const STORAGE_KEY = "wedding_manager_data";
const PROFILE_SELECT_WITH_ACCESS = 'full_name, wedding_id, role, role_id, account_id, guided_tour_completed_at, plan_id, plan_status, billing_interval, plan_current_period_start, plan_current_period_end, plan_access_expires_at, plan_access_checked_at, plan_access_source, refund_window_started_at, refund_window_ends_at, refund_window_status, roles(name), accounts(status)';
const PROFILE_SELECT_LEGACY = 'full_name, wedding_id, role, role_id, account_id, guided_tour_completed_at, plan_id, plan_status, billing_interval, plan_current_period_end, roles(name), accounts(status)';

const DEFAULT_TIMELINE_CATEGORIES = [
  { nome: "Noivado", cor: "#65a765" },
  { nome: "Planejamento inicial", cor: "#e7b548" },
  { nome: "Fornecedores", cor: "#8b7fd7" },
  { nome: "Convites e papelaria", cor: "#6f92d8" },
  { nome: "Grande dia", cor: "#d8757c" },
];

const createClientId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createDefaultTimelineCategories = (weddingId?: string): TimelineCategory[] =>
  DEFAULT_TIMELINE_CATEGORIES.map((category, index) => ({
    id: createClientId(),
    wedding_id: weddingId,
    nome: category.nome,
    cor: category.cor,
    ordem: index,
    itens: [],
  }));

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

const fetchProfileWithAccessState = async (userId: string) => {
  const result = await supabase
    .from('profiles')
    .select(PROFILE_SELECT_WITH_ACCESS)
    .eq('id', userId)
    .maybeSingle();

  if (result.error?.code === '42703') {
    return supabase
      .from('profiles')
      .select(PROFILE_SELECT_LEGACY)
      .eq('id', userId)
      .maybeSingle();
  }

  return result;
};

export const useWeddingData = () => {
  const { user } = useAuth();
  const [data, setData] = useState<WeddingData>(INITIAL_DATA);
  const [loading, setLoading] = useState(true);

  const persistTimelineLocally = useCallback((updater: (prev: WeddingData) => WeddingData) => {
    setData(prev => {
      const next = updater(prev);
      if (!user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, [user]);

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

  const loadTimelineData = useCallback(async (weddingId: string): Promise<TimelineCategory[]> => {
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('timeline_categories')
        .select('*')
        .eq('wedding_id', weddingId)
        .order('ordem');

      if (categoriesError) {
        if (categoriesError.code !== '42P01') {
          logError('timeline.categories.load.error', categoriesError, { weddingId });
        }
        return [];
      }

      let categories = categoriesData || [];

      if (categories.length === 0) {
        const defaults = DEFAULT_TIMELINE_CATEGORIES.map((category, index) => ({
          wedding_id: weddingId,
          nome: category.nome,
          cor: category.cor,
          ordem: index,
        }));

        const { data: seededCategories, error: seedError } = await supabase
          .from('timeline_categories')
          .insert(defaults)
          .select('*')
          .order('ordem');

        if (seedError) {
          logError('timeline.categories.seed.error', seedError, { weddingId });
        } else {
          categories = seededCategories || [];
        }
      }

      if (categories.length === 0) return [];

      const categoryIds = categories.map((category: any) => category.id);
      const { data: itemsData, error: itemsError } = await supabase
        .from('timeline_items')
        .select('*')
        .in('category_id', categoryIds)
        .order('data')
        .order('ordem');

      if (itemsError) {
        logError('timeline.items.load.error', itemsError, { weddingId });
      }

      const itemsByCategory = new Map<string, TimelineItem[]>();
      (itemsData || []).forEach((item: any) => {
        const mappedItem: TimelineItem = {
          id: item.id,
          categoryId: item.category_id,
          titulo: item.titulo,
          descricao: item.descricao || '',
          data: item.data,
          status: item.status || 'pendente',
          ordem: item.ordem || 0,
        };
        const categoryItems = itemsByCategory.get(mappedItem.categoryId) || [];
        categoryItems.push(mappedItem);
        itemsByCategory.set(mappedItem.categoryId, categoryItems);
      });

      return categories.map((category: any) => ({
        id: category.id,
        wedding_id: category.wedding_id,
        nome: category.nome,
        cor: category.cor || '#d8757c',
        ordem: category.ordem || 0,
        itens: itemsByCategory.get(category.id) || [],
      }));
    } catch (err) {
      logError('timeline.load.error', err, { weddingId });
      return [];
    }
  }, []);

  const loadData = useCallback(async () => {
    const searchParams = new URLSearchParams(window.location.search);
    const publicToken = searchParams.get('token');

    if (!user && !publicToken) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setData({
          ...parsed,
          configuracoes: {
            ...INITIAL_DATA.configuracoes,
            ...parsed.configuracoes,
            tema: parsed.configuracoes?.tema || INITIAL_DATA.configuracoes.tema,
          },
          cronograma: parsed.cronograma?.length ? parsed.cronograma : createDefaultTimelineCategories(parsed.id),
        });
      } else {
        setData({
          ...INITIAL_DATA,
          cronograma: createDefaultTimelineCategories(),
        });
      }
      setLoading(false);
      return;
    }

    if (!data.id) setLoading(true);

    try {
      let weddingId = null;
      let userProfile: any = null;
      let role = 'couple'; // Papel padrão

        if (user) {
          await syncSubscriptionAccess();

          const { data: profile, error: profileError } = await fetchProfileWithAccessState(user.id);
          
          if (profileError) console.error('Erro ao carregar perfil:', profileError);
          
          userProfile = profile;

          // Normaliza a role para minúsculo
          const rolesData = profile?.roles as any;
          const dbRole = (Array.isArray(rolesData) ? rolesData[0]?.name : rolesData?.name) || profile?.role || 'couple';
          role = dbRole.toLowerCase();

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
            cronograma: [],
            role: 'staff'
          });
          setLoading(false);
          return;
        }


      // 'role' já leva em conta a blindagem por e-mail feita acima
      const userRole = role || 'couple';
      const userName = userProfile?.full_name || '';
      const guidedTourCompletedAt = userProfile?.guided_tour_completed_at || null;
      const planStatus = userProfile?.plan_status || null;
      const legacyAccountStatus = userProfile?.accounts?.status || 'active';
      const planPeriodExpired = Boolean(
        userProfile?.plan_current_period_end &&
        new Date(`${userProfile.plan_current_period_end}T23:59:59`).getTime() < Date.now()
      );
      const accountStatus =
        (planStatus === 'active' || planStatus === 'trialing') && planPeriodExpired ? 'past_due' :
        planStatus === 'active' || planStatus === 'trialing' ? 'active' :
        planStatus === 'past_due' ? 'past_due' :
        planStatus === 'canceled' || planStatus === 'expired' ? 'canceled' :
        planStatus === 'incomplete' || planStatus === 'pending_payment' ? 'pending_payment' :
        legacyAccountStatus;

      if (!weddingId) {
        setData({
          ...INITIAL_DATA,
          account_id: userProfile?.account_id || null,
          role: userRole as UserRole,
          account_status: accountStatus,
          plan_id: userProfile?.plan_id || null,
          plan_status: planStatus,
          billing_interval: userProfile?.billing_interval || null,
          plan_current_period_start: userProfile?.plan_current_period_start || null,
          plan_current_period_end: userProfile?.plan_current_period_end || null,
          plan_access_expires_at: userProfile?.plan_access_expires_at || null,
          plan_access_checked_at: userProfile?.plan_access_checked_at || null,
          plan_access_source: userProfile?.plan_access_source || null,
          refund_window_started_at: userProfile?.refund_window_started_at || null,
          refund_window_ends_at: userProfile?.refund_window_ends_at || null,
          refund_window_status: userProfile?.refund_window_status || null,
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

      const cronograma = await loadTimelineData(weddingId);
      let guestCategories: GuestCategory[] = [];

      try {
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('guest_categories')
          .select('*')
          .eq('wedding_id', weddingId)
          .order('sort_order')
          .order('name');

        if (categoriesError) {
          if (!isMissingSupabaseRelationError(categoriesError)) throw categoriesError;
        } else {
          guestCategories = (categoriesData || []).map((category: any) => ({
            id: category.id,
            wedding_id: category.wedding_id,
            name: category.name,
            color: category.color,
            sort_order: category.sort_order,
          }));
        }
      } catch (err) {
        if (!isMissingSupabaseRelationError(err)) {
          logError('guest_categories.load.error', err, { weddingId });
        }
      }

      const transformedData: WeddingData = {
        id: wedding.id,
        account_id: userProfile?.account_id || null,
        role: userRole as UserRole,
        account_status: accountStatus,
        plan_id: userProfile?.plan_id || null,
        plan_status: planStatus,
        billing_interval: userProfile?.billing_interval || null,
        plan_current_period_start: userProfile?.plan_current_period_start || null,
        plan_current_period_end: userProfile?.plan_current_period_end || null,
        plan_access_expires_at: userProfile?.plan_access_expires_at || null,
        plan_access_checked_at: userProfile?.plan_access_checked_at || null,
        plan_access_source: userProfile?.plan_access_source || null,
        refund_window_started_at: userProfile?.refund_window_started_at || null,
        refund_window_ends_at: userProfile?.refund_window_ends_at || null,
        refund_window_status: userProfile?.refund_window_status || null,
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
            contract_storage_path: s.contract_storage_path,
            contract_file_name: s.contract_file_name,
            contract_file_size_bytes: s.contract_file_size_bytes ? Number(s.contract_file_size_bytes) : null,
            contract_compressed_size_bytes: s.contract_compressed_size_bytes ? Number(s.contract_compressed_size_bytes) : null,
            contract_mime_type: s.contract_mime_type,
            contract_uploaded_at: s.contract_uploaded_at,
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
        guestCategories,
        tarefas: (tasksData || []).map((t: any) => ({
          id: t.id,
          titulo: t.titulo,
          descricao: t.descricao,
          categoria: t.categoria,
          dataLimite: t.data_limite,
          status: t.status,
          ordem: t.ordem
        })),
        cronograma,
        configuracoes: {
          orcamentoTotal: parseFloat(wedding.total_budget),
          tema: wedding.theme || INITIAL_DATA.configuracoes.tema
        }
      };
      setData(transformedData);
      setObservabilityContext({
        userId: user?.id || null,
        accountId: userProfile?.account_id || null,
        weddingId,
        role: userRole,
      });
    } catch (error) {
      console.error('Falha ao carregar dados do Supabase:', error);
      logError('wedding_data.load.error', error);
      setData(INITIAL_DATA);
    } finally {
      setLoading(false);
    }
  }, [user, ensureWeddingExists, loadTimelineData]);

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
        contract_url: supplier.contract_url,
        contract_storage_path: supplier.contract_storage_path,
        contract_file_name: supplier.contract_file_name,
        contract_file_size_bytes: supplier.contract_file_size_bytes,
        contract_compressed_size_bytes: supplier.contract_compressed_size_bytes,
        contract_mime_type: supplier.contract_mime_type,
        contract_uploaded_at: supplier.contract_uploaded_at
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
      void logEvent({
        eventName: 'supplier.created',
        entityType: 'supplier',
        entityId: sData.id,
        metadata: {
          weddingId: data.id,
          category: supplier.categoria,
          installmentsCount: parcelas.length,
        },
      });
    } catch (err) {
      logError('supplier.create.error', err, { weddingId: data.id, category: supplier.categoria });
    }
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
      if (updated.contract_storage_path !== undefined) payload.contract_storage_path = updated.contract_storage_path;
      if (updated.contract_file_name !== undefined) payload.contract_file_name = updated.contract_file_name;
      if (updated.contract_file_size_bytes !== undefined) payload.contract_file_size_bytes = updated.contract_file_size_bytes;
      if (updated.contract_compressed_size_bytes !== undefined) payload.contract_compressed_size_bytes = updated.contract_compressed_size_bytes;
      if (updated.contract_mime_type !== undefined) payload.contract_mime_type = updated.contract_mime_type;
      if (updated.contract_uploaded_at !== undefined) payload.contract_uploaded_at = updated.contract_uploaded_at;
      const { error } = await supabase.from('suppliers').update(payload).eq('id', id);
      if (error) throw error;
      setData(prev => ({
        ...prev,
        fornecedores: prev.fornecedores.map((supplier) =>
          supplier.id === id ? { ...supplier, ...localUpdated } : supplier
        )
      }));
      void logEvent({
        eventName: 'supplier.updated',
        entityType: 'supplier',
        entityId: id,
        metadata: {
          weddingId: data.id,
          fields: Object.keys(payload),
        },
      });
    } catch (err) {
      logError('supplier.update.error', err, { supplierId: id, weddingId: data.id });
    }
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
      void logEvent({
        eventName: 'supplier.deleted',
        entityType: 'supplier',
        entityId: id,
        metadata: { weddingId: data.id },
      });
    } catch (err) {
      logError('supplier.delete.error', err, { supplierId: id, weddingId: data.id });
    }
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
      void logEvent({
        eventName: 'installment.updated',
        entityType: 'installment',
        entityId: installmentId,
        metadata: {
          supplierId: _supplierId,
          weddingId: data.id,
          fields: Object.keys(payload),
          status: updated.status,
        },
      });
    } catch (err) {
      logError('installment.update.error', err, { installmentId, supplierId: _supplierId, weddingId: data.id });
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
      void logEvent({
        eventName: 'guest.created',
        entityType: 'guest',
        entityId: guestData.id,
        metadata: {
          weddingId: data.id,
          category: guest.categoria,
          adults: guest.adultos,
          children: guest.criancas,
        },
      });
    } catch (err) {
      logError('guest.create.error', err, { weddingId: data.id, category: guest.categoria });
    }
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
      void logEvent({
        eventName: publicToken ? 'guest.public_presence_updated' : 'guest.updated',
        entityType: 'guest',
        entityId: id,
        metadata: {
          weddingId: data.id,
          publicMode: Boolean(publicToken),
          fields: Object.keys(payload),
          isPresent: updated.is_present,
        },
      });
    } catch (err) {
      logError(publicToken ? 'guest.public_presence_update.error' : 'guest.update.error', err, {
        guestId: id,
        weddingId: data.id,
        publicMode: Boolean(publicToken),
      });
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
      void logEvent({
        eventName: 'guest.deleted',
        entityType: 'guest',
        entityId: id,
        metadata: { weddingId: data.id },
      });
    } catch (err) {
      logError('guest.delete.error', err, { guestId: id, weddingId: data.id });
    }
  };

  const addGuestCategory = async (name: string) => {
    const normalizedName = name.trim();
    if (!user || !data.id || !normalizedName) return;

    try {
      const { data: categoryData, error } = await supabase
        .from('guest_categories')
        .insert({
          wedding_id: data.id,
          name: normalizedName,
          sort_order: data.guestCategories?.length || 0,
        })
        .select()
        .single();

      if (error) throw error;

      const category: GuestCategory = {
        id: categoryData.id,
        wedding_id: categoryData.wedding_id,
        name: categoryData.name,
        color: categoryData.color,
        sort_order: categoryData.sort_order,
      };

      setData(prev => ({
        ...prev,
        guestCategories: [...(prev.guestCategories || []), category],
      }));

      void logEvent({
        eventName: 'guest_category.created',
        entityType: 'guest_category',
        entityId: category.id,
        metadata: { weddingId: data.id, name: category.name },
      });
    } catch (err) {
      logError('guest_category.create.error', err, { weddingId: data.id, name: normalizedName });
      throw err;
    }
  };

  const deleteGuestCategory = async (categoryId: string, categoryName: string) => {
    if (!user || !data.id) return;
    const previousGuests = data.convidados || [];
    const previousCategories = data.guestCategories || [];

    setData(prev => ({
      ...prev,
      convidados: (prev.convidados || []).map((guest) =>
        guest.categoria === categoryName ? { ...guest, categoria: 'Outros' } : guest
      ),
      guestCategories: (prev.guestCategories || []).filter((category) => category.id !== categoryId),
    }));

    try {
      const { error: guestsError } = await supabase
        .from('guests')
        .update({ categoria: 'Outros' })
        .eq('wedding_id', data.id)
        .eq('categoria', categoryName);

      if (guestsError) throw guestsError;

      const { error: categoryError } = await supabase
        .from('guest_categories')
        .delete()
        .eq('id', categoryId);

      if (categoryError) throw categoryError;

      void logEvent({
        eventName: 'guest_category.deleted',
        entityType: 'guest_category',
        entityId: categoryId,
        metadata: { weddingId: data.id, name: categoryName },
      });
    } catch (err) {
      logError('guest_category.delete.error', err, { weddingId: data.id, categoryId, name: categoryName });
      setData(prev => ({
        ...prev,
        convidados: previousGuests,
        guestCategories: previousCategories,
      }));
      throw err;
    }
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
      void logEvent({
        eventName: 'task.created',
        entityType: 'task',
        entityId: taskData.id,
        metadata: {
          weddingId: data.id,
          category: task.categoria,
          status: task.status,
        },
      });
    } catch (err) {
      logError('task.create.error', err, { weddingId: data.id, category: task.categoria });
    }
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
      void logEvent({
        eventName: 'task.updated',
        entityType: 'task',
        entityId: id,
        metadata: {
          weddingId: data.id,
          fields: Object.keys(payload),
          status: updated.status,
        },
      });
    } catch (err) {
      logError('task.update.error', err, { taskId: id, weddingId: data.id });
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
      void logEvent({
        eventName: 'task.deleted',
        entityType: 'task',
        entityId: id,
        metadata: { weddingId: data.id },
      });
    } catch (err) {
      logError('task.delete.error', err, { taskId: id, weddingId: data.id });
    }
  };

  const addTimelineCategory = async (category: Omit<TimelineCategory, 'id' | 'itens' | 'wedding_id'>) => {
    const nextOrder = data.cronograma?.length || 0;

    if (!user || !data.id) {
      const localCategory: TimelineCategory = {
        id: createClientId(),
        nome: category.nome,
        cor: category.cor,
        ordem: category.ordem ?? nextOrder,
        itens: [],
      };
      persistTimelineLocally(prev => ({
        ...prev,
        cronograma: [...(prev.cronograma || []), localCategory],
      }));
      return;
    }

    try {
      const { data: categoryData, error } = await supabase.from('timeline_categories').insert({
        wedding_id: data.id,
        nome: category.nome,
        cor: category.cor,
        ordem: category.ordem ?? nextOrder,
      }).select().single();

      if (error) throw error;

      setData(prev => ({
        ...prev,
        cronograma: [
          ...(prev.cronograma || []),
          {
            id: categoryData.id,
            wedding_id: categoryData.wedding_id,
            nome: categoryData.nome,
            cor: categoryData.cor,
            ordem: categoryData.ordem,
            itens: [],
          }
        ]
      }));

      void logEvent({
        eventName: 'timeline.category.created',
        entityType: 'timeline_category',
        entityId: categoryData.id,
        metadata: { weddingId: data.id, name: category.nome },
      });
    } catch (err) {
      logError('timeline.category.create.error', err, { weddingId: data.id, name: category.nome });
    }
  };

  const updateTimelineCategory = async (id: string, updated: Partial<TimelineCategory>) => {
    const previousTimeline = data.cronograma || [];
    persistTimelineLocally(prev => ({
      ...prev,
      cronograma: (prev.cronograma || []).map((category) =>
        category.id === id ? { ...category, ...updated } : category
      )
    }));

    if (!user) return;

    try {
      const payload: any = {};
      if (updated.nome !== undefined) payload.nome = updated.nome;
      if (updated.cor !== undefined) payload.cor = updated.cor;
      if (updated.ordem !== undefined) payload.ordem = updated.ordem;
      const { error } = await supabase.from('timeline_categories').update(payload).eq('id', id);
      if (error) throw error;
      void logEvent({
        eventName: 'timeline.category.updated',
        entityType: 'timeline_category',
        entityId: id,
        metadata: { weddingId: data.id, fields: Object.keys(payload) },
      });
    } catch (err) {
      logError('timeline.category.update.error', err, { categoryId: id, weddingId: data.id });
      setData(prev => ({ ...prev, cronograma: previousTimeline }));
    }
  };

  const deleteTimelineCategory = async (id: string) => {
    const previousTimeline = data.cronograma || [];
    persistTimelineLocally(prev => ({
      ...prev,
      cronograma: (prev.cronograma || []).filter((category) => category.id !== id)
    }));

    if (!user) return;

    try {
      const { error } = await supabase.from('timeline_categories').delete().eq('id', id);
      if (error) throw error;
      void logEvent({
        eventName: 'timeline.category.deleted',
        entityType: 'timeline_category',
        entityId: id,
        metadata: { weddingId: data.id },
      });
    } catch (err) {
      logError('timeline.category.delete.error', err, { categoryId: id, weddingId: data.id });
      setData(prev => ({ ...prev, cronograma: previousTimeline }));
    }
  };

  const addTimelineItem = async (categoryId: string, item: Omit<TimelineItem, 'id' | 'categoryId'>) => {
    const category = (data.cronograma || []).find((timelineCategory) => timelineCategory.id === categoryId);
    const nextOrder = category?.itens.length || 0;

    if (!user || !data.id) {
      const localItem: TimelineItem = {
        id: createClientId(),
        categoryId,
        titulo: item.titulo,
        descricao: item.descricao || '',
        data: item.data,
        status: item.status || 'pendente',
        ordem: item.ordem ?? nextOrder,
      };
      persistTimelineLocally(prev => ({
        ...prev,
        cronograma: (prev.cronograma || []).map((timelineCategory) =>
          timelineCategory.id === categoryId
            ? { ...timelineCategory, itens: [...timelineCategory.itens, localItem] }
            : timelineCategory
        )
      }));
      return;
    }

    try {
      const { data: itemData, error } = await supabase.from('timeline_items').insert({
        wedding_id: data.id,
        category_id: categoryId,
        titulo: item.titulo,
        descricao: item.descricao || null,
        data: item.data,
        status: item.status || 'pendente',
        ordem: item.ordem ?? nextOrder,
      }).select().single();

      if (error) throw error;

      const createdItem: TimelineItem = {
        id: itemData.id,
        categoryId: itemData.category_id,
        titulo: itemData.titulo,
        descricao: itemData.descricao || '',
        data: itemData.data,
        status: itemData.status,
        ordem: itemData.ordem,
      };

      setData(prev => ({
        ...prev,
        cronograma: (prev.cronograma || []).map((timelineCategory) =>
          timelineCategory.id === categoryId
            ? { ...timelineCategory, itens: [...timelineCategory.itens, createdItem] }
            : timelineCategory
        )
      }));

      void logEvent({
        eventName: 'timeline.item.created',
        entityType: 'timeline_item',
        entityId: itemData.id,
        metadata: { weddingId: data.id, categoryId, status: createdItem.status },
      });
    } catch (err) {
      logError('timeline.item.create.error', err, { weddingId: data.id, categoryId });
    }
  };

  const updateTimelineItem = async (categoryId: string, itemId: string, updated: Partial<TimelineItem>) => {
    const previousTimeline = data.cronograma || [];
    persistTimelineLocally(prev => ({
      ...prev,
      cronograma: (prev.cronograma || []).map((category) => (
        category.id === categoryId
          ? {
              ...category,
              itens: category.itens.map((item) => item.id === itemId ? { ...item, ...updated } : item)
            }
          : category
      ))
    }));

    if (!user) return;

    try {
      const payload: any = {};
      if (updated.titulo !== undefined) payload.titulo = updated.titulo;
      if (updated.descricao !== undefined) payload.descricao = updated.descricao;
      if (updated.data !== undefined) payload.data = updated.data;
      if (updated.status !== undefined) payload.status = updated.status;
      if (updated.ordem !== undefined) payload.ordem = updated.ordem;
      if (updated.categoryId !== undefined) payload.category_id = updated.categoryId;
      const { error } = await supabase.from('timeline_items').update(payload).eq('id', itemId);
      if (error) throw error;
      void logEvent({
        eventName: 'timeline.item.updated',
        entityType: 'timeline_item',
        entityId: itemId,
        metadata: { weddingId: data.id, categoryId, fields: Object.keys(payload) },
      });
    } catch (err) {
      logError('timeline.item.update.error', err, { itemId, categoryId, weddingId: data.id });
      setData(prev => ({ ...prev, cronograma: previousTimeline }));
    }
  };

  const deleteTimelineItem = async (categoryId: string, itemId: string) => {
    const previousTimeline = data.cronograma || [];
    persistTimelineLocally(prev => ({
      ...prev,
      cronograma: (prev.cronograma || []).map((category) => (
        category.id === categoryId
          ? { ...category, itens: category.itens.filter((item) => item.id !== itemId) }
          : category
      ))
    }));

    if (!user) return;

    try {
      const { error } = await supabase.from('timeline_items').delete().eq('id', itemId);
      if (error) throw error;
      void logEvent({
        eventName: 'timeline.item.deleted',
        entityType: 'timeline_item',
        entityId: itemId,
        metadata: { weddingId: data.id, categoryId },
      });
    } catch (err) {
      logError('timeline.item.delete.error', err, { itemId, categoryId, weddingId: data.id });
      setData(prev => ({ ...prev, cronograma: previousTimeline }));
    }
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
      void logEvent({
        eventName: 'wedding.info_updated',
        entityType: 'wedding',
        entityId: data.id,
        metadata: {
          fields: Object.keys(payload),
        },
      });
    } catch (err) {
      logError('wedding.info_update.error', err, { weddingId: data.id });
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
      void logEvent({
        eventName: 'wedding.config_updated',
        entityType: 'wedding',
        entityId: data.id,
        metadata: {
          fields: Object.keys(payload),
          theme: config.tema,
        },
      });
      // Não chamamos loadData() aqui para evitar o reflash completo do app
      // O estado local já foi atualizado
    } catch (err) { 
      logError('wedding.config_update.error', err, { weddingId: data.id });
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
      void logEvent({
        eventName: 'guided_tour.completed',
        entityType: 'profile',
        entityId: user.id,
        metadata: { weddingId: data.id },
      });
    } catch (err) {
      logError('guided_tour.complete.error', err, { weddingId: data.id });
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
      void logEvent({
        eventName: 'supplier.reordered',
        metadata: {
          weddingId: data.id,
          count: suppliers.length,
        },
      });
    } catch (err) {
      logError('supplier.reorder.error', err, { weddingId: data.id, count: suppliers.length });
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
    addGuestCategory,
    deleteGuestCategory,
    addTask,
    updateTask,
    deleteTask,
    addTimelineCategory,
    updateTimelineCategory,
    deleteTimelineCategory,
    addTimelineItem,
    updateTimelineItem,
    deleteTimelineItem,
    updateWeddingInfo,
    updateConfig,
    markGuidedTourCompleted,
    reorderSuppliers,
    refreshData: loadData
  };
};
