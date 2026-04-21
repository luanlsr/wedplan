
export const maskPhone = (value: string) => {
  if (!value) return "";
  // Remove tudo que não é dígito
  const digits = value.replace(/\D/g, "");
  
  // Limita a 11 dígitos
  const limited = digits.slice(0, 11);
  
  // Aplica a máscara (00) 00000-0000 ou (00) 0000-0000
  if (limited.length <= 10) {
    return limited
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  } else {
    return limited
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  }
};

export const maskCurrency = (value: string | number) => {
  if (value === undefined || value === null) return "";
  
  // Converte para string com 2 casas decimais e remove não dígitos
  const digits = (typeof value === 'number' ? value.toFixed(2) : value).replace(/\D/g, "");
  
  // Formata como moeda brasileira
  const amount = Number(digits) / 100;
  
  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const unmaskCurrency = (value: string): number => {
  if (!value) return 0;
  const digits = value.replace(/\D/g, "");
  return Number(digits) / 100;
};
