// app/salao/mesas/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  Timestamp,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';
import { BreakfastAttendee, BreakfastTable } from '@/types/cafe'; 
import { useAuth, UserRole } from '@/context/AuthContext';
import { SalaoAuthGuard } from '../components/SalaoAuthGuard';
import {
  Loader2, ArrowLeft, Users, ClipboardList, PlusCircle,
  LogIn, ArrowRightLeft, CheckCircle, RotateCcw, // ++ Ícones atualizados
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'; // ++ Para a lista de "Finalizados"
import { Checkbox } from '@/components/ui/checkbox'; // ++ Para alocação em lote
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

const ALLOWED_ROLES: UserRole[] = ['cafe', 'super_admin'];

interface TableGroup {
  id: string;
  tableName: string;
  attendees: BreakfastAttendee[];
  totalCount: number;
}

function MesasPage() {
  const router = useRouter();
  const [attendees, setAttendees] = useState<BreakfastAttendee[]>([]);
  const [tables, setTables] = useState<BreakfastTable[]>([]);
  const [loading, setLoading] = useState(true);

  // Modais de Ação
  const [moveModal, setMoveModal] = useState<{ isOpen: boolean; attendee: BreakfastAttendee | null }>({ isOpen: false, attendee: null });
  const [newTableModal, setNewTableModal] = useState(false);
  
  // ++ NOVO: Modal de Alocação em Lote (Req #1)
  const [batchAssignModal, setBatchAssignModal] = useState(false);
  const [selectedWaiting, setSelectedWaiting] = useState<Set<string>>(new Set());
  
  const [targetTableName, setTargetTableName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  const todayStr = useMemo(() => new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'America/Sao_Paulo',
  }).format(new Date()), []);

  // Listener 1: Ouve TODOS os participantes de hoje
  useEffect(() => {
    if (!db) return;
    setLoading(true);
    const attendeesRef = collection(db, 'breakfastAttendees');
    const q = query(attendeesRef, where('date', '==', todayStr)); // Não filtra mais por status aqui
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: BreakfastAttendee[] = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as BreakfastAttendee));
      setAttendees(items);
      setLoading(false);
    }, (err) => toast.error("Erro ao carregar participantes."));
    
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

  // Junta os dados, agora com a lista de FINALIZADOS (Req #4)
  const { tablesWithGuests, guestsWaiting, finishedGuests } = useMemo(() => {
    // ++ Lógica de separação atualizada
    const waiting: BreakfastAttendee[] = attendees.filter(a => a.status === 'attended' && !a.table);
    const finished: BreakfastAttendee[] = attendees.filter(a => a.status === 'finished');
    const atTable = attendees.filter(a => a.status === 'attended' && !!a.table);
    
    const tableGroups: { [key: string]: TableGroup } = {};
    
    for (const table of tables) {
      tableGroups[table.tableName] = {
        id: table.id, tableName: table.tableName, attendees: [], totalCount: 0,
      };
    }
    
    for (const attendee of atTable) {
      if (attendee.table) {
        if (!tableGroups[attendee.table]) {
          tableGroups[attendee.table] = {
            id: '', tableName: attendee.table, attendees: [], totalCount: 0,
          };
        }
        tableGroups[attendee.table].attendees.push(attendee);
        tableGroups[attendee.table].totalCount += 1;
      }
    }

    return {
      tablesWithGuests: Object.values(tableGroups).sort((a, b) => a.tableName.localeCompare(b.tableName, undefined, { numeric: true })),
      guestsWaiting: waiting,
      finishedGuests: finished, // ++ Nova lista
    };
  }, [attendees, tables]);

  // --- Funções de Ação ---

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
      toast.error("Falha ao criar a mesa.");
      throw err;
    }
  };

  // ++ REQ #1: Alocar Hóspedes (Aguardando) em LOTE
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

  // ++ REQ #2: Finalizar Café de um Hóspede
  const handleFinishAttendee = async (attendee: BreakfastAttendee) => {
    const toastId = toast.loading(`Finalizando café de ${attendee.guestName}...`);
    try {
      const docRef = doc(db, 'breakfastAttendees', attendee.id);
      await updateDoc(docRef, { status: 'finished', table: null }); // Remove da mesa e finaliza
      toast.success(`Café de ${attendee.guestName} finalizado.`, { id: toastId });
    } catch (err: any) {
      toast.error("Falha ao finalizar.", { id: toastId });
    }
  };
  
  // ++ REQ #3: Mover Hóspede (agora inclui "remover da mesa")
  const handleMoveAttendee = async () => {
    if (!moveModal.attendee) return;

    setIsUpdating(true);
    // Se o campo estiver vazio, newTable será 'null'
    const newTable = targetTableName.trim() || null;
    const attendeeId = moveModal.attendee.id;

    try {
      if (newTable) {
        await ensureTableExists(newTable); // Garante que a mesa de destino existe
      }
      
      const docRef = doc(db, 'breakfastAttendees', attendeeId);
      await updateDoc(docRef, { table: newTable });
      
      if (newTable) {
        toast.success(`${moveModal.attendee.guestName} movido para ${newTable}`);
      } else {
        // Esta é a nova lógica de "Remover da Mesa"
        toast.success(`${moveModal.attendee.guestName} enviado para 'Aguardando Mesa'.`);
      }
      setMoveModal({ isOpen: false, attendee: null });
      setTargetTableName('');
    } catch (err: any) {
      toast.error("Falha ao mover hóspede.");
    } finally {
      setIsUpdating(false);
    }
  };

  // ++ REQ #5: Reativar um Hóspede Finalizado
  const handleReactivateAttendee = async (attendee: BreakfastAttendee) => {
    const toastId = toast.loading(`Reativando ${attendee.guestName}...`);
    try {
      const docRef = doc(db, 'breakfastAttendees', attendee.id);
      // Reativa e envia para a lista de "Aguardando"
      await updateDoc(docRef, { status: 'attended', table: null });
      toast.success(`${attendee.guestName} reativado e está 'Aguardando Mesa'.`, { id: toastId });
    } catch (err: any) {
      toast.error("Falha ao reativar.", { id: toastId });
    }
  };

  // Criar mesa avulsa (Sem mudança)
  const handleCreateNewTable = async () => {
    if (!targetTableName.trim()) return toast.warning("Digite o nome da mesa.");
    setIsUpdating(true);
    try {
      await ensureTableExists(targetTableName.trim());
      toast.success(`Mesa ${targetTableName.trim()} aberta!`);
      setNewTableModal(false);
      setTargetTableName('');
    } catch (err: any) {
      toast.error("Falha ao criar mesa.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen p-6 bg-gray-50">
      {/* Cabeçalho */}
      <header className="flex items-center justify-between pb-4 mb-4 border-b border-gray-200">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.push('/salao')}>
            <ArrowLeft className="h-5 w-5 text-brand-dark-green" />
          </Button>
          <h1 className="text-2xl font-bold text-brand-dark-green ml-2">
            Gerenciar Mesas
          </h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setTargetTableName(''); setNewTableModal(true); }}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Nova Mesa Avulsa
        </Button>
      </header>

      {/* Conteúdo */}
      <main className="flex-grow">
        {loading ? (
          <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-brand-primary" /></div>
        ) : (
          <div className="space-y-6">
            
            {/* Seção 1: Mesas Abertas */}
            <section>
              <h2 className="text-lg font-semibold text-brand-dark-green mb-2">Mesas Abertas ({tablesWithGuests.length})</h2>
              {tablesWithGuests.length === 0 ? (
                <p className="text-sm text-brand-mid-green">Nenhuma mesa aberta.</p>
              ) : (
                <div className="space-y-3">
                  {tablesWithGuests.map((table) => (
                    <Card key={table.tableName} className="bg-white">
                      <CardHeader className="pb-3 flex-row items-center justify-between">
                        <CardTitle className="text-xl text-brand-primary">{table.tableName}</CardTitle>
                        <Badge variant="secondary"><Users className="h-4 w-4 mr-1.5"/> {table.totalCount} Pessoas</Badge>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {table.attendees.length > 0 ? (
                          table.attendees.map(attendee => (
                            <div key={attendee.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                              <span>{attendee.guestName} ({attendee.cabinName})</span>
                              <div className="flex gap-1">
                                {/* ++ REQ #3: Botão de MOVER (agora também remove) ++ */}
                                <Button variant="ghost" size="icon" className="h-7 w-7" title="Trocar de mesa" onClick={() => { setTargetTableName(attendee.table || ''); setMoveModal({ isOpen: true, attendee: attendee }); }}>
                                  <ArrowRightLeft className="h-4 w-4 text-blue-600"/>
                                </Button>
                                {/* ++ REQ #2: Botão de FINALIZAR ++ */}
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
                      <CardFooter>
                         <Button asChild className="w-full" size="lg">
                           <Link href={`/salao/mesas/${encodeURIComponent(table.tableName)}`}>
                             <ClipboardList className="h-4 w-4 mr-2" />
                             Ver / Adicionar Pedido
                           </Link>
                         </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Seção 2: Hóspedes Aguardando */}
            <section>
              <h2 className="text-lg font-semibold text-brand-dark-green mb-2">Aguardando Mesa ({guestsWaiting.length})</h2>
              {guestsWaiting.length > 0 && (
                <Card className="bg-white">
                  {/* ++ REQ #1: Botão de Alocar em Lote ++ */}
                  <CardHeader>
                    <Button variant="outline" className="w-full" onClick={() => { setTargetTableName(''); setBatchAssignModal(true); }} disabled={selectedWaiting.size === 0}>
                      <LogIn className="h-4 w-4 mr-2" />
                      Alocar Selecionados ({selectedWaiting.size})
                    </Button>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {guestsWaiting.map((attendee) => (
                      <div key={attendee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
              )}
            </section>
            
            {/* ++ REQ #4: Seção 3: Finalizados ++ */}
            <section>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="finished" className="border-none">
                  <AccordionTrigger className="text-lg font-semibold text-brand-dark-green mb-2 [&[data-state=open]]:border-b pb-3">
                    Finalizados ({finishedGuests.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <Card className="bg-white">
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
                              {/* ++ REQ #5: Botão de Reativar ++ */}
                              <Button variant="ghost" size="sm" onClick={() => handleReactivateAttendee(attendee)}>
                                <RotateCcw className="h-4 w-4 mr-2 text-blue-600"/>
                                Reativar
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
        )}
      </main>

      {/* --- MODAIS --- */}

      {/* Modal: Mover Hóspede (Req #3) */}
      <AlertDialog open={moveModal.isOpen} onOpenChange={(open) => !open && setMoveModal({ isOpen: false, attendee: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover / Remover Hóspede</AlertDialogTitle>
            <AlertDialogDescription>
              Mover <span className="font-medium text-brand-dark-green">{moveModal.attendee?.guestName}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="table-move" className="text-brand-dark-green">Nova Mesa</Label>
            <Input id="table-move" placeholder="Ex: Mesa 12" defaultValue={moveModal.attendee?.table || ''} onChange={(e) => setTargetTableName(e.target.value)} disabled={isUpdating} />
            <p className="text-xs text-brand-mid-green mt-2">
              * Deixe em branco para remover da mesa e enviar para "Aguardando".
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancelar</AlertDialogCancel>
            <Button onClick={handleMoveAttendee} disabled={isUpdating} className="bg-brand-dark-green hover:bg-brand-primary">
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Modal: Alocação em Lote (Req #1) */}
      <AlertDialog open={batchAssignModal} onOpenChange={setBatchAssignModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alocar {selectedWaiting.size} Hóspedes</AlertDialogTitle>
            <AlertDialogDescription>
              Para qual mesa os hóspedes selecionados irão?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="table-batch-assign" className="text-brand-dark-green">Nome da Mesa</Label>
            <Input id="table-batch-assign" placeholder="Ex: Mesa 10" value={targetTableName} onChange={(e) => setTargetTableName(e.target.value)} disabled={isUpdating} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancelar</AlertDialogCancel>
            <Button onClick={handleBatchAssignToTable} disabled={isUpdating} className="bg-brand-dark-green hover:bg-brand-primary">
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Alocar ({selectedWaiting.size})
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal: Nova Mesa Avulsa (Sem mudança) */}
      <AlertDialog open={newTableModal} onOpenChange={setNewTableModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abrir Mesa Avulsa</AlertDialogTitle>
            <AlertDialogDescription>
              Digite o nome da mesa para abri-la.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="table-new" className="text-brand-dark-green">Nome da Mesa</Label>
            <Input id="table-new" placeholder="Ex: Mesa 20" value={targetTableName} onChange={(e) => setTargetTableName(e.target.value)} disabled={isUpdating} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancelar</AlertDialogCancel>
            <Button onClick={handleCreateNewTable} disabled={isUpdating} className="bg-brand-dark-green hover:bg-brand-primary">
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Abrir Mesa
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function MesasPageWrapper() {
  return (
    <SalaoAuthGuard allowedRoles={ALLOWED_ROLES}>
      <MesasPage />
    </SalaoAuthGuard>
  );
}