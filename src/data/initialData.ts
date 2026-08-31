import type { WeddingData } from "../types";

export const INITIAL_DATA: WeddingData = {
  casal: {
    nome1: "",
    nome2: "",
    data: ""
  },
  fornecedores: [],
  cronograma: [],
  configuracoes: {
    orcamentoTotal: 50000,
    tema: "light"
  }
};
