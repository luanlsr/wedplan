/**
 * Asaas Integration Service
 * 
 * ATENÇÃO: Chamadas à API do Asaas com a chave de API (access token) não devem ser feitas
 * diretamente do frontend no ambiente de produção, pois expõe a chave. 
 * O ideal é usar Supabase Edge Functions ou um backend Node.js para intermediar.
 * 
 * Por enquanto, deixaremos a estrutura pronta para consumir via Edge Function.
 */

const ASAAS_API_URL = import.meta.env.VITE_ASAAS_ENV === 'production' 
  ? 'https://api.asaas.com/v3' 
  : 'https://sandbox.asaas.com/api/v3';

// Essa chave NÃO deve ficar no .env do frontend em produção. 
// O ideal é chamar uma Edge Function do Supabase que por sua vez chama o Asaas.
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'access_token': import.meta.env.VITE_ASAAS_API_KEY || ''
});

export const asaasService = {
  /**
   * Cria um cliente no Asaas
   */
  async createCustomer(name: string, email: string, cpfCnpj?: string) {
    try {
      const response = await fetch(`${ASAAS_API_URL}/customers`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          name,
          email,
          cpfCnpj,
        })
      });
      
      if (!response.ok) throw new Error('Falha ao criar cliente no Asaas');
      return await response.json();
    } catch (error) {
      console.error('Asaas Error:', error);
      throw error;
    }
  },

  /**
   * Cria uma assinatura (Subscription)
   */
  async createSubscription(customerId: string, value: number, billingType: 'CREDIT_CARD' | 'PIX' | 'BOLETO' = 'PIX') {
    try {
      const response = await fetch(`${ASAAS_API_URL}/subscriptions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          customer: customerId,
          billingType,
          value,
          nextDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 dias de trial?
          cycle: 'MONTHLY',
          description: 'Assinatura WedPlan Pro'
        })
      });

      if (!response.ok) throw new Error('Falha ao criar assinatura no Asaas');
      return await response.json();
    } catch (error) {
      console.error('Asaas Error:', error);
      throw error;
    }
  },

  /**
   * Obtém o status de uma assinatura
   */
  async getSubscription(subscriptionId: string) {
    try {
      const response = await fetch(`${ASAAS_API_URL}/subscriptions/${subscriptionId}`, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (!response.ok) throw new Error('Falha ao buscar assinatura');
      return await response.json();
    } catch (error) {
      console.error('Asaas Error:', error);
      throw error;
    }
  }
};
