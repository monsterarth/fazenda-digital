// fazenda-digital/components/admin/stays/stays-list.tsx

"use client";

import React, { useState } from 'react';
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

// INÍCIO DA CORREÇÃO: Adicionando a prop 'onPrintStay' à interface
interface StaysListProps {
    activeStays: Stay[];
    onEditStay: (stay: Stay) => void;
    onPrintStay: (stay: Stay) => void; // Prop para receber a função de impressão
}
// FIM DA CORREÇÃO

// Adicionando 'onPrintStay' aos props do componente
export const StaysList: React.FC<StaysListProps> = ({ activeStays, onEditStay, onPrintStay }) => {
    const { user, getIdToken } = useAuth();
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [stayToEnd, setStayToEnd] = useState<Stay | null>(null);
    const [isEnding, setIsEnding] = useState(false);

    const handleOpenEndStayDialog = (stay: Stay) => {
        setStayToEnd(stay);
        setIsAlertOpen(true);
    };

    const handleEndStay = async () => {
        if (!stayToEnd || !user) {
            toast.error("Não foi possível identificar a estadia ou o usuário para encerrar.");
            return;
        }

        setIsEnding(true);
        const toastId = toast.loading(`Encerrando estadia de ${stayToEnd.guestName}...`);

        try {
            const token = await getIdToken();
            if (!token) {
                throw new Error("Usuário não autenticado.");
            }

            const response = await fetch(`/api/admin/stays/${stayToEnd.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: 'end_stay',
                    adminUser: {
                        email: user.email,
                        name: user.displayName,
                    }
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Falha ao encerrar estadia.");
            }

            toast.success(`Estadia de ${stayToEnd.guestName} encerrada com sucesso.`, { id: toastId });
        } catch (error: any) {
            toast.error("Erro ao encerrar estadia.", {
                id: toastId,
                description: error.message,
            });
        } finally {
            setIsEnding(false);
            setStayToEnd(null);
            setIsAlertOpen(false);
        }
    };

    // A função local 'handlePrintCoupon' foi removida, pois a lógica agora está no componente pai.

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
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Abrir menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => onEditStay(stay)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                <span>Detalhes / Editar</span>
                                            </DropdownMenuItem>
                                            {/* INÍCIO DA CORREÇÃO: O onClick agora chama a prop 'onPrintStay' */}
                                            <DropdownMenuItem onClick={() => onPrintStay(stay)}>
                                                <Printer className="mr-2 h-4 w-4" />
                                                <span>Imprimir Cupom</span>
                                            </DropdownMenuItem>
                                            {/* FIM DA CORREÇÃO */}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem 
                                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                onClick={() => handleOpenEndStayDialog(stay)}
                                            >
                                                <LogOut className="mr-2 h-4 w-4" />
                                                <span>Encerrar Estadia</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                Nenhuma estadia ativa no momento.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Encerramento</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja encerrar a estadia de <span className="font-bold">{stayToEnd?.guestName}</span>? Esta ação não pode ser desfeita e a estadia será movida para o histórico.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isEnding}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleEndStay} disabled={isEnding} className="bg-red-600 hover:bg-red-700">
                            {isEnding ? "Encerrando..." : "Sim, Encerrar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};