// app/admin/(dashboard)/hospedes/page.tsx

import { adminDb } from '@/lib/firebase-admin';
import { Guest } from '@/types/guest';
import { GuestsList } from '@/components/admin/guests/guests-list';

// Função para buscar os hóspedes no lado do servidor com tratamento de erro robusto
async function getGuests(): Promise<Guest[]> {
  try {
    const guestsRef = adminDb.collection('guests');
    const querySnapshot = await guestsRef.get();

    if (querySnapshot.empty) {
      return [];
    }

    const guests = querySnapshot.docs.map(doc => {
      const data = doc.data();
      
      // ++ INÍCIO DA CORREÇÃO: Lida com ambos os formatos de data ++
      // Se for um objeto Timestamp, converte para milissegundos.
      // Se já for um número, usa o próprio número.
      const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : data.createdAt;
      const updatedAt = data.updatedAt?.toMillis ? data.updatedAt.toMillis() : data.updatedAt;
      // ++ FIM DA CORREÇÃO ++

      return {
        id: doc.id,
        ...data,
        createdAt,
        updatedAt,
      };
    });
    
    return guests as unknown as Guest[];

  } catch (error) {
    console.error("Falha ao buscar hóspedes no servidor:", error);
    return [];
  }
}

export default async function GuestsPage() {
  const guests = await getGuests();
  
  return <GuestsList initialGuests={guests} />;
}