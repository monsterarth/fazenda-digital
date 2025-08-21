// app/admin/(dashboard)/hospedes/page.tsx

import { adminDb } from '@/lib/firebase-admin';
import { Guest } from '@/types/guest';
import { GuestsList } from '@/components/admin/guests/guests-list';
import { serializeFirestoreTimestamps } from '@/lib/utils'; // ++ ADICIONADO ++

// Função para buscar os hóspedes no lado do servidor
async function getGuests(): Promise<Guest[]> {
  try {
    const guestsRef = adminDb.collection('guests');
    const q = guestsRef.orderBy('name', 'asc');
    const querySnapshot = await q.get();

    if (querySnapshot.empty) {
      return [];
    }

    const guests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    // ++ CORREÇÃO: Usando a função de serialização correta e robusta ++
    return serializeFirestoreTimestamps(guests);

  } catch (error) {
    console.error("Falha ao buscar hóspedes no servidor:", error);
    return [];
  }
}

export default async function GuestsPage() {
  const guests = await getGuests();
  
  return <GuestsList initialGuests={guests} />;
}