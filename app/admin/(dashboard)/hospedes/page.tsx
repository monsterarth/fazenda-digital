// app/admin/(dashboard)/hospedes/page.tsx

import { adminDb } from '@/lib/firebase-admin'; // ++ CORREÇÃO: Usando 'adminDb' em vez de 'db' ++
import { Guest } from '@/types/guest';
import { GuestsList } from '@/components/admin/guests/guests-list';

// Função para buscar os hóspedes no lado do servidor
async function getGuests(): Promise<Guest[]> {
  try {
    // Usando a API do Admin SDK para buscar e ordenar hóspedes
    const snapshot = await adminDb.collection('guests').orderBy('name', 'asc').get();

    if (snapshot.empty) {
      return [];
    }
    
    // Convertendo os dados e garantindo que timestamps sejam serializáveis
    const guests: Guest[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as Guest;
    });

    return guests;
  } catch (error) {
    console.error("Falha ao buscar hóspedes no servidor:", error);
    return []; // Retorna um array vazio em caso de erro para não quebrar a página
  }
}

export default async function GuestsPage() {
  const guests = await getGuests();
  
  // O componente GuestsList que criaremos a seguir receberá os dados
  return <GuestsList initialGuests={guests} />;
}