export type PaymentStatus = "pago" | "parcial" | "pendente" | "atrasado";
export type UserRole = "master" | "couple" | "staff";

export type PaymentType = "parcelado_fixo" | "entrada_parcelas" | "entrada_quitacao" | "percentual_restante" | "pagamento_unico";

export interface Installment {
  id: string;
  supplier_id?: string;
  numero: number;
  valor: number;
  dataVencimento: string;
  status: "pago" | "pendente";
  dataPagamento?: string;
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

export interface WeddingData {
  id?: string;
  role?: UserRole;
  public_checkin_token?: string;
  casal: {
    nome1: string;
    nome2: string;
    data: string;
  };
  fornecedores: Supplier[];
  convidados?: Guest[];
  tarefas?: Task[];
  configuracoes: {
    orcamentoTotal: number;
    tema: "light" | "dark";
  };
  simulation?: Record<string, unknown>;
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
