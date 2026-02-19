// app/actions/test-whatsapp.ts
'use server'

import { sendWhatsAppMessage, checkWhatsAppStatus } from "@/lib/whatsapp-client";

export async function testConnection(phoneNumber: string) {
  console.log("--- Iniciando Teste de WhatsApp ---");
  
  // 1. Verificar Status
  const isOnline = await checkWhatsAppStatus();
  if (!isOnline) {
    return { success: false, message: "O serviço WhatsApp (Docker) parece estar offline ou desconectado." };
  }

  // 2. Tentar Enviar
  const result = await sendWhatsAppMessage(
    phoneNumber, 
    "👋 Olá! Esta é uma mensagem de teste do Sistema Synapse (Fazenda Digital)."
  );

  if (result.success) {
    return { success: true, message: "Mensagem enviada com sucesso!" };
  } else {
    return { success: false, message: `Erro no envio: ${result.error}` };
  }
}