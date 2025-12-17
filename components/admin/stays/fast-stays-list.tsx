//components\admin\stays\fast-stays-list.tsx
"use client";

import React, { useState } from 'react';
import { Stay } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Send, Phone, Loader2, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react'; // Ícone CheckCircle2 adicionado
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { resendFastStayWhatsapp } from '@/app/actions/resend-whatsapp';
import { deleteFastStayAction } from '@/app/actions/delete-fast-stay';
import { CounterCheckinModal } from './counter-checkin-modal'; // Importando o Modal

interface FastStaysListProps {
    stays: Stay[];
}

export const FastStaysList: React.FC<FastStaysListProps> = ({ stays }) => {
    // Estado para Reenvio
    const [selectedStay, setSelectedStay] = useState<Stay | null>(null);
    const [phoneToEdit, setPhoneToEdit] = useState("");
    const [isResendDialogOpen, setIsResendDialogOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Estado para Exclusão
    const [stayToDelete, setStayToDelete] = useState<Stay | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Estado para Check-in de Balcão
    const [selectedStayForCheckin, setSelectedStayForCheckin] = useState<Stay | null>(null);

    // --- FUNÇÕES DE REENVIO ---
    const handleOpenResend = (stay: Stay) => {
        const s = stay as any;
        const currentPhone = s.guestPhone || s.tempGuestPhone || "";
        setPhoneToEdit(currentPhone);
        setSelectedStay(stay);
        setIsResendDialogOpen(true);
    };

    const handleResend = async () => {
        if (!selectedStay) return;
        const cleanPhone = phoneToEdit.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
            toast.error("Telefone inválido.");
            return;
        }

        setIsProcessing(true);
        try {
            const result = await resendFastStayWhatsapp(selectedStay.id, cleanPhone);
            if (result.success) {
                toast.success(result.message);
                setIsResendDialogOpen(false);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error("Erro inesperado.");
        } finally {
            setIsProcessing(false);
        }
    };

    // --- FUNÇÕES DE EXCLUSÃO ---
    const handleOpenDelete = (stay: Stay) => {
        setStayToDelete(stay);
        setIsDeleteDialogOpen(true);
    };

    const handleDelete = async () => {
        if (!stayToDelete) return;

        setIsProcessing(true);
        try {
            const result = await deleteFastStayAction(stayToDelete.id);
            if (result.success) {
                toast.success(result.message);
                setIsDeleteDialogOpen(false);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error("Erro ao excluir.");
        } finally {
            setIsProcessing(false);
            setStayToDelete(null);
        }
    };

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Hóspede</TableHead>
                        <TableHead>Cabana</TableHead>
                        <TableHead>Check-in</TableHead>
                        <TableHead>Telefone (Atual)</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {stays.length > 0 ? (
                        stays.map(stay => {
                            const s = stay as any;
                            return (
                                <TableRow key={stay.id}>
                                    <TableCell className="font-medium">
                                        {stay.guestName}
                                        <div className="text-xs text-muted-foreground">Token: {s.token}</div>
                                    </TableCell>
                                    <TableCell>{stay.cabinName}</TableCell>
                                    <TableCell>{format(new Date(stay.checkInDate), "dd/MM")}</TableCell>
                                    <TableCell>{s.guestPhone || s.tempGuestPhone}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {/* BOTÃO DE CHECK-IN NO BALCÃO */}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-green-600 border-green-200 hover:bg-green-50 h-8"
                                                onClick={() => setSelectedStayForCheckin(stay)}
                                                title="Realizar Check-in de Balcão"
                                            >
                                                <CheckCircle2 className="w-3 h-3 mr-1" /> Check-in
                                            </Button>

                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="text-blue-600 border-blue-200 hover:bg-blue-50 h-8"
                                                onClick={() => handleOpenResend(stay)}
                                                title="Reenviar WhatsApp"
                                            >
                                                <Send className="w-3 h-3 mr-1" /> Reenviar
                                            </Button>
                                            
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                                onClick={() => handleOpenDelete(stay)}
                                                title="Cancelar/Excluir"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    ) : (
                        <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Nenhum Fast Stay aguardando preenchimento.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>

            {/* Modal de Reenvio */}
            <Dialog open={isResendDialogOpen} onOpenChange={setIsResendDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reenviar Convite WhatsApp</DialogTitle>
                        <DialogDescription>
                            Corrija o número se necessário e reenvie o link de acesso.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>Número do Celular</Label>
                        <div className="flex items-center gap-2 mt-1.5">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <Input 
                                value={phoneToEdit} 
                                onChange={(e) => setPhoneToEdit(e.target.value)}
                                placeholder="55..." 
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsResendDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleResend} disabled={isProcessing} className="bg-green-600 hover:bg-green-700 text-white">
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Send className="w-4 h-4 mr-2"/>}
                            Enviar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Alerta de Exclusão */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" /> Cancelar Estadia Rápida?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Você tem certeza que deseja excluir a reserva pendente de <strong>{stayToDelete?.guestName}</strong>?
                            <br/><br/>
                            Essa ação não pode ser desfeita e o link enviado no WhatsApp deixará de funcionar.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessing}>Voltar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDelete} 
                            disabled={isProcessing}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            {isProcessing ? "Excluindo..." : "Sim, Excluir"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* MODAL DE CHECK-IN DE BALCÃO */}
            {selectedStayForCheckin && (
                <CounterCheckinModal 
                    stay={selectedStayForCheckin}
                    isOpen={!!selectedStayForCheckin}
                    onClose={() => setSelectedStayForCheckin(null)}
                />
            )}
        </>
    );
};