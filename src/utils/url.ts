/**
 * Retorna a URL base do site atual.
 * Prioriza a variável de ambiente VITE_SITE_URL se definida,
 * caso contrário utiliza o origin da janela atual.
 */
export const getSiteUrl = () => {
  const url = import.meta.env.VITE_SITE_URL || window.location.origin;
  
  // Garante que não termine com barra para evitar barras duplas no path
  return url.endsWith('/') ? url.slice(0, -1) : url;
};
