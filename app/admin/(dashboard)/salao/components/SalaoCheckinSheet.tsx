// app/admin/(dashboard)/salao/components/SalaoCheckinSheet.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, query, where, onSnapshot, doc, updateDoc,
  writeBatch, serverTimestamp, addDoc,
} from 'firebase/firestore';
import { BreakfastAttendee } from '@/types/cafe';
import { Loader2, User, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface CabinGroup {
  cabinName: string;
  attendees: BreakfastAttendee[];
}

interface Props {
  pendingGroups: CabinGroup[];
  stats: { pending: number };
  onClose: () => void; // Para fechar o Sheet
}

/**
 * Este componente vive dentro de um <Sheet> e gerencia
 * todo o fluxo de Check-in e Adição de Visitantes.
 */
export function SalaoCheckinSheet({ pendingGroups, stats, onClose }: Props) {
  // --- Estados dos Modais INTERNOS ---
  const [checkInModal, setCheckInModal] = useState<{ isOpen: boolean; attendee: BreakfastAttendee | null }>({ isOpen: false, attendee: null });
  const [batchModal, setBatchModal] = useState<{ isOpen: boolean; group: CabinGroup | null }>({ isOpen: false, group: null });
  const [visitorModal, setVisitorModal] = useState(false);

  // --- Estados de Controle dos Modais ---
  const [tableNumber, setTableNumber] = useState(''); // Para check-in
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(new Set()); // Para check-in em lote
  const [visitorName, setVisitorName] = useState('');
  const [visitorTable, setVisitorTable] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  const todayStr = useMemo(() => new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'America/Sao_Paulo',
  }).format(new Date()), []);

  // --- Handlers de Check-in ---
  const handleOpenCheckInModal = (attendee: BreakfastAttendee) => {
    setTableNumber(attendee.table || '');
    setCheckInModal({ isOpen: true, attendee: attendee });
    setIsUpdating(false);
  };
  const handleCloseCheckInModal = () => {
    setCheckInModal({ isOpen: false, attendee: null });
    setTableNumber('');
  };
  const handleConfirmCheckIn = async () => {
    if (!checkInModal.attendee) return;
    setIsUpdating(true);
    try {
      const docRef = doc(db, 'breakfastAttendees', checkInModal.attendee.id); 
      await updateDoc(docRef, {
        status: 'attended',
        table: tableNumber.trim() || null,
        checkInAt: serverTimestamp(),
      });
      toast.success(`Check-in de ${checkInModal.attendee.guestName} registrado!`);
      handleCloseCheckInModal();
      if (stats.pending === 1) onClose(); // Fecha o sheet se foi o último
    } catch (err: any) {
      toast.error("Falha ao registrar o check-in.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenBatchModal = (group: CabinGroup) => {
    setTableNumber(''); setSelectedAttendees(new Set());
    setBatchModal({ isOpen: true, group: group });
    setIsUpdating(false);
  };
  const handleCloseBatchModal = () => {
    setBatchModal({ isOpen: false, group: null });
    setTableNumber('');
  };
  const handleToggleAttendee = (attendeeId: string) => {
    const newSelection = new Set(selectedAttendees);
    if (newSelection.has(attendeeId)) newSelection.delete(attendeeId);
    else newSelection.add(attendeeId);
    setSelectedAttendees(newSelection);
  };
  const handleConfirmBatchCheckIn = async () => {
    if (selectedAttendees.size === 0) return toast.warning("Nenhum hóspede selecionado.");
    setIsUpdating(true);
    const toastId = toast.loading(`Registrando ${selectedAttendees.size} check-ins...`);
    try {
      const batch = writeBatch(db);
      const table = tableNumber.trim() || null;
      selectedAttendees.forEach((attendeeId) => {
        const docRef = doc(db, 'breakfastAttendees', attendeeId);
        batch.update(docRef, { status: 'attended', table: table, checkInAt: serverTimestamp() });
      });
      await batch.commit();
      toast.success("Check-ins registrados com sucesso!", { id: toastId });
      handleCloseBatchModal();
      if (stats.pending === selectedAttendees.size) onClose(); // Fecha o sheet se foram os últimos
    } catch (err: any) {
      toast.error("Falha ao registrar check-in em lote.", { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddVisitor = async () => {
    if (!visitorName.trim()) return toast.warning("O nome do visitante é obrigatório.");
    setIsUpdating(true);
    const toastId = toast.loading("Adicionando visitante...");
    try {
      const newAttendee: Omit<BreakfastAttendee, 'id'> = {
        stayId: 'VISITOR', cabinName: 'Visitante', guestName: visitorName.trim(),
        isPrimary: true, date: todayStr, status: 'attended',
        table: visitorTable.trim() || null,
        checkInAt: serverTimestamp() as any, createdAt: serverTimestamp() as any,
      };
      await addDoc(collection(db, 'breakfastAttendees'), newAttendee);
      toast.success("Visitante adicionado!", { id: toastId });
      setVisitorModal(false); setVisitorName(''); setVisitorTable('');
      onClose(); // Fecha o sheet principal
    } catch (err: any) {
      toast.error("Falha ao adicionar visitante.", { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <>
      <SheetContent className="sm:max-w-lg p-0">
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="text-2xl text-brand-dark-green">
            Fazer Check-in
          </SheetTitle>
          <SheetDescription>
            Registre a entrada dos hóspedes pendentes ou adicione um visitante.
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100%-120px)]">
          <div className="p-6 space-y-6">
            <section>
              <Button 
                variant="outline" 
                className="w-full" 
                size="lg" 
                onClick={() => setVisitorModal(true)}
              >
                <UserPlus className="h-5 w-5 mr-3" />
                Adicionar Visitante / Passante
              </Button>
            </section>
            
            <Separator />

            <section>
              <h3 className="text-xl font-semibold text-brand-dark-green mb-3">
                Check-in Pendente ({stats.pending})
              </h3>
              {pendingGroups.length === 0 ? (
                <p className="text-brand-mid-green text-sm text-center p-4">
                  Todos os hóspedes esperados já fizeram check-in.
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingGroups.map((group) => (
                    <Card key={group.cabinName} className="bg-white shadow-sm">
                      <CardHeader className="flex flex-row items-center justify-between p-4">
                        <CardTitle className="text-lg text-brand-dark-green">{group.cabinName}</CardTitle>
                        <Button variant="outline" size="sm" onClick={() => handleOpenBatchModal(group)}>
                          <Users className="h-4 w-4 mr-2" />
                          Check-in em Lote
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-2 p-4 pt-0">
                        {group.attendees.map((attendee) => (
                          <div key={attendee.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-brand-mid-green" />
                              <span className="font-medium text-brand-dark-green">{attendee.guestName}</span>
                            </div>
                            <Button size="sm" onClick={() => handleOpenCheckInModal(attendee)}>Check-in</Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </div>
        </ScrollArea>
      </SheetContent>

      {/* --- Modais de Ação (agora vivem "acima" do Sheet) --- */}

      {/* Modal 1: Confirmar Check-in Hóspede (Individual) */}
      <AlertDialog open={checkInModal.isOpen} onOpenChange={(open) => !open && handleCloseCheckInModal()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Check-in</AlertDialogTitle>
            <AlertDialogDescription>
              Hóspede: <span className="font-medium text-brand-dark-green">{checkInModal.attendee?.guestName}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 my-4">
            <Label htmlFor="table-number-individual">Vincular à Mesa (Opcional)</Label>
            <Input id="table-number-individual" placeholder="Ex: Mesa 05" value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)} disabled={isUpdating} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancelar</AlertDialogCancel>
            <Button onClick={handleConfirmCheckIn} disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Check-in
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Modal 2: Check-in em LOTE */}
      <AlertDialog open={batchModal.isOpen} onOpenChange={(open) => !open && handleCloseBatchModal()}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Check-in em Lote: {batchModal.group?.cabinName}</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione os hóspedes que estão presentes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ScrollArea className="max-h-60 pr-4">
            <div className="space-y-3 my-4">
              {batchModal.group?.attendees.map((attendee) => (
                <div key={attendee.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                  <Checkbox
                    id={`cb-${attendee.id}`}
                    checked={selectedAttendees.has(attendee.id)}
                    onCheckedChange={() => handleToggleAttendee(attendee.id)}
                  />
                  <Label htmlFor={`cb-${attendee.id}`} className="flex-1 font-medium text-brand-dark-green cursor-pointer">
                    {attendee.guestName}
                  </Label>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="space-y-2">
            <Label htmlFor="table-number-batch">Vincular à Mesa (Opcional)</Label>
            <Input id="table-number-batch" placeholder="Ex: Mesa 05 (para todos)" value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)} disabled={isUpdating} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancelar</AlertDialogCancel>
            <Button onClick={handleConfirmBatchCheckIn} disabled={isUpdating || selectedAttendees.size === 0}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Fazer Check-in ({selectedAttendees.size})
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Modal 3: Adicionar Visitante */}
      <AlertDialog open={visitorModal} onOpenChange={setVisitorModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Adicionar Visitante / Passante</AlertDialogTitle>
            <AlertDialogDescription>
              Crie um registro para um visitante que não está em uma estadia.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 my-4">
              <div className="space-y-2">
              <Label htmlFor="visitor-name">Nome do Visitante</Label>
              <Input id="visitor-name" placeholder="Ex: João (Amigo Cab. 5)"
                value={visitorName} onChange={(e) => setVisitorName(e.target.value)} disabled={isUpdating} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visitor-table">Vincular à Mesa (Opcional)</Label>
              <Input id="visitor-table" placeholder="Ex: Mesa 10"
                value={visitorTable} onChange={(e) => setVisitorTable(e.target.value)} disabled={isUpdating} />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancelar</AlertDialogCancel>
            <Button onClick={handleAddVisitor} disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar e Fazer Check-in
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}