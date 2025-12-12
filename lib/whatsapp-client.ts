// lib/whatsapp-client.ts

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_API_URL || 'http://localhost:3001';

interface WhatsAppResponse {
  success: boolean;
  response?: any;
  error?: string;
}

/**
 * Formata números brasileiros para o padrão internacional (55 + DDD + Número)
 */
function formatToBRInternational(phone: string): string {
  // 1. Remove tudo que não for número
  let cleanPhone = phone.replace(/\D/g, '');

  // 2. Lógica inteligente de DDD
  // Se tiver entre 10 e 11 dígitos (ex: 31999999999 ou 3133333333), assume que é BR sem DDI
  if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
    cleanPhone = '55' + cleanPhone;
  }

  // Se já vier com 55 (ex: 5531999999999), mantém como está.
  return cleanPhone;
}

export async function sendWhatsAppMessage(phone: string, message: string): Promise<WhatsAppResponse> {
  try {
    if (!phone || !message) {
      throw new Error('Telefone e mensagem são obrigatórios.');
    }

    // AQUI ESTÁ A CORREÇÃO: Formatamos antes de enviar
    const formattedPhone = formatToBRInternational(phone);

    console.log(`[WhatsApp Client] Enviando para: ${formattedPhone} (Original: ${phone})`);

    const res = await fetch(`${WHATSAPP_SERVICE_URL}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: formattedPhone, // Enviamos o número já corrigido
        message: message,
      }),
      cache: 'no-store', 
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Erro desconhecido ao comunicar com serviço WhatsApp');
    }

    return { success: true, response: data };

  } catch (error: any) {
    console.error(`[WhatsApp Error] Falha ao enviar para ${phone}:`, error.message);
    return { success: false, error: error.message };
  }
}

export async function checkWhatsAppStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${WHATSAPP_SERVICE_URL}/status`, { cache: 'no-store' });
    const data = await res.json();
    return data.ready === true;
  } catch (error) {
    return false;
  }
}