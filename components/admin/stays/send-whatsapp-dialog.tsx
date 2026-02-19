"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Stay } from '@/types';
import { sendCommunicationAction } from '@/app/actions/send-communication'; // Reutilizando a action existente
import { useAuth } from '@/context/AuthContext';

interface SendWhatsappDialogProps {
    isOpen: boolean;
    onClose: () => void;
    stay: Stay | null;
}

export function SendWhatsappDialog({ isOpen, onClose, stay }: SendWhatsappDialogProps) {
    const { user } = useAuth();
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleSend = async () => {
        if (!stay || !user?.email || !message.trim()) return;

        // Tenta pegar o telefone do hóspede (prioriza o da estadia, depois o do perfil)
        const phone = stay.guestPhone || stay.guest?.phone;

        if (!phone) {
            toast.error("Telefone não encontrado para esta estadia.");
            return;
        }

        setIsSending(true);
        try {
            const result = await sendCommunicationAction({
                phone,
                message,
                guestName: stay.guestName,
                stayId: stay.id,
                adminEmail: user.email,
                templateKey: 'custom_message' // Indica mensagem manual
            });

            if (result.success) {
                toast.success("Mensagem enviada com sucesso!");
                setMessage('');
                onClose();
            } else {
                toast.error(result.message || "Erro ao enviar mensagem.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Erro de conexão.");
        } finally {
            setIsSending(false);
        }
    };

    if (!stay) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Enviar WhatsApp</DialogTitle>
                    <DialogDescription>
                        Para: <b>{stay.guestName}</b>
                        <br/>
                        <span className="text-xs text-muted-foreground">
                            Tel: {stay.guestPhone || stay.guest?.phone || "Não informado"}
                        </span>
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="message">Mensagem</Label>
                        <Textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Digite sua mensagem aqui..."
                            className="min-h-[120px]"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSending}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSend} disabled={isSending || !message.trim()} className="bg-green-600 hover:bg-green-700">
                        {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Enviar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}