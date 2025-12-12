// lib/whatsapp-client.ts

/**
 * URL do nosso serviço local Docker.
 * Em produção (se você subir isso pra nuvem), basta mudar essa variável de ambiente.
 */
const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_API_URL || 'http://localhost:3001';

interface WhatsAppResponse {
  success: boolean;
  response?: any;
  error?: string;
}

/**
 * Envia uma mensagem de texto via WhatsApp usando o microserviço local.
 * @param phone Número do telefone (ex: 5511999999999 ou 5511999999999@c.us)
 * @param message Conteúdo da mensagem
 */
export async function sendWhatsAppMessage(phone: string, message: string): Promise<WhatsAppResponse> {
  try {
    // 1. Validação básica para evitar chamadas desnecessárias
    if (!phone || !message) {
      throw new Error('Telefone e mensagem são obrigatórios.');
    }

    // 2. Chamada ao microserviço (Docker)
    const res = await fetch(`${WHATSAPP_SERVICE_URL}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: phone,
        message: message,
      }),
      // Cache: 'no-store' é importante para o Next.js não cachear requisições de API
      cache: 'no-store', 
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Erro desconhecido ao comunicar com serviço WhatsApp');
    }

    console.log(`[WhatsApp] Mensagem enviada para ${phone}`);
    return { success: true, response: data };

  } catch (error: any) {
    console.error(`[WhatsApp Error] Falha ao enviar para ${phone}:`, error.message);
    // Retornamos false mas não quebramos a aplicação inteira (fail-safe)
    return { success: false, error: error.message };
  }
}

/**
 * Verifica se o serviço de WhatsApp está online e conectado.
 */
export async function checkWhatsAppStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${WHATSAPP_SERVICE_URL}/status`, { cache: 'no-store' });
    const data = await res.json();
    return data.ready === true;
  } catch (error) {
    console.error('[WhatsApp Status] Serviço indisponível.');
    return false;
  }
}
