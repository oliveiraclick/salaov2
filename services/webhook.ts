
// CONFIGURAÇÃO DE INTEGRAÇÃO - SAAS ADMIN PRO
// As credenciais agora são lidas do LocalStorage (configuradas na aba Ajustes do App)

const STORAGE_KEY_INTEGRATION = 'saas_integration_config';

export const getIntegrationConfig = () => {
  const data = localStorage.getItem(STORAGE_KEY_INTEGRATION);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

export const saveIntegrationConfig = (config: { endpoint: string, apiKey: string, projectId: string }) => {
  localStorage.setItem(STORAGE_KEY_INTEGRATION, JSON.stringify(config));
};

export interface FinancialPayload {
  projectId: string;
  type: 'RECEITA' | 'DESPESA';
  category: 'Servidores e Infra' | 'Domínios e SSL' | 'Desenvolvimento e Design' | 'Marketing e Anúncios' | 'Licenças de Software' | 'Assinaturas' | 'Venda Vitalícia (LTD)' | 'Serviços Personalizados' | 'Outros';
  amount: number;
  date: string; // ISO 8601
  description: string;
}

/**
 * Envia dados financeiros para o Dashboard Centralizado (SaaS Admin Pro)
 */
export const sendFinancialWebhook = async (data: Omit<FinancialPayload, 'projectId'>) => {
  const config = getIntegrationConfig();

  // Se as credenciais não estiverem configuradas, loga no console (modo dev ou não configurado)
  if (!config || !config.endpoint || !config.apiKey || !config.projectId) {
    console.log('[SaaS Integration] Webhook ignorado (Faltam credenciais em Ajustes). Dados:', data);
    return;
  }

  try {
    const payload: FinancialPayload = {
      ...data,
      projectId: config.projectId
    };

    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erro API (${response.status}): ${errText}`);
    }

    console.log('[SaaS Integration] Transação enviada com sucesso para o Painel Pro!');
  } catch (error) {
    console.error('[SaaS Integration] Falha ao enviar transação:', error);
  }
};
