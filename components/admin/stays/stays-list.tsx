// fazenda-digital/components/admin/stays/stays-list.tsx

"use client";

import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Stay } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Edit, Printer, MoreHorizontal, LogOut } from 'lucide-react';
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

// A prop onPrintStay foi removida, a lógica agora é interna.
interface StaysListProps {
    activeStays: Stay[];
    onEditStay: (stay: Stay) => void;
}

export const StaysList: React.FC<StaysListProps> = ({ activeStays, onEditStay }) => {
    const { user, getIdToken } = useAuth();
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [stayToEnd, setStayToEnd] = useState<Stay | null>(null);
    const [isEnding, setIsEnding] = useState(false);

    const handleOpenEndStayDialog = (stay: Stay) => {
        setStayToEnd(stay);
        setIsAlertOpen(true);
    };

    const handleEndStay = async () => {
        if (!stayToEnd || !user) return;
        setIsEnding(true);
        const toastId = toast.loading(`Encerrando estadia...`);
        try {
            const token = await getIdToken();
            const response = await fetch(`/api/admin/stays/${stayToEnd.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ action: 'end_stay', adminUser: { email: user.email, name: user.displayName } }),
            });
            if (!response.ok) throw new Error((await response.json()).error || "Falha ao encerrar.");
            toast.success(`Estadia encerrada.`, { id: toastId });
        } catch (error: any) {
            toast.error("Erro ao encerrar.", { id: toastId, description: error.message });
        } finally {
            setIsEnding(false);
            setIsAlertOpen(false);
        }
    };

    // ++ INÍCIO DA CORREÇÃO DA IMPRESSÃO ++
    const handlePrintCoupon = (stay: Stay) => {
        const qrUrl = `${window.location.origin}/?token=${stay.token}`;
        const printWindow = window.open('', '_blank', 'width=302,height=500'); // 80mm ~ 302px

        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Cupom de Acesso</title>
                        <style>
                            /* Força o tamanho da página a ser do tamanho do conteúdo */
                            @page { size: auto; margin: 0; }
                            body { margin: 0; background-color: #fff; }
                        </style>
                    </head>
                    <body>
                        <div id="print-root"></div>
                    </body>
                </html>
            `);
            printWindow.document.close();

            const printRootElement = printWindow.document.getElementById('print-root');
            if(printRootElement) {
                const root = ReactDOM.createRoot(printRootElement);
                // Renderiza o cupom na nova janela
                root.render(
                    <React.StrictMode>
                        <ThermalCoupon stay={stay} qrUrl={qrUrl} propertyName="Fazenda do Rosa" />
                    </React.StrictMode>
                );

                // Espera o conteúdo renderizar e então imprime
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                }, 250); // Um pequeno delay para garantir a renderização
            }
        } else {
            toast.error("Habilite pop-ups para imprimir o cupom.");
        }
    };
    // ++ FIM DA CORREÇÃO DA IMPRESSÃO ++

    return (
        <>
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
                    {activeStays.length > 0 ? (
                        activeStays.map(stay => (
                            <TableRow key={stay.id}>
                                <TableCell className="font-medium">{stay.cabinName}</TableCell>
                                <TableCell>{stay.guestName}</TableCell>
                                <TableCell>
                                    {format(new Date(stay.checkInDate), "dd/MM")} a {format(new Date(stay.checkOutDate), "dd/MM/yy")}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => onEditStay(stay)}><Edit className="mr-2 h-4 w-4" /><span>Detalhes / Editar</span></DropdownMenuItem>
                                            {/* O botão agora chama a função de impressão interna */}
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
                    <AlertDialogHeader><AlertDialogTitle>Confirmar Encerramento</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja encerrar a estadia de <span className="font-bold">{stayToEnd?.guestName}</span>? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel disabled={isEnding}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleEndStay} disabled={isEnding} className="bg-red-600 hover:bg-red-700">{isEnding ? "Encerrando..." : "Sim, Encerrar"}</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};