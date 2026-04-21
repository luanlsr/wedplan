import { supabase } from '../lib/supabase';
import type { WeddingData } from '../types';

export const migrateLocalStorageToSupabase = async (userId: string, data: WeddingData) => {
  try {
    // 1. Create Wedding entry
    const { data: wedding, error: wError } = await supabase
      .from('weddings')
      .insert({
        owner_id: userId,
        couple_name1: data.casal.nome1,
        couple_name2: data.casal.nome2,
        wedding_date: data.casal.data,
        total_budget: data.configuracoes.orcamentoTotal,
        theme: data.configuracoes.tema
      })
      .select()
      .single();

    if (wError) throw wError;

    // 2. Link profile to this wedding
    const { error: pError } = await supabase
      .from('profiles')
      .update({
        wedding_id: wedding.id
      })
      .eq('id', userId);

    if (pError) throw pError;

    // 3. Migrate Suppliers & Installments
    for (const s of data.fornecedores) {
      const { data: supplier, error: sError } = await supabase
        .from('suppliers')
        .insert({
          wedding_id: wedding.id,
          fornecedor: s.fornecedor,
          servico: s.servico,
          categoria: s.categoria,
          valor_total: s.valorTotal,
          tipo_pagamento: s.tipoPagamento,
          data_contrato: s.dataContrato,
          staff_names: s.staff_names
        })
        .select()
        .single();

      if (sError) throw sError;

      // Migrate installments for this supplier
      const installmentsToInsert = s.parcelas.map(p => ({
        supplier_id: supplier.id,
        numero: p.numero,
        data_vencimento: p.dataVencimento,
        valor: p.valor,
        status: p.status
      }));

      const { error: iError } = await supabase
        .from('installments')
        .insert(installmentsToInsert);

      if (iError) throw iError;
    }

    // 4. Migrate Guests
    if (data.convidados && data.convidados.length > 0) {
      const guestsToInsert = data.convidados.map(g => ({
        wedding_id: wedding.id,
        nome: g.nome,
        categoria: g.categoria,
        status: g.status,
        adultos: g.adultos,
        criancas: g.criancas,
        children_names: g.children_names,
        telefone: g.telefone,
        observacoes: g.observacoes,
        is_present: g.is_present
      }));

      const { error: gError } = await supabase
        .from('guests')
        .insert(guestsToInsert);
      
      if (gError) throw gError;
    }

    // 5. Migrate Tasks
    if (data.tarefas && data.tarefas.length > 0) {
      const tasksToInsert = data.tarefas.map(t => ({
        wedding_id: wedding.id,
        titulo: t.titulo,
        descricao: t.descricao,
        categoria: t.categoria,
        data_limite: t.dataLimite,
        status: t.status,
        ordem: t.ordem
      }));

      const { error: tError } = await supabase
        .from('tasks')
        .insert(tasksToInsert);
      
      if (tError) throw tError;
    }

    return { success: true, weddingId: wedding.id };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error };
  }
};
