export type PaymentStatus = "pago" | "parcial" | "pendente" | "atrasado";
export type UserRole = "master" | "couple" | "staff" | "admin";

export type PaymentType = "parcelado_fixo" | "entrada_parcelas" | "entrada_quitacao" | "percentual_restante" | "pagamento_unico";

export interface Installment {
  id: string;
  supplier_id?: string;
  numero: number;
  valor: number;
  dataVencimento: string;
  status: "pago" | "pendente";
  dataPagamento?: string | null;
}

export interface Supplier {
  id: string;
  wedding_id?: string;
  categoria: string;
  servico: string;
  fornecedor: string;
  valorTotal: number;
  tipoPagamento: PaymentType;
  dataContrato: string;
  regraPagamento?: string;
  parcelas: Installment[];
  status: PaymentStatus;
  observacoes?: string;
  order?: number;
  // Expanded fields for editing/logic
  numeroParcelas?: number;
  valorEntrada?: number;
  porcentagemEntrada?: number;
  entradaEmParcelas?: number;
  diasPagamentoFinalAntesCasamento?: number;
  staff_names?: string;
  phone?: string;
  email?: string;
  cnpj_cpf?: string;
  address?: string;
  contract_url?: string;
}

export interface Guest {
  id: string;
  nome: string;
  categoria: string;
  status: "confirmado" | "pendente" | "recusado";
  adultos: number;
  criancas: number;
  children_names?: string;
  telefone?: string;
  observacoes?: string;
  is_present?: boolean;
  invitation_sent?: boolean;
}

export interface Task {
  id: string;
  titulo: string;
  descricao?: string;
  categoria: string;
  dataLimite?: string;
  status: "pendente" | "em_progresso" | "concluido";
  ordem: number;
}

export interface TimelineItem {
  id: string;
  categoryId: string;
  titulo: string;
  descricao?: string;
  data: string;
  status: "pendente" | "em_progresso" | "concluido";
  ordem: number;
}

export interface TimelineCategory {
  id: string;
  wedding_id?: string;
  nome: string;
  cor: string;
  ordem: number;
  itens: TimelineItem[];
}

export interface WeddingData {
  id?: string;
  account_id?: string | null;
  role?: UserRole;
  public_checkin_token?: string;
  asaas_subscription_id?: string;
  subscription_status?: "trial" | "active" | "past_due" | "canceled";
  account_status?: "trial" | "active" | "pending_payment" | "past_due" | "canceled";
  plan_id?: string | null;
  plan_status?: "incomplete" | "trialing" | "active" | "past_due" | "canceled" | "expired" | "pending_payment" | null;
  billing_interval?: "monthly" | "yearly" | null;
  plan_current_period_start?: string | null;
  plan_current_period_end?: string | null;
  plan_access_expires_at?: string | null;
  plan_access_checked_at?: string | null;
  plan_access_source?: string | null;
  refund_window_started_at?: string | null;
  refund_window_ends_at?: string | null;
  refund_window_status?: "not_started" | "eligible" | "expired" | "requested" | "refunded" | "denied" | null;
  userName?: string;
  guided_tour_completed_at?: string | null;
  casal: {
    nome1: string;
    nome2: string;
    data: string;
  };
  fornecedores: Supplier[];
  convidados?: Guest[];
  tarefas?: Task[];
  cronograma?: TimelineCategory[];
  configuracoes: {
    orcamentoTotal: number;
    tema: "light" | "dark";
  };
  simulation?: Record<string, unknown>;
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  asaas_customer_id?: string;
  plan_id?: string | null;
  plan_status?: string | null;
  billing_interval?: string | null;
  plan_current_period_end?: string | null;
  guided_tour_completed_at?: string | null;
}

export interface FinancialStats {
  totalOrcado: number;
  totalContratado: number;
  totalPago: number;
  totalRestante: number;
  porCategoria: Record<string, number>;
  porStatus: Record<PaymentStatus, number>;
  proximosVencimentos: {
    fornecedor: string;
    valor: number;
    data: string;
    parcela?: number;
    totalParcelas?: number;
  }[];
}
