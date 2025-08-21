"use client";

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { BreakfastOrder, OrderWithStay, Property, Stay } from '@/types';
import { toast, Toaster } from 'sonner';
import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useAuth } from '@/context/AuthContext'; // ++ Importa o hook de autenticação
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, Loader2, MoreHorizontal, Clock, CheckCircle, X, Archive, ArchiveRestore, Utensils, Eye } from 'lucide-react';
import { usePrint } from '@/hooks/use-print';
import { OrdersSummaryLayout } from './components/orders-summary-layout';
import { OrderPrintLayout } from './components/order-print-layout';
import { OrderReceiptLayout } from './components/order-receipt-layout';
import { OrderDetailsDialog } from './components/order-details-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function CafePedidosPage() {
    const { isAdmin } = useAuth(); // ++ Usa o hook para verificar o status de admin
    const [orders, setOrders] = useState<OrderWithStay[]>([]);
    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);
    const { printComponent, isPrinting } = usePrint();
    const [selectedOrders, setSelectedOrders] = useState<OrderWithStay[]>([]);
    const [hideArchived, setHideArchived] = useState(true);
    
    const [detailsModal, setDetailsModal] = useState<{ isOpen: boolean; order: OrderWithStay | null }>({ isOpen: false, order: null });

    useEffect(() => {
        // ++ CORREÇÃO: A inicialização agora espera pela confirmação de admin
        if (!isAdmin) {
            // Se o usuário não for admin, não tenta criar o listener
            return;
        }

        const initializeListener = async () => {
            if (!db) { toast.error('Não foi possível conectar ao banco de dados.'); setLoading(false); return; }
            
            try {
                const propRef = doc(db, "properties", "default");
                const propSnap = await getDoc(propRef);
                if (propSnap.exists()) { setProperty(propSnap.data() as Property); }
            } catch (e) { console.error("Falha ao carregar configurações da propriedade:", e); }
            
            const q = query(collection(db, 'breakfastOrders'), orderBy('createdAt', 'desc'));
            const unsubscribe = onSnapshot(q, async (snapshot) => {
                const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BreakfastOrder));
                
                const ordersWithStayInfo: OrderWithStay[] = await Promise.all(ordersData.map(async (order) => {
                    let stayInfo: Stay | undefined;
                    
                    if (typeof order.stayId === 'string' && order.stayId) {
                        try {
                            const staySnap = await getDoc(doc(db, 'stays', order.stayId));
                            if (staySnap.exists()) {
                                stayInfo = staySnap.data() as Stay;
                            }
                        } catch (error) {
                            console.error(`Falha ao buscar estadia para o pedido ${order.id}:`, error);
                        }
                    }
                    return { ...order, stayInfo };
                }));

                setOrders(ordersWithStayInfo);
                setLoading(false);
            }, (err) => {
                console.error("Erro no listener de pedidos:", err);
                toast.error('Falha ao carregar os pedidos.');
                setLoading(false);
            });
            
            return () => unsubscribe();
        };
        
        initializeListener();
        
    }, [isAdmin]); // ++ A dependência do useEffect agora é o status de admin

    const filteredOrders = useMemo(() => {
        if (hideArchived) {
            return orders.filter(order => order.status !== 'delivered' && order.status !== 'canceled');
        }
        return orders;
    }, [orders, hideArchived]);

    const handleSelectOrder = (order: OrderWithStay, isSelected: boolean) => {
        if (isSelected) { setSelectedOrders(prev => [...prev, order]); }
        else { setSelectedOrders(prev => prev.filter(o => o.id !== order.id)); }
    };

    const handleSelectAll = (isSelected: boolean) => {
        if (isSelected) { setSelectedOrders(filteredOrders); }
        else { setSelectedOrders([]); }
    };

    const updateOrderStatus = async (orderId: string, status: BreakfastOrder['status']) => {
        if (!db) return toast.error("Sem conexão com o banco de dados.");
        await updateDoc(doc(db, 'breakfastOrders', orderId), { status });
        toast.success(`Pedido marcado como "${status}"`);
    };
    
    const getStatusBadge = (status: BreakfastOrder['status']) => {
        switch (status) {
            case 'pending': return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pendente</Badge>;
            case 'printed': return <Badge><Utensils className="mr-1 h-3 w-3" />Impresso</Badge>;
            case 'delivered': return <Badge className="bg-green-600"><CheckCircle className="mr-1 h-3 w-3" />Entregue</Badge>;
            case 'canceled': return <Badge variant="destructive"><X className="mr-1 h-3 w-3" />Cancelado</Badge>;
            default: return <Badge variant="outline">Desconhecido</Badge>;
        }
    };

    const handlePrint = (componentToPrint: React.ReactElement) => { printComponent(componentToPrint); };
    
    const safeFormatDate = (dateString: string | undefined | null, formatString: string) => {
        if (!dateString) return 'Data inválida';
        const date = new Date(`${dateString}T00:00:00`);
        return isValid(date) ? format(date, formatString, { locale: ptBR }) : 'Data inválida';
    };

    if (loading && orders.length === 0) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /> Carregando pedidos...</div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            <Toaster richColors position="top-center"/>
            <Card>
                <CardHeader>
                    <div className="flex flex-wrap gap-4 justify-between items-center">
                        <div>
                            <CardTitle>Controle de Pedidos de Café da Manhã</CardTitle>
                            <CardDescription>Gerencie e imprima os pedidos de cestas de café da manhã.</CardDescription>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center space-x-2">
                                <Switch id="hide-archived" checked={hideArchived} onCheckedChange={setHideArchived} />
                                <Label htmlFor="hide-archived" className="flex items-center gap-2 cursor-pointer">
                                    {hideArchived ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
                                    <span>{hideArchived ? 'Ocultar Arquivados' : 'Mostrar Todos'}</span>
                                </Label>
                            </div>
                            <Button onClick={() => handlePrint(<OrdersSummaryLayout orders={selectedOrders} property={property} />)} disabled={isPrinting || selectedOrders.length === 0}>
                                {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                                Imprimir Resumo ({selectedOrders.length})
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>
            
            <Card>
                <CardHeader><CardTitle>Lista de Pedidos</CardTitle></CardHeader>
                <CardContent>
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
                                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                                        <TableCell>{order.stayInfo?.guestName || 'N/A'} ({order.stayInfo?.cabinName || 'N/A'})</TableCell>
                                        <TableCell>{safeFormatDate(order.deliveryDate, "dd 'de' MMMM")}</TableCell>
                                        <TableCell>
                                            {order.createdAt && typeof order.createdAt === 'object' && typeof order.createdAt.toDate === 'function'
                                                ? format(order.createdAt.toDate(), "dd/MM/yy HH:mm", { locale: ptBR })
                                                : order.createdAt && typeof order.createdAt === 'number'
                                                    ? format(new Date(order.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })
                                                    : 'N/A'
                                            }
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Ações do Pedido</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => setDetailsModal({ isOpen: true, order: order })}>
                                                        <Eye className="mr-2 h-4 w-4" />Ver Detalhes
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => handlePrint(<OrderPrintLayout order={order} property={property} />)}><Printer className="mr-2 h-4 w-4" />Imprimir (A4)</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handlePrint(<OrderReceiptLayout order={order} property={property} />)}><Printer className="mr-2 h-4 w-4" />Imprimir (Térmica)</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuLabel>Mudar Status</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'printed')}><Utensils className="mr-2 h-4 w-4" />Marcar "Impresso"</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'delivered')}><CheckCircle className="mr-2 h-4 w-4" />Marcar "Entregue"</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-red-600 focus:text-white focus:bg-red-500" onClick={() => updateOrderStatus(order.id, 'canceled')}><X className="mr-2 h-4 w-4" />Cancelar Pedido</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : ( 
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">
                                        {hideArchived ? 'Nenhum pedido ativo ou pendente encontrado.' : 'Nenhum pedido encontrado.'}
                                    </TableCell>
                                </TableRow> 
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <OrderDetailsDialog 
                isOpen={detailsModal.isOpen}
                onClose={() => setDetailsModal({ isOpen: false, order: null })}
                order={detailsModal.order}
            />
        </div>
    )
}