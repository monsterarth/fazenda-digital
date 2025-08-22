"use client";

import React, { useState, useEffect } from 'react';
import { useGuest } from '@/context/GuestProvider';
import { getFirebaseDb } from '@/lib/firebase';
import * as firestore from 'firebase/firestore';
import { Structure } from '@/types/scheduling';
import { Loader2, CalendarPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

// ++ INÍCIO DA CORREÇÃO ++
// Foi criado um novo componente 'StructureBookingCard' para lidar
// exclusivamente com a exibição de estruturas disponíveis para agendamento.
// Isso resolve o erro de prop 'booking' que o componente 'BookingCard' exigia.

interface StructureBookingCardProps {
  structure: Structure;
}

function StructureBookingCard({ structure }: StructureBookingCardProps) {
  // Aqui dentro, no futuro, podemos adicionar a lógica para abrir um modal
  // e permitir que o hóspede escolha um horário e confirme o agendamento.
  const handleBookingClick = () => {
    // TODO: Implementar a lógica de agendamento (abrir modal, etc.)
    toast.info(`Funcionalidade de agendar "${structure.name}" será implementada aqui.`);
  };

  return (
    <Card className="overflow-hidden">
      <div className="relative h-40 w-full">
        <Image
          src={structure.photoURL}
          alt={structure.name}
          layout="fill"
          objectFit="cover"
        />
      </div>
      <CardHeader>
        <CardTitle>{structure.name}</CardTitle>
        <CardDescription>Consulte os horários e faça seu agendamento.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" onClick={handleBookingClick}>
          <CalendarPlus className="mr-2 h-4 w-4" />
          Ver Horários e Agendar
        </Button>
      </CardContent>
    </Card>
  );
}
// ++ FIM DA CORREÇÃO ++


export function AgendamentosTab() {
  const { stay } = useGuest();
  const [structures, setStructures] = useState<Structure[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStructures = async () => {
      try {
        const db = await getFirebaseDb();
        if (!db) {
          toast.error("Não foi possível conectar ao banco de dados.");
          setLoading(false);
          return;
        }

        const q = firestore.query(firestore.collection(db, 'structures'));
        const querySnapshot = await firestore.getDocs(q);
        const structuresData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Structure));
        setStructures(structuresData);
      } catch (error) {
        console.error("Erro ao buscar estruturas:", error);
        toast.error("Falha ao carregar as opções de agendamento.");
      } finally {
        setLoading(false);
      }
    };
    fetchStructures();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!stay) {
    return <p className="text-center text-muted-foreground">Informações da estadia não encontradas.</p>;
  }

  return (
    <div className="space-y-6">
      {structures.length > 0 ? (
        structures.map(structure => (
          // Usando o novo componente que é adequado para esta tarefa
          <StructureBookingCard key={structure.id} structure={structure} />
        ))
      ) : (
        <p className="text-center text-muted-foreground py-8">Nenhuma estrutura de agendamento disponível no momento.</p>
      )}
    </div>
  );
}