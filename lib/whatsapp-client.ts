// lib/whatsapp-client.ts

const WHATSAPP_SERVICE_URL = process.env.WHATSAPP_API_URL || 'http://localhost:3001';

interface WhatsAppResponse {
  success: boolean;
  response?: any;
  error?: string;
}

/**
 * Formata números. 
 * - Se começar com '+', respeita o DDI informado (Internacional).
 * - Se não, aplica a lógica de conveniência para o Brasil (adiciona 55).
 */
function formatPhoneForApi(phone: string): string {
  // Verifica se é explicitamente internacional (começa com +)
  const isExplicitInternational = phone.trim().startsWith('+');
  
  // Remove tudo que não for número para limpar a string
  let cleanPhone = phone.replace(/\D/g, '');

  // Se o usuário digitou +, mantemos o + para o servidor saber que não deve mexer no DDI
  if (isExplicitInternational) {
    return '+' + cleanPhone;
  }

  // Lógica inteligente de DDD (apenas se não for internacional explícito)
  // Se tiver entre 10 e 11 dígitos (ex: 31999999999), assume que é BR sem DDI e adiciona 55
  if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
    cleanPhone = '55' + cleanPhone;
  }

  return cleanPhone;
}

export async function sendWhatsAppMessage(phone: string, message: string): Promise<WhatsAppResponse> {
  try {
    if (!phone || !message) {
      throw new Error('Telefone e mensagem são obrigatórios.');
    }

    // AQUI ESTÁ A CORREÇÃO: Usamos a nova função que respeita o '+'
    const formattedPhone = formatPhoneForApi(phone);

    console.log(`[WhatsApp Client] Enviando para: ${formattedPhone} (Original: ${phone})`);

    const res = await fetch(`${WHATSAPP_SERVICE_URL}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: formattedPhone, // Envia com ou sem '+' dependendo da origem
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