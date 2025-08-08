"use client";

import React from 'react';
import { Stay } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';

interface StaysListProps {
    activeStays: Stay[];
    onEditStay: (stay: Stay) => void;
}

export const StaysList: React.FC<StaysListProps> = ({ activeStays, onEditStay }) => {
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
                            <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => onEditStay(stay)}>
                                    <Edit className="mr-2 h-4 w-4"/> Detalhes
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