'use server'

import { sendWhatsAppMessage, checkWhatsAppStatus } from "@/lib/whatsapp-client";

export async function testWhatsAppConnection(phoneNumber: string) {
  try {
    // 1. Checa se o Docker está respondendo
    const isOnline = await checkWhatsAppStatus();
    if (!isOnline) {
      return { success: false, message: "O serviço Docker está offline ou desconectado." };
    }

    // 2. Tenta enviar mensagem simples
    const result = await sendWhatsAppMessage(
      phoneNumber, 
      "🔔 *Teste Synapse*\nSe você recebeu isso, a integração está 100% funcional!"
    );

    if (result.success) {
      return { success: true, message: "Mensagem enviada! Verifique o celular." };
    } else {
      return { success: false, message: `Erro ao enviar: ${JSON.stringify(result.error)}` };
    }
  } catch (error: any) {
    return { success: false, message: `Erro crítico: ${error.message}` };
  }
}