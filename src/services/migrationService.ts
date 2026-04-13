import { supabase } from '../lib/supabase';
import type { WeddingData } from '../types';

export const migrateLocalStorageToSupabase = async (userId: string, data: WeddingData) => {
  try {
    // 1. Create Wedding entry
    const { data: wedding, error: wError } = await supabase
      .from('weddings')
      .insert({
        couple_name1: data.casal.nome1,
        couple_name2: data.casal.nome2,
        wedding_date: data.casal.data,
        total_budget: data.configuracoes.orcamentoTotal,
        theme: data.configuracoes.tema
      })
      .select()
      .single();

    if (wError) throw wError;

    // 2. Create Wedding Member link
    const { error: mError } = await supabase
      .from('wedding_members')
      .upsert({
        wedding_id: wedding.id,
        user_id: userId,
        role: 'owner'
      });

    if (mError) throw mError;

    // 3. Migrate Suppliers & Installments
    for (const s of data.fornecedores) {
      const { data: supplier, error: sError } = await supabase
        .from('suppliers')
        .insert({
          wedding_id: wedding.id,
          name: s.fornecedor,
          service: s.servico,
          category: s.categoria,
          total_value: s.valorTotal,
          payment_type: s.tipoPagamento,
          status: s.status,
          order_index: s.order || 0,
          contract_date: s.dataContrato,
          payment_rule: s.regraPagamento,
          notes: s.observacoes,
          entry_value: s.valorEntrada,
          entry_percentage: s.porcentagemEntrada,
          entry_installments: s.entradaEmParcelas,
          num_installments: s.numeroParcelas,
          final_payment_days_before: s.diasPagamentoFinalAntesCasamento
        })
        .select()
        .single();

      if (sError) throw sError;

      // Migrate installments for this supplier
      const installmentsToInsert = s.parcelas.map(p => ({
        supplier_id: supplier.id,
        number: p.numero,
        due_date: p.dataVencimento,
        value: p.valor,
        status: p.status,
        payment_date: p.dataPagamento
      }));

      const { error: iError } = await supabase
        .from('installments')
        .insert(installmentsToInsert);

      if (iError) throw iError;
    }

    return { success: true, weddingId: wedding.id };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error };
  }
};
