"use client";

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, doc, getDoc, updateDoc, DocumentReference } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
// Importação dos tipos necessários, incluindo o legado 'Order' e o novo 'OrderWithStay'
import type { BreakfastOrder, AppConfig, Stay, OrderWithStay, Order } from '@/types';
import { toast, Toaster } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, Loader2, MoreHorizontal, Clock, CheckCircle, X, Archive, ArchiveRestore } from 'lucide-react';
import { usePrint } from '@/hooks/use-print';
import { OrdersSummaryLayout } from '@/components/orders-summary-layout';
import { OrderPrintLayout } from '@/components/order-print-layout';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

// Função para mapear o status do novo formato para o antigo
const mapStatusToLegacy = (status: BreakfastOrder['status']): Order['status'] => {
  switch (status) {
    case 'pending': return 'Novo';
    case 'printed': return 'Em Preparação';
    case 'delivered': return 'Entregue';
    case 'canceled': return 'Cancelado';
    default: return 'Novo';
  }
};

// Função que transforma o pedido novo no formato legado que o componente de impressão espera
const transformToLegacyOrder = (order: OrderWithStay): Order & { stayInfo?: Stay } => {
  return {
    id: order.id,
    stayId: (order.stayId as DocumentReference)?.path || '',
    horarioEntrega: order.deliveryDate ? format(order.deliveryDate.toDate(), "dd/MM/yyyy") : 'N/A',
    status: mapStatusToLegacy(order.status),
    timestampPedido: order.createdAt,
    itensPedido: order.items.map(item => ({
      nomeItem: item.itemName,
      quantidade: item.quantity,
      observacao: '', // O tipo legado espera essa propriedade
    })),
    observacoesGerais: order.generalNotes,
    hospedeNome: order.stayInfo?.guestName,
    cabanaNumero: order.stayInfo?.cabinName,
    numeroPessoas: order.numberOfGuests,
    // Adicionando a informação da estadia que o componente também pode precisar
    stayInfo: order.stayInfo,
  };
};

export default function ManageBreakfastOrdersPage() {
  // O estado agora usa o tipo unificado importado de @/types
  const [orders, setOrders] = useState<OrderWithStay[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const { printComponent, isPrinting } = usePrint();
  const [selectedOrders, setSelectedOrders] = useState<OrderWithStay[]>([]);
  const [hideDelivered, setHideDelivered] = useState(true);

  useEffect(() => {
    const initializeListener = async () => {
      const db = await getFirebaseDb();
      if (!db) { toast.error('Não foi possível conectar ao banco de dados.'); setLoading(false); return; }
      
      const q = query(collection(db, 'breakfastOrders'), orderBy('createdAt', 'desc'));
      
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const ordersDataPromises = snapshot.docs.map(async (docSnapshot) => {
          const order = { id: docSnapshot.id, ...docSnapshot.data() } as OrderWithStay;
          
          if (order.stayId && (order.stayId as DocumentReference).path) {
            try {
              const staySnap = await getDoc(order.stayId as DocumentReference);
              if (staySnap.exists()) {
                order.stayInfo = staySnap.data() as Stay;
              }
            } catch (e) {
                console.error(`Falha ao buscar estadia para o pedido ${order.id}`, e);
            }
          }
          return order;
        });
        
        const ordersData = await Promise.all(ordersDataPromises);
        setOrders(ordersData); 
        setLoading(false);
      }, (err) => {
        console.error("Erro no listener de pedidos:", err);
        toast.error('Falha ao carregar os pedidos.'); 
        setLoading(false);
      });
      
      return () => unsubscribe();
    };
    initializeListener();
  }, []);

  const filteredOrders = useMemo(() => {
    if (hideDelivered) {
      return orders.filter(order => order.status !== 'delivered');
    }
    return orders;
  }, [orders, hideDelivered]);

  const handleSelectOrder = (order: OrderWithStay, isSelected: boolean) => {
    if (isSelected) { setSelectedOrders(prev => [...prev, order]); } 
    else { setSelectedOrders(prev => prev.filter(o => o.id !== order.id)); }
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) { setSelectedOrders(filteredOrders); }
    else { setSelectedOrders([]); }
  };

  const updateOrderStatus = async (orderId: string, status: BreakfastOrder['status']) => {
    const db = await getFirebaseDb();
    if (!db) return toast.error("Sem conexão com o banco de dados.");
    await updateDoc(doc(db, 'breakfastOrders', orderId), { status });
    toast.success(`Pedido marcado como "${status}"`);
  };

  // Função para lidar com a impressão, fazendo a transformação dos dados
  const handlePrintSummary = () => {
    const legacyOrders = selectedOrders.map(transformToLegacyOrder);
    printComponent(<OrdersSummaryLayout orders={legacyOrders as any} config={appConfig} />);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /> Carregando pedidos...</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
       <Toaster richColors position="top-center" />
       <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-4 justify-between items-center">
            <div>
              <CardTitle>Controle de Pedidos de Café da Manhã</CardTitle>
              <CardDescription>Gerencie e imprima as comandas para a cozinha.</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch id="hide-delivered" checked={hideDelivered} onCheckedChange={setHideDelivered} />
                <Label htmlFor="hide-delivered" className="flex items-center gap-2 cursor-pointer">
                  {hideDelivered ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
                  <span>{hideDelivered ? 'Esconder Entregues' : 'Mostrar Todos'}</span>
                </Label>
              </div>
              {/* O botão agora chama a função de transformação */}
              <Button onClick={handlePrintSummary} disabled={isPrinting || selectedOrders.length === 0}>
                {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                Imprimir Resumo ({selectedOrders.length})
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox 
                    onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    checked={filteredOrders.length > 0 && selectedOrders.length === filteredOrders.length}
                  />
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Hóspede</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead>Data do Pedido</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <TableRow key={order.id} data-state={selectedOrders.some(o => o.id === order.id) ? "selected" : ""}>
                    <TableCell><Checkbox onCheckedChange={(checked) => handleSelectOrder(order, !!checked)} checked={selectedOrders.some(o => o.id === order.id)} /></TableCell>
                    <TableCell><Badge>{order.status}</Badge></TableCell>
                    <TableCell>{order.stayInfo?.guestName} ({order.stayInfo?.cabinName})</TableCell>
                    <TableCell>{order.deliveryDate?.toDate ? format(order.deliveryDate.toDate(), "dd/MM/yyyy", { locale: ptBR }) : 'N/A'}</TableCell>
                    <TableCell>{order.createdAt?.toDate ? format(order.createdAt.toDate(), "dd/MM/yy HH:mm", { locale: ptBR }) : 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => printComponent(<OrderPrintLayout order={order} config={appConfig} />)}><Printer className="mr-2 h-4 w-4" />Imprimir Comanda</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'printed')}><Clock className="mr-2 h-4 w-4" />Marcar como Impresso</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'delivered')}><CheckCircle className="mr-2 h-4 w-4" />Marcar como Entregue</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600 focus:text-white focus:bg-red-500" onClick={() => updateOrderStatus(order.id, 'canceled')}><X className="mr-2 h-4 w-4" />Cancelar Pedido</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : ( <TableRow><TableCell colSpan={6} className="text-center h-24">{hideDelivered ? 'Nenhum pedido ativo encontrado.' : 'Nenhum pedido encontrado.'}</TableCell></TableRow> )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}