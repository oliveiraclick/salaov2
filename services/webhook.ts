
// CONFIGURAÇÃO DE INTEGRAÇÃO - SAAS ADMIN PRO
// Preencha estas variáveis quando tiver os dados do painel gerado.
const WEBHOOK_ENDPOINT = ''; // Ex: https://api.saasadminpro.com/v1/events
const PROJECT_API_KEY = '';  // Ex: sk_live_...
const PROJECT_ID = '';       // Ex: proj_123456

export interface FinancialPayload {
  projectId: string;
  type: 'RECEITA' | 'DESPESA';
  category: string;
  amount: number;
  date: string; // ISO 8601
  description: string;
}

/**
 * Envia dados financeiros para o Dashboard Centralizado (SaaS Admin Pro)
 */
export const sendFinancialWebhook = async (data: Omit<FinancialPayload, 'projectId'>) => {
  // Se as credenciais não estiverem configuradas, loga no console e encerra (modo dev)
  if (!WEBHOOK_ENDPOINT || !PROJECT_API_KEY || !PROJECT_ID) {
    console.log('[SaaS Integration] Webhook não configurado. Dados que seriam enviados:', data);
    return;
  }

  try {
    const payload: FinancialPayload = {
      ...data,
      projectId: PROJECT_ID
    };

    const response = await fetch(WEBHOOK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PROJECT_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Erro API: ${response.statusText}`);
    }

    console.log('[SaaS Integration] Transação enviada com sucesso!');
  } catch (error) {
    console.error('[SaaS Integration] Falha ao enviar transação:', error);
    // Aqui poderia haver uma lógica de "fila" para tentar enviar novamente depois (Retry pattern)
  }
};
