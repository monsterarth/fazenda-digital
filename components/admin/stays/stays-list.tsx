// components/admin/stays/stays-list.tsx

"use client";

import React, { useState, useTransition } from 'react';
import ReactDOM from 'react-dom/client';
import { Stay } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Edit, Printer, MoreHorizontal, LogOut, Loader2 } from 'lucide-react'; // Removido PlusCircle
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { ThermalCoupon } from './thermal-coupon';
import { useModalStore } from '@/hooks/use-modal-store';
import { finalizeStayAction } from '@/app/actions/finalize-stay';

interface StaysListProps {
    stays: Stay[];
}

export const StaysList: React.FC<StaysListProps> = ({ stays }) => {
    const { user } = useAuth();
    const { onOpen } = useModalStore();
    
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [stayToEnd, setStayToEnd] = useState<Stay | null>(null);
    const [isPending, startTransition] = useTransition();

    const handleOpenEndStayDialog = (stay: Stay) => {
        setStayToEnd(stay);
        setIsAlertOpen(true);
    };

    const handleEndStay = () => {
        if (!stayToEnd || !user || !user.email) {
            toast.error("Erro de autenticação.");
            return;
        }
        const stayId = stayToEnd.id;
        const adminEmail = user.email;

        startTransition(async () => {
            const toastId = toast.loading("Encerrando estadia e processando pesquisa...");
            try {
                const result = await finalizeStayAction(stayId, adminEmail);
                if (result.success) {
                    toast.success("Sucesso!", { id: toastId, description: result.message });
                } else {
                    toast.error("Erro ao finalizar", { id: toastId, description: result.message });
                }
            } catch (error) {
                toast.error("Erro inesperado", { id: toastId });
            } finally {
                setIsAlertOpen(false);
                setStayToEnd(null);
            }
        });
    };

    const handlePrintCoupon = (stay: Stay) => {
        const qrUrl = `${window.location.origin}/?token=${stay.token}`;
        const printWindow = window.open('', '_blank', 'width=302,height=500');

        if (printWindow) {
            printWindow.document.write(`
                <html><head><title>Cupom de Acesso</title><style>@page { size: 80mm 150mm; margin: 0; } body, html { margin: 0; padding: 0; width: 80mm; height: auto; overflow: hidden; }</style></head><body><div id="print-root"></div></body></html>
            `);
            printWindow.document.close();

            const printRootElement = printWindow.document.getElementById('print-root');
            if(printRootElement) {
                const root = ReactDOM.createRoot(printRootElement);
                root.render(
                    <React.StrictMode>
                        <ThermalCoupon stay={stay} qrUrl={qrUrl} propertyName="Fazenda do Rosa" />
                    </React.StrictMode>
                );
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                }, 250);
            }
        } else {
            toast.error("Habilite pop-ups para imprimir o cupom.");
        }
    };

    return (
        <>
            {/* BOTÃO REMOVIDO DAQUI - Agora ele fica no cabeçalho da página */}
            
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Cabana</TableHead>
                        <TableHead>Hóspede</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {stays.length > 0 ? (
                        stays.map(stay => (
                            <TableRow key={stay.id}>
                                <TableCell className="font-medium">{stay.cabinName}</TableCell>
                                <TableCell>{stay.guestName}</TableCell>
                                <TableCell>
                                    {format(new Date(stay.checkInDate), "dd/MM")} a {format(new Date(stay.checkOutDate), "dd/MM/yy")}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => onOpen('editStay', { stay })}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                <span>Detalhes / Editar</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handlePrintCoupon(stay)}><Printer className="mr-2 h-4 w-4" /><span>Imprimir Cupom</span></DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => handleOpenEndStayDialog(stay)}><LogOut className="mr-2 h-4 w-4" /><span>Encerrar Estadia</span></DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow><TableCell colSpan={4} className="h-24 text-center">Nenhuma estadia ativa no momento.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Encerramento</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja encerrar a estadia de <span className="font-bold">{stayToEnd?.guestName}</span>?
                            <br/><br/>
                            <span className="text-sm text-muted-foreground block bg-muted p-2 rounded">
                                ℹ️ Isso enviará automaticamente a <strong>Pesquisa de Satisfação</strong> para o WhatsApp do hóspede.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleEndStay} disabled={isPending} className="bg-red-600 hover:bg-red-700">
                            {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</> : "Sim, Encerrar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};