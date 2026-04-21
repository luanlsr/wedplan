import type { WeddingData, FinancialStats, Installment, PaymentStatus } from "../types";
import { format, parseISO, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export const formatDate = (date: string) => {
  return format(parseISO(date), "dd/MM/yyyy", { locale: ptBR });
};

export const calculateStats = (data: WeddingData): FinancialStats => {
  let totalContratado = 0;
  let totalPago = 0;
  const porCategoria: Record<string, number> = {};
  const statusCounts: Record<string, number> = { pago: 0, parcial: 0, pendente: 0, atrasado: 0 };
  const proximosVencimentos: FinancialStats["proximosVencimentos"] = [];

  data.fornecedores.forEach((s) => {
    const supplierTotal = s.parcelas.reduce((acc, p) => acc + p.valor, 0);
    totalContratado += supplierTotal;

    // Category total
    porCategoria[s.categoria] = (porCategoria[s.categoria] || 0) + supplierTotal;

    // Status counts
    statusCounts[s.status]++;

    // Payments and next due dates
    s.parcelas.forEach((p) => {
      if (p.status === "pago") {
        totalPago += p.valor;
      } else {
        proximosVencimentos.push({
          fornecedor: s.fornecedor,
          valor: p.valor,
          data: p.dataVencimento,
          parcela: p.numero,
          totalParcelas: s.parcelas.length
        });
      }
    });
  });

  // Sort and filter next payments (next 30 days or late)
  const sortedPayments = proximosVencimentos
    .sort((a, b) => parseISO(a.data).getTime() - parseISO(b.data).getTime())
    .slice(0, 5);

  return {
    totalOrcado: data.configuracoes.orcamentoTotal,
    totalContratado,
    totalPago,
    totalRestante: totalContratado - totalPago,
    porCategoria,
    porStatus: statusCounts as Record<PaymentStatus, number>,
    proximosVencimentos: sortedPayments
  };
};

export const generateInstallments = (
  weddingDate: string,
  totalValue: number,
  type: string,
  config: {
    finalPaymentDaysBeforeWedding?: number | string;
    numInstallments?: number;
    startDate?: string;
    entryValue?: number;
    entryPercentage?: number;
    entryInInstallments?: number;
  }
): Installment[] => {
  const installments: Installment[] = [];
  const weddingDt = parseISO(weddingDate);

  const calculateLastDate = () => {
    // If we have a wedding date, the final payment date is ALWAYS relative to it.
    // If no specific quitação prazo is set, default to 15 days before.
    const days = config.finalPaymentDaysBeforeWedding !== undefined
      ? (parseInt(String(config.finalPaymentDaysBeforeWedding)) || 0)
      : 15;

    return format(subDays(weddingDt, days), "yyyy-MM-dd");
  };

  if (type === "parcelado_fixo") {
    const num = config.numInstallments || 1;
    const value = totalValue / num;
    const startDate = config.startDate ? parseISO(config.startDate) : new Date();

    for (let i = 1; i <= num; i++) {
      const defaultDate = format(addDays(startDate, (i - 1) * 30), "yyyy-MM-dd");
      const date = i === num ? calculateLastDate() : defaultDate;

      installments.push({
        id: Math.random().toString(36).substr(2, 9),
        numero: i,
        valor: value,
        dataVencimento: date,
        status: "pendente"
      });
    }
  } else if (type === "pagamento_unico") {
    installments.push({
      id: Math.random().toString(36).substr(2, 9),
      numero: 1,
      valor: totalValue,
      dataVencimento: calculateLastDate(),
      status: "pendente"
    });
  } else if (type === "entrada_quitacao") {
    const entryValueTotal = (config.entryValue !== undefined && !isNaN(config.entryValue)) ? config.entryValue : (totalValue * (config.entryPercentage || 30)) / 100;
    const remainingValue = totalValue - entryValueTotal;
    const entryInInstallments = config.entryInInstallments || 1;
    const startDate = config.startDate ? parseISO(config.startDate) : new Date();

    // Entry installments
    const entryValuePerInstallment = entryValueTotal / entryInInstallments;
    for (let i = 1; i <= entryInInstallments; i++) {
      installments.push({
        id: Math.random().toString(36).substr(2, 9),
        numero: i,
        valor: entryValuePerInstallment,
        dataVencimento: format(addDays(startDate, (i - 1) * 30), "yyyy-MM-dd"),
        status: "pendente"
      });
    }

    // Final Payment (Quitação) - Always at the end
    installments.push({
      id: Math.random().toString(36).substr(2, 9),
      numero: entryInInstallments + 1,
      valor: remainingValue,
      dataVencimento: calculateLastDate(), // Forced to target date
      status: "pendente"
    });
  } else if (type === "entrada_parcelas") {
    const entryValue = (config.entryValue !== undefined && !isNaN(config.entryValue)) ? config.entryValue : (totalValue * (config.entryPercentage || 30)) / 100;
    const remainingValue = totalValue - entryValue;
    const numInstallments = config.numInstallments || 1;
    const entryInInstallments = config.entryInInstallments || 1;
    const startDate = config.startDate ? parseISO(config.startDate) : new Date();

    // Entry installments
    const entryValuePerInstallment = entryValue / entryInInstallments;
    for (let i = 1; i <= entryInInstallments; i++) {
      installments.push({
        id: Math.random().toString(36).substr(2, 9),
        numero: i,
        valor: entryValuePerInstallment,
        dataVencimento: format(addDays(startDate, (i - 1) * 30), "yyyy-MM-dd"),
        status: "pendente"
      });
    }

    // Remaining installments
    const remainingValuePerInstallment = remainingValue / numInstallments;
    const lastEntryDate = addDays(startDate, (entryInInstallments - 1) * 30);
    for (let i = 1; i <= numInstallments; i++) {
      const defaultDate = format(addDays(lastEntryDate, i * 30), "yyyy-MM-dd");
      const date = i === numInstallments ? calculateLastDate() : defaultDate;

      installments.push({
        id: Math.random().toString(36).substr(2, 9),
        numero: entryInInstallments + i,
        valor: remainingValuePerInstallment,
        dataVencimento: date,
        status: "pendente"
      });
    }
  }

  return installments;
};
