// components/admin/guests/guests-list.tsx

"use client";

import React, { useState, useMemo } from 'react';
import { Guest } from '@/types';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Input 
} from '@/components/ui/input';
import { 
  Button 
} from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  PlusCircle 
} from 'lucide-react';
import { format } from 'date-fns';
import { useModalStore } from '@/hooks/use-modal-store';
// ++ INÍCIO DA CORREÇÃO ++
import { getMillisFromTimestamp } from '@/lib/utils'; // Importa a nossa função auxiliar
// ++ FIM DA CORREÇÃO ++


interface GuestsListProps {
  initialGuests: Guest[];
}

export const GuestsList: React.FC<GuestsListProps> = ({ initialGuests }) => {
  const [guests, setGuests] = useState<Guest[]>(initialGuests);
  const [searchTerm, setSearchTerm] = useState('');
  const { onOpen } = useModalStore();

  const filteredGuests = useMemo(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    if (!lowercasedFilter) return guests;

    return guests.filter(guest => 
      guest.name.toLowerCase().includes(lowercasedFilter) ||
      guest.document.includes(lowercasedFilter) ||
      guest.email.toLowerCase().includes(lowercasedFilter)
    );
  }, [guests, searchTerm]);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Hóspedes</h1>
      </div>
      
      <div className="border shadow-sm rounded-lg">
        <div className="p-4">
          <Input 
            placeholder="Buscar por nome, CPF ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead className="text-center">Nº de Estadias</TableHead>
              <TableHead>Última Visita</TableHead>
              <TableHead>
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGuests.length > 0 ? (
              filteredGuests.map((guest) => (
                <TableRow key={guest.id}>
                  <TableCell className="font-medium">{guest.name}</TableCell>
                  <TableCell>{guest.document}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{guest.email}</span>
                      <span className="text-xs text-muted-foreground">{guest.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{guest.stayHistory?.length || 0}</TableCell>
                  <TableCell>
                    {/* ++ INÍCIO DA CORREÇÃO: Usando a função getMillisFromTimestamp ++ */}
                    {guest.updatedAt ? format(new Date(getMillisFromTimestamp(guest.updatedAt)), 'dd/MM/yyyy') : '-'}
                    {/* ++ FIM DA CORREÇÃO ++ */}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onOpen('createStay', { guest })}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Criar Nova Estadia
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Nenhum hóspede encontrado para o termo "{searchTerm}".
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </main>
  );
};