"use client";

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Stay } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Edit, Printer } from 'lucide-react';
import { ThermalCoupon } from './thermal-coupon';

interface StaysListProps {
    activeStays: Stay[];
    onEditStay: (stay: Stay) => void;
}

export const StaysList: React.FC<StaysListProps> = ({ activeStays, onEditStay }) => {

    const handlePrintCoupon = (stay: Stay) => {
        // ++ INÍCIO DA CORREÇÃO: A URL agora inclui o token de acesso ++
        const qrUrl = `${window.location.origin}/acesso?stayId=${stay.id}&token=${stay.token}`;
        // ++ FIM DA CORREÇÃO ++

        const printWindow = window.open('', '_blank', 'width=400,height=600');
        
        if (printWindow) {
            printWindow.document.write('<html><head><title>Cupom de Acesso</title></head><body><div id="print-root"></div></body></html>');
            printWindow.document.close();

            const printRootElement = printWindow.document.getElementById('print-root');
            if(printRootElement) {
                const root = ReactDOM.createRoot(printRootElement);
                root.render(
                    <React.StrictMode>
                        <ThermalCoupon stay={stay} qrUrl={qrUrl} />
                    </React.StrictMode>
                );

                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                }, 500);
            }
        } else {
            alert("Por favor, habilite pop-ups para imprimir o cupom.");
        }
    };

    return (
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
                            <TableCell className="text-right space-x-2">
                                <Button variant="outline" size="sm" onClick={() => onEditStay(stay)}>
                                    <Edit className="mr-2 h-4 w-4"/> Detalhes
                                </Button>
                                <Button variant="secondary" size="sm" onClick={() => handlePrintCoupon(stay)}>
                                    <Printer className="mr-2 h-4 w-4"/> Imprimir
                                </Button>
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
    );
};