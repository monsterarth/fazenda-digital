// app/salao/checkin/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  writeBatch, // ++ Para check-in em lote
} from 'firebase/firestore';
import { BreakfastAttendee } from '@/types/cafe'; 
import { useAuth, UserRole } from '@/context/AuthContext';
import { SalaoAuthGuard } from '../components/SalaoAuthGuard';
import { Loader2, ArrowLeft, Check, MapPin, RefreshCw, User, UserPlus, Users } from 'lucide-react'; // ++ Users
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { populateBreakfastCheckins } from '@/app/actions/populate-breakfast-checkins';
import { Checkbox } from '@/components/ui/checkbox'; // ++ Para seleção múltipla
import { ScrollArea } from '@/components/ui/scroll-area'; // ++ Para listas longas no modal

// Roles que podem acessar esta página
const ALLOWED_ROLES: UserRole[] = ['cafe', 'super_admin'];

interface CabinGroup {
  cabinName: string;
  attendees: BreakfastAttendee[];
}

function CheckinPage() {
  const router = useRouter();
  const { userRole } = useAuth();
  const [allAttendees, setAllAttendees] = useState<BreakfastAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal 1: Check-in INDIVIDUAL
  const [checkInModal, setCheckInModal] = useState<{
    isOpen: boolean;
    attendee: BreakfastAttendee | null;
  }>({ isOpen: false, attendee: null });
  
  // ++ NOVO Modal 2: Check-in em LOTE
  const [batchModal, setBatchModal] = useState<{
    isOpen: boolean;
    group: CabinGroup | null;
  }>({ isOpen: false, group: null });
  
  // ++ NOVO Estado para seleção múltipla
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(new Set());

  // Modal 3: Visitante
  const [visitorModal, setVisitorModal] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [visitorTable, setVisitorTable] = useState('');

  const [tableNumber, setTableNumber] = useState(''); // Usado por ambos os modais de check-in
  const [isUpdating, setIsUpdating] = useState(false);

  // Carrega lista de participantes
  useEffect(() => {
    if (!db) return;
    const todayStr = new Intl.DateTimeFormat('fr-CA', {
      timeZone: 'America/Sao_Paulo',
    }).format(new Date());

    setLoading(true);
    const attendeesRef = collection(db, 'breakfastAttendees'); 
    const q = query(attendeesRef, where('date', '==', todayStr));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: BreakfastAttendee[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as BreakfastAttendee);
      });
      setAllAttendees(items);
      setError(null);
      setLoading(false);
    }, (err: any) => {
      console.error("Erro ao buscar lista de participantes:", err);
      setError("Não foi possível carregar a lista.");
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Agrupa participantes PENDENTES por cabana
  const pendingGroups = useMemo(() => {
    const groups: { [key: string]: CabinGroup } = {};
    const pending = allAttendees.filter(a => a.status === 'pending');

    for (const attendee of pending) {
      if (!groups[attendee.cabinName]) {
        groups[attendee.cabinName] = { cabinName: attendee.cabinName, attendees: [] };
      }
      groups[attendee.cabinName].attendees.push(attendee);
    }
    
    return Object.values(groups).sort((a, b) => a.cabinName.localeCompare(b.cabinName, undefined, { numeric: true }));
  }, [allAttendees]);
  
  // Lista de participantes PRESENTES
  const attendedList = useMemo(() => {
     return allAttendees
      .filter(a => a.status === 'attended')
      .sort((a, b) => {
         const timeA = a.checkInAt ? (a.checkInAt as any).seconds : 0;
         const timeB = b.checkInAt ? (b.checkInAt as any).seconds : 0;
         return timeB - timeA;
      });
  }, [allAttendees]);


  // --- Funções de Ação (Modal Individual) ---
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
    } catch (err: any) {
      toast.error("Falha ao registrar o check-in.");
    } finally {
      setIsUpdating(false);
    }
  };

  // --- ++ NOVAS Funções de Ação (Modal em Lote) ++ ---
  const handleOpenBatchModal = (group: CabinGroup) => {
    setTableNumber(''); // Reseta a mesa
    setSelectedAttendees(new Set()); // Reseta a seleção
    setBatchModal({ isOpen: true, group: group });
    setIsUpdating(false);
  };
  const handleCloseBatchModal = () => {
    setBatchModal({ isOpen: false, group: null });
    setTableNumber('');
  };
  const handleToggleAttendee = (attendeeId: string) => {
    const newSelection = new Set(selectedAttendees);
    if (newSelection.has(attendeeId)) {
      newSelection.delete(attendeeId);
    } else {
      newSelection.add(attendeeId);
    }
    setSelectedAttendees(newSelection);
  };
  const handleConfirmBatchCheckIn = async () => {
    if (selectedAttendees.size === 0) {
      return toast.warning("Nenhum hóspede foi selecionado.");
    }
    setIsUpdating(true);
    const toastId = toast.loading(`Registrando ${selectedAttendees.size} check-ins...`);
    
    try {
      const batch = writeBatch(db);
      const table = tableNumber.trim() || null;
      
      selectedAttendees.forEach((attendeeId) => {
        const docRef = doc(db, 'breakfastAttendees', attendeeId);
        batch.update(docRef, {
          status: 'attended',
          table: table,
          checkInAt: serverTimestamp(),
        });
      });
      
      await batch.commit();
      toast.success("Check-ins registrados com sucesso!", { id: toastId });
      handleCloseBatchModal();
      
    } catch (err: any) {
      console.error("Erro ao registrar check-in em lote:", err);
      toast.error("Falha ao registrar os check-ins.", { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  };
  // --- Fim das Funções em Lote ---

  // Ação: Adicionar Visitante (Sem mudanças)
  const handleAddVisitor = async () => {
    if (!visitorName.trim()) return toast.warning("O nome do visitante é obrigatório.");
    setIsUpdating(true);
    const toastId = toast.loading("Adicionando visitante...");
    const todayStr = new Intl.DateTimeFormat('fr-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
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
    } catch (err: any) {
      toast.error("Falha ao adicionar visitante.", { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  };

  // Ação: Botão Dev (Sem mudanças)
  const handleForcePopulation = async () => {
    setIsUpdating(true);
    const toastId = toast.loading("Forçando a geração da lista de hoje (v3)...");
    try {
      const result = await populateBreakfastCheckins();
      if (result.skipped) {
        toast.info("Ação pulada.", { id: toastId });
      } else {
        toast.success(`Lista atualizada! ${result.totalGuestsAdded} participantes criados.`, { id: toastId });
      }
    } catch (err: any) {
      toast.error("Erro ao gerar a lista.", { id: toastId, description: err.message });
    } finally {
      setIsUpdating(false);
    }
  };
  
  // --- Renderização ---
  const renderContent = () => {
    if (loading) {
      return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-brand-primary" /></div>;
    }
    if (error) {
      return <div className="text-center text-red-600 p-4">{error}</div>;
    }
    if (allAttendees.length === 0) {
      return <div className="text-center text-brand-mid-green p-4">Nenhum hóspede esperado para hoje (A rotina de 4h da manhã já rodou?).</div>;
    }

    return (
      <div className="space-y-6">
        {/* Seção 1: Pendentes, agrupados por cabana */}
        <section>
          <h2 className="text-xl font-semibold text-brand-dark-green mb-3">Pendentes</h2>
          {pendingGroups.length === 0 ? (
             <p className="text-brand-mid-green text-center p-4">Todos os hóspedes já fizeram check-in!</p>
          ) : (
            <div className="space-y-4">
              {pendingGroups.map((group) => (
                <Card key={group.cabinName} className="bg-white">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg text-brand-dark-green">{group.cabinName}</CardTitle>
                    {/* ++ BOTÃO DE LOTE ADICIONADO ++ */}
                    <Button variant="outline" size="sm" onClick={() => handleOpenBatchModal(group)}>
                      <Users className="h-4 w-4 mr-2" />
                      Check-in em Lote
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {group.attendees.map((attendee) => (
                      <div key={attendee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <User className="h-5 w-5 text-brand-mid-green" />
                          {/* O nome agora estará correto vindo do backend */}
                          <span className="font-medium text-brand-dark-green">{attendee.guestName}</span>
                        </div>
                        {/* Botão de check-in individual (mantido) */}
                        <Button size="sm" onClick={() => handleOpenCheckInModal(attendee)}>
                          Check-in
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
        
        {/* Seção 2: Presentes (Check-in feito) */}
        <section>
          <h2 className="text-xl font-semibold text-brand-dark-green mb-3">Presentes ({attendedList.length})</h2>
          {attendedList.length > 0 && (
            <Card className="bg-white">
              <CardContent className="pt-6 space-y-3">
                 {attendedList.map((attendee) => (
                   <div key={attendee.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-brand-dark-green">{attendee.guestName}</p>
                          <p className="text-sm text-brand-mid-green">{attendee.cabinName}</p>
                        </div>
                      </div>
                      {attendee.table ? (
                         <Badge><MapPin className="h-3 w-3 mr-1.5"/> {attendee.table}</Badge>
                      ) : (
                         <Badge variant="secondary">Sem Mesa</Badge>
                      )}
                   </div>
                 ))}
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen p-6 bg-gray-50">
      
      {/* Cabeçalho da Página */}
      <header className="flex items-center justify-between pb-4 mb-4 border-b border-gray-200">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.push('/salao')}>
            <ArrowLeft className="h-5 w-5 text-brand-dark-green" />
          </Button>
          <h1 className="text-2xl font-bold text-brand-dark-green ml-2">
            Check-in Individual
          </h1>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={() => setVisitorModal(true)} disabled={isUpdating}>
            <UserPlus className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Visitante</span>
          </Button>
          {userRole === 'super_admin' && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleForcePopulation}
              disabled={isUpdating}
              title="Forçar População (Dev)"
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 text-blue-600" />}
            </Button>
          )}
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-grow">
        {renderContent()}
      </main>

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
            <Label htmlFor="table-number-individual" className="text-brand-dark-green">
              Vincular à Mesa (Opcional)
            </Label>
            <Input id="table-number-individual" placeholder="Ex: Mesa 05" value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)} disabled={isUpdating} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancelar</AlertDialogCancel>
            <Button onClick={handleConfirmCheckIn} disabled={isUpdating} className="bg-brand-dark-green hover:bg-brand-primary">
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Check-in
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* ++ NOVO Modal 2: Check-in em LOTE ++ */}
      <AlertDialog open={batchModal.isOpen} onOpenChange={(open) => !open && handleCloseBatchModal()}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Check-in em Lote</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione os hóspedes da <span className="font-medium text-brand-dark-green">{batchModal.group?.cabinName}</span> que estão presentes.
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
            <Label htmlFor="table-number-batch" className="text-brand-dark-green">
              Vincular à Mesa (Opcional)
            </Label>
            <Input
              id="table-number-batch"
              placeholder="Ex: Mesa 05 (para todos selecionados)"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              disabled={isUpdating}
            />
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancelar</AlertDialogCancel>
            <Button 
              onClick={handleConfirmBatchCheckIn}
              disabled={isUpdating || selectedAttendees.size === 0}
              className="bg-brand-dark-green hover:bg-brand-primary"
            >
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
            <Button onClick={handleAddVisitor} disabled={isUpdating} className="bg-brand-dark-green hover:bg-brand-primary">
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar e Fazer Check-in
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

export default function CheckinPageWrapper() {
  return (
    <SalaoAuthGuard allowedRoles={ALLOWED_ROLES}>
      <CheckinPage />
    </SalaoAuthGuard>
  );
}