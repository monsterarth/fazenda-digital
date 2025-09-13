// app/actions/log-message-copy.ts

"use server";

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { collection, addDoc, Timestamp } from "firebase/firestore";

interface LogMessageCopyPayload {
    guestName: string;
    type: string;
    content: string;
    actor: string; // UID do usuário admin
}

export async function logMessageCopy(payload: LogMessageCopyPayload) {
    let actorEmail = "Sistema";
    try {
        if (payload.actor) {
            const userRecord = await adminAuth.getUser(payload.actor);
            actorEmail = userRecord.email || `Admin (${payload.actor.substring(0, 5)})`;
        }
    
        await adminDb.collection("messageLogs").add({
            guestName: payload.guestName,
            type: payload.type,
            content: payload.content,
            actor: actorEmail,
            copiedAt: Timestamp.now(),
        });
        
        return { success: true };
    } catch (error) {
        console.error("Falha ao registrar a cópia da mensagem:", error);
        
        // Tenta salvar mesmo com erro na busca do usuário
        try {
            await adminDb.collection("messageLogs").add({
                guestName: payload.guestName,
                type: payload.type,
                content: payload.content,
                actor: "Sistema (erro na identificação)",
                copiedAt: Timestamp.now(),
            });
            return { success: true, warning: "Could not identify user." };
        } catch (dbError) {
            console.error("Falha no registro de fallback:", dbError);
            return { success: false, error: (dbError as Error).message };
        }
    }
}