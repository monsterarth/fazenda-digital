// app/admin/(dashboard)/hospedes/page.tsx

// A diretiva "use client" foi removida. Este é novamente um Componente de Servidor.
import { adminDb } from '@/lib/firebase-admin';
import { Guest } from '@/types/guest';
import { GuestsList } from '@/components/admin/guests/guests-list';

// Adicionamos esta linha para garantir que a página sempre busque dados novos a cada visita,
// sem usar cache de dados.
export const dynamic = 'force-dynamic';

// A função que busca os dados no servidor foi reintroduzida.
async function getGuests(): Promise<Guest[]> {
  try {
    const guestsRef = adminDb.collection('guests');
    const querySnapshot = await guestsRef.orderBy('name', 'asc').get();

    if (querySnapshot.empty) {
      return [];
    }

    // Mapeamos e serializamos os dados, garantindo que tudo seja seguro para o cliente.
    // Esta versão é robusta e ignora documentos malformados sem quebrar a página.
    const guests = querySnapshot.docs.reduce((acc: Guest[], doc) => {
      try {
        const data = doc.data();
        
        if (!data.createdAt || !data.updatedAt) {
          console.warn(`[getGuests] Documento ${doc.id} ignorado por falta de timestamps.`);
          return acc;
        }

        acc.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toMillis(),
          updatedAt: data.updatedAt.toMillis(),
        } as unknown as Guest);
      } catch (e) {
        console.error(`[getGuests] Falha ao processar o documento ${doc.id}:`, e);
      }
      return acc;
    }, []);
    
    return guests;

  } catch (error) {
    console.error("[getGuests] Falha ao buscar hóspedes no servidor:", error);
    return [];
  }
}

export default async function GuestsPage() {
  const guests = await getGuests();
  
  // O componente da lista (que é um componente de cliente) recebe os dados
  // como uma propriedade inicial.
  return <GuestsList initialGuests={guests} />;
}