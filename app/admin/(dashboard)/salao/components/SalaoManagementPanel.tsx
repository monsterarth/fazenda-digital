// app/admin/(dashboard)/salao/components/SalaoManagementPanel.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, query, where, onSnapshot, doc, updateDoc,
  writeBatch, serverTimestamp, addDoc, Timestamp
} from 'firebase/firestore';
import { BreakfastAttendee, BreakfastTable } from '@/types/cafe';
import {
  Loader2, Users, ClipboardList, PlusCircle, LogIn, ArrowRightLeft,
  CheckCircle, RotateCcw, UserCheck, MapPin, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetTrigger } from '@/components/ui/sheet'; // ++ NOVO
import { SalaoCheckinSheet } from './SalaoCheckinSheet'; // ++ NOVO

// Tipos locais para os painéis
interface CabinGroup {
  cabinName: string;
  attendees: BreakfastAttendee[];
}
interface TableGroup {
  id: string; // doc ID de 'breakfastTables' (se existir)
  tableName: string;
  attendees: BreakfastAttendee[];
  totalCount: number;
}
interface Props {
  onSelectTable: (tableName: string) => void;
  selectedTableId: string | null;
}

/**
 * Painel que unifica a lógica de Check-in e Gerenciamento de Mesas.
 */
export function SalaoManagementPanel({ onSelectTable, selectedTableId }: Props) {
  const [allAttendees, setAllAttendees] = useState<BreakfastAttendee[]>([]);
  const [tables, setTables] = useState<BreakfastTable[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Estados dos Modais ---
  const [moveModal, setMoveModal] = useState<{ isOpen: boolean; attendee: BreakfastAttendee | null }>({ isOpen: false, attendee: null });
  const [batchAssignModal, setBatchAssignModal] = useState(false);
  const [newTableModal, setNewTableModal] = useState(false);
  const [checkinSheetOpen, setCheckinSheetOpen] = useState(false); // ++ NOVO

  // --- Estados de Controle dos Modais ---
  const [targetTableName, setTargetTableName] = useState(''); // Para mover/criar/alocar
  const [selectedWaiting, setSelectedWaiting] = useState<Set<string>>(new Set()); // Para alocação em lote
  const [isUpdating, setIsUpdating] = useState(false);
  
  const todayStr = useMemo(() => new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'America/Sao_Paulo',
  }).format(new Date()), []);

  // Listener 1: Ouve TODOS os participantes de hoje
  useEffect(() => {
    if (!db) return;
    setLoading(true);
    const attendeesRef = collection(db, 'breakfastAttendees');
    const q = query(attendeesRef, where('date', '==', todayStr));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: BreakfastAttendee[] = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as BreakfastAttendee));
      setAllAttendees(items);
      setLoading(false);
    }, (err) => {
      toast.error("Erro ao carregar participantes.");
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [todayStr]);

  // Listener 2: Ouve todas as Mesas ABERTAS de hoje
  useEffect(() => {
    if (!db) return;
    const tablesRef = collection(db, 'breakfastTables');
    const q = query(tablesRef, where('date', '==', todayStr), where('status', '==', 'open'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: BreakfastTable[] = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as BreakfastTable));
      setTables(items);
    }, (err) => toast.error("Erro ao carregar mesas."));

    return () => unsubscribe();
  }, [todayStr]);

  // --- Memos para dividir os dados em listas ---
  const { pendingGroups, guestsWaiting, tablesWithGuests, finishedGuests, stats } = useMemo(() => {
    const pending: BreakfastAttendee[] = [];
    const waiting: BreakfastAttendee[] = [];
    const finished: BreakfastAttendee[] = [];
    const atTable: BreakfastAttendee[] = [];

    for (const att of allAttendees) {
      if (att.status === 'pending') pending.push(att);
      else if (att.status === 'finished') finished.push(att);
      else if (att.status === 'attended') {
        if (!!att.table) atTable.push(att);
        else waiting.push(att);
      }
    }

    // 1. Grupos Pendentes (para check-in)
    const pGroups: { [key: string]: CabinGroup } = {};
    for (const attendee of pending) {
      if (!pGroups[attendee.cabinName]) {
        pGroups[attendee.cabinName] = { cabinName: attendee.cabinName, attendees: [] };
      }
      pGroups[attendee.cabinName].attendees.push(attendee);
    }
    
    // 2. Grupos de Mesas (para gerenciamento)
    const tGroups: { [key: string]: TableGroup } = {};
    for (const table of tables) { // Garante que mesas vazias apareçam
      tGroups[table.tableName] = { id: table.id, tableName: table.tableName, attendees: [], totalCount: 0 };
    }
    for (const attendee of atTable) {
      if (attendee.table) {
        if (!tGroups[attendee.table]) { // Adiciona mesas "virtuais" se o doc não existir
          tGroups[attendee.table] = { id: '', tableName: attendee.table, attendees: [], totalCount: 0 };
        }
        tGroups[attendee.table].attendees.push(attendee);
        tGroups[attendee.table].totalCount += 1;
      }
    }
    
    // 3. Estatísticas (Previsão)
    const statsData = {
      total: allAttendees.length,
      pending: pending.length,
      waiting: waiting.length,
      atTable: atTable.length,
      finished: finished.length
    };

    return {
      pendingGroups: Object.values(pGroups).sort((a, b) => a.cabinName.localeCompare(b.cabinName, undefined, { numeric: true })),
      guestsWaiting: waiting.sort((a,b) => a.guestName.localeCompare(b.guestName)),
      tablesWithGuests: Object.values(tGroups).sort((a, b) => a.tableName.localeCompare(b.tableName, undefined, { numeric: true })),
      finishedGuests: finished.sort((a,b) => a.guestName.localeCompare(b.guestName)),
      stats: statsData,
    };
  }, [allAttendees, tables]);

  // --- Funções de Ação (Handlers) ---

  // (Helper) Garante que um doc 'breakfastTables' exista
  const ensureTableExists = async (tableName: string): Promise<string> => {
    const existingTable = tables.find(t => t.tableName === tableName);
    if (existingTable) return existingTable.id;
    try {
      const newTable: Omit<BreakfastTable, 'id'> = {
        tableName: tableName, date: todayStr, status: 'open', createdAt: serverTimestamp() as Timestamp,
      };
      const docRef = await addDoc(collection(db, 'breakfastTables'), newTable);
      return docRef.id;
    } catch (err) {
      toast.error("Falha ao criar a mesa no DB.");
      throw err;
    }
  };
  
  // --- Handlers de Check-in (MOVIDOS PARA O SHEET) ---
  // ... (toda a lógica de check-in e visitante foi movida) ...
  
  // --- Handlers de Mesa (de mesas/page.tsx) ---
  const handleToggleWaiting = (attendeeId: string) => {
    const newSelection = new Set(selectedWaiting);
    if (newSelection.has(attendeeId)) newSelection.delete(attendeeId);
    else newSelection.add(attendeeId);
    setSelectedWaiting(newSelection);
  };
  
  const handleBatchAssignToTable = async () => {
    if (selectedWaiting.size === 0) return toast.warning("Nenhum hóspede selecionado.");
    if (!targetTableName.trim()) return toast.warning("Digite o nome da mesa.");
    
    setIsUpdating(true);
    const newTable = targetTableName.trim();
    const toastId = toast.loading(`Alocando ${selectedWaiting.size} hóspedes...`);
    
    try {
      await ensureTableExists(newTable);
      const batch = writeBatch(db);
      selectedWaiting.forEach(attendeeId => {
        const docRef = doc(db, 'breakfastAttendees', attendeeId);
        batch.update(docRef, { table: newTable });
      });
      await batch.commit();
      
      toast.success(`Hóspedes alocados na ${newTable}!`, { id: toastId });
      setBatchAssignModal(false);
      setTargetTableName('');
      setSelectedWaiting(new Set());
    } catch (err: any) {
      toast.error("Falha ao alocar hóspedes.", { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFinishAttendee = async (attendee: BreakfastAttendee) => {
    const toastId = toast.loading(`Finalizando café de ${attendee.guestName}...`);
    try {
      const docRef = doc(db, 'breakfastAttendees', attendee.id);
      await updateDoc(docRef, { status: 'finished', table: null }); 
      toast.success(`Café de ${attendee.guestName} finalizado.`, { id: toastId });
    } catch (err: any) {
      toast.error("Falha ao finalizar.", { id: toastId });
    }
  };
  
  const handleMoveAttendee = async () => {
    if (!moveModal.attendee) return;
    setIsUpdating(true);
    const newTable = targetTableName.trim() || null;
    const attendeeId = moveModal.attendee.id;

    try {
      if (newTable) await ensureTableExists(newTable); 
      
      const docRef = doc(db, 'breakfastAttendees', attendeeId);
      await updateDoc(docRef, { table: newTable });
      
      if (newTable) toast.success(`${moveModal.attendee.guestName} movido para ${newTable}`);
      else toast.success(`${moveModal.attendee.guestName} enviado para 'Aguardando'.`);
      
      setMoveModal({ isOpen: false, attendee: null });
      setTargetTableName('');
    } catch (err: any) {
      toast.error("Falha ao mover hóspede.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReactivateAttendee = async (attendee: BreakfastAttendee) => {
    const toastId = toast.loading(`Reativando ${attendee.guestName}...`);
    try {
      const docRef = doc(db, 'breakfastAttendees', attendee.id);
      await updateDoc(docRef, { status: 'attended', table: null });
      toast.success(`${attendee.guestName} reativado e está 'Aguardando Mesa'.`, { id: toastId });
    } catch (err: any) {
      toast.error("Falha ao reativar.", { id: toastId });
    }
  };

  const handleCreateNewTable = async () => {
    if (!targetTableName.trim()) return toast.warning("Digite o nome da mesa.");
    setIsUpdating(true);
    try {
      const tableName = targetTableName.trim();
      await ensureTableExists(tableName);
      toast.success(`Mesa ${tableName} aberta!`);
      setNewTableModal(false);
      setTargetTableName('');
      onSelectTable(tableName); // Auto-seleciona a mesa criada
    } catch (err: any) {
      toast.error("Falha ao criar mesa.");
    } finally {
      setIsUpdating(false);
    }
  };
  
  // --- Renderização do Painel ---
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        <span className="ml-3 text-brand-mid-green">Carregando dados...</span>
      </div>
    );
  }

  return (
    <Sheet open={checkinSheetOpen} onOpenChange={setCheckinSheetOpen}>
      <div className="flex flex-col h-full">
        <ScrollArea className="flex-grow h-0">
          <div className="p-4 space-y-6">
            
            {/* 1. Estatísticas (Previsão) */}
            <section>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Previsão de Hoje</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-around gap-2">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-brand-dark-green">{stats.total}</p>
                    <p className="text-xs text-brand-mid-green">Esperados</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-destructive">{stats.pending}</p>
                    <p className="text-xs text-brand-mid-green">Pendentes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{stats.waiting}</p>
                    <p className="text-xs text-brand-mid-green">Aguardando</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-brand-primary">{stats.atTable}</p>
                    <p className="text-xs text-brand-mid-green">Em Mesas</p>
                  </div>
                </CardContent>
              </Card>
            </section>
            
            {/* 2. Ações Rápidas */}
            <section className="flex gap-2">
              {/* ++ BOTÃO MODIFICADO ++ */}
              <SheetTrigger asChild>
                <Button className="flex-1" variant="default" size="lg">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Fazer Check-in ({stats.pending})
                </Button>
              </SheetTrigger>
              <Button className="flex-1" variant="outline" size="lg" onClick={() => { setTargetTableName(''); setNewTableModal(true); }}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Abrir Mesa Avulsa
              </Button>
            </section>

            {/* 3. Check-in Pendente (REMOVIDO DAQUI) */}
            
            {/* 4. Aguardando Mesa (de mesas/page.tsx) */}
            <section>
              <h2 className="text-xl font-semibold text-brand-dark-green mb-3">Aguardando Mesa ({stats.waiting})</h2>
              {guestsWaiting.length > 0 ? (
                <Card className="bg-white shadow-sm">
                  <CardHeader className="p-4">
                    <Button variant="outline" className="w-full" onClick={() => { setTargetTableName(''); setBatchAssignModal(true); }} disabled={selectedWaiting.size === 0}>
                      <LogIn className="h-4 w-4 mr-2" />
                      Alocar Selecionados ({selectedWaiting.size})
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2">
                    {guestsWaiting.map((attendee) => (
                      <div key={attendee.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id={`cb-wait-${attendee.id}`}
                            checked={selectedWaiting.has(attendee.id)}
                            onCheckedChange={() => handleToggleWaiting(attendee.id)}
                          />
                          <Label htmlFor={`cb-wait-${attendee.id}`} className="cursor-pointer">
                            <p className="font-medium text-brand-dark-green">{attendee.guestName}</p>
                            <p className="text-sm text-brand-mid-green">{attendee.cabinName}</p>
                          </Label>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : (
                <p className="text-sm text-brand-mid-green text-center p-4">Nenhum hóspede aguardando alocação.</p>
              )}
            </section>
            
            {/* 5. Mesas Abertas (de mesas/page.tsx) */}
            <section>
              <h2 className="text-xl font-semibold text-brand-dark-green mb-3">Mesas Abertas ({tablesWithGuests.length})</h2>
              {tablesWithGuests.length === 0 ? (
                <p className="text-sm text-brand-mid-green text-center p-4">Nenhuma mesa aberta. Aloque hóspedes ou crie uma mesa avulsa.</p>
              ) : (
                <div className="space-y-3">
                  {tablesWithGuests.map((table) => (
                    <Card key={table.tableName} className={`bg-white shadow-sm ${selectedTableId === table.tableName ? 'border-2 border-brand-primary' : ''}`}>
                      <CardHeader className="p-4 pb-3 flex-row items-center justify-between">
                        <CardTitle className="text-xl text-brand-primary">{table.tableName}</CardTitle>
                        <Badge variant="secondary"><Users className="h-4 w-4 mr-1.5"/> {table.totalCount} Pessoas</Badge>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-2">
                        {table.attendees.length > 0 ? (
                          table.attendees.map(attendee => (
                            <div key={attendee.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                              <span className="font-medium">{attendee.guestName} <span className="text-brand-mid-green">({attendee.cabinName})</span></span>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" title="Trocar de mesa" onClick={() => { setTargetTableName(attendee.table || ''); setMoveModal({ isOpen: true, attendee: attendee }); }}>
                                  <ArrowRightLeft className="h-4 w-4 text-blue-600"/>
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" title="Finalizar Café" onClick={() => handleFinishAttendee(attendee)}>
                                  <CheckCircle className="h-4 w-4 text-green-600"/>
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-brand-mid-green text-center italic p-2">Mesa aberta, aguardando pessoas.</p>
                        )}
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        <Button className="w-full" size="lg" onClick={() => onSelectTable(table.tableName)}>
                          <ClipboardList className="h-4 w-4 mr-2" />
                          Ver / Adicionar Pedido
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* 6. Finalizados (de mesas/page.tsx) */}
            <section>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="finished" className="border-none">
                  <AccordionTrigger className="text-xl font-semibold text-brand-dark-green mb-2 [&[data-state=open]]:border-b pb-3">
                    Finalizados ({finishedGuests.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <Card className="bg-white shadow-sm">
                      <CardContent className="pt-6 space-y-2">
                        {finishedGuests.length === 0 ? (
                          <p className="text-sm text-brand-mid-green text-center italic p-2">Nenhum hóspede finalizou o café ainda.</p>
                        ) : (
                          finishedGuests.map((attendee) => (
                            <div key={attendee.id} className="flex items-center justify-between text-sm p-2 bg-gray-100 rounded">
                              <div>
                                <span className="font-medium line-through text-gray-500">{attendee.guestName}</span>
                                <span className="text-gray-400"> ({attendee.cabinName})</span>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => handleReactivateAttendee(attendee)}>
                                <RotateCcw className="h-4 w-4 mr-2 text-blue-600"/> Reativar
                              </Button>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>
          </div>
        </ScrollArea>

        {/* --- Modais de Gerenciamento --- */}

        {/* Modal 4: Mover Hóspede */}
        <AlertDialog open={moveModal.isOpen} onOpenChange={(open) => !open && setMoveModal({ isOpen: false, attendee: null })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mover / Remover Hóspede</AlertDialogTitle>
              <AlertDialogDescription>
                Mover <span className="font-medium text-brand-dark-green">{moveModal.attendee?.guestName}</span>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Label htmlFor="table-move">Nova Mesa</Label>
              <Input id="table-move" placeholder="Ex: Mesa 12" defaultValue={moveModal.attendee?.table || ''} onChange={(e) => setTargetTableName(e.target.value)} disabled={isUpdating} />
              <p className="text-xs text-brand-mid-green mt-2">
                * Deixe em branco para remover da mesa e enviar para "Aguardando".
              </p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isUpdating}>Cancelar</AlertDialogCancel>
              <Button onClick={handleMoveAttendee} disabled={isUpdating}>
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Modal 5: Alocação em Lote */}
        <AlertDialog open={batchAssignModal} onOpenChange={setBatchAssignModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Alocar {selectedWaiting.size} Hóspedes</AlertDialogTitle>
              <AlertDialogDescription>
                Para qual mesa os hóspedes selecionados irão?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Label htmlFor="table-batch-assign">Nome da Mesa</Label>
              <Input id="table-batch-assign" placeholder="Ex: Mesa 10" value={targetTableName} onChange={(e) => setTargetTableName(e.target.value)} disabled={isUpdating} />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isUpdating}>Cancelar</AlertDialogCancel>
              <Button onClick={handleBatchAssignToTable} disabled={isUpdating || selectedWaiting.size === 0}>
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Alocar ({selectedWaiting.size})
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal 6: Nova Mesa Avulsa */}
        <AlertDialog open={newTableModal} onOpenChange={setNewTableModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Abrir Mesa Avulsa</AlertDialogTitle>
              <AlertDialogDescription>
                Digite o nome da mesa para abri-la (Ex: Mesa 20, Varanda 02).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Label htmlFor="table-new">Nome da Mesa</Label>
              <Input id="table-new" placeholder="Ex: Mesa 20" value={targetTableName} onChange={(e) => setTargetTableName(e.target.value)} disabled={isUpdating} />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isUpdating}>Cancelar</AlertDialogCancel>
              <Button onClick={handleCreateNewTable} disabled={isUpdating}>
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Abrir Mesa
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* ++ O SHEET DE CHECK-IN É COLOCADO AQUI ++ */}
      <SalaoCheckinSheet
        pendingGroups={pendingGroups}
        stats={stats}
        onClose={() => setCheckinSheetOpen(false)}
      />
    </Sheet>
  );
}