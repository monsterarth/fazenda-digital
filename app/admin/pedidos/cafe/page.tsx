"use client";

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { BreakfastOrder, OrderWithStay, Property, Stay } from '@/types';
import { toast, Toaster } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, Loader2, MoreHorizontal, Clock, CheckCircle, X, Archive, ArchiveRestore, Utensils } from 'lucide-react';
import { usePrint } from '@/hooks/use-print'; // Certifique-se que este hook existe
import { OrdersSummaryLayout } from './components/orders-summary-layout'; // Novo componente
import { OrderPrintLayout } from './components/order-print-layout'; // Novo componente
import { OrderReceiptLayout } from './components/order-receipt-layout'; // Novo componente
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function CafePedidosPage() {
    const [orders, setOrders] = useState<OrderWithStay[]>([]);
    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);
    const { printComponent, isPrinting } = usePrint();
    const [selectedOrders, setSelectedOrders] = useState<OrderWithStay[]>([]);
    const [hideDelivered, setHideDelivered] = useState(true);

    useEffect(() => {
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
                
                // Anexa as informações da estadia (Stay) a cada pedido
                const ordersWithStayInfo: OrderWithStay[] = await Promise.all(ordersData.map(async (order) => {
                    let stayInfo: Stay | undefined;
                    if (order.stayId) {
                        const staySnap = await getDoc(doc(db, 'stays', order.stayId));
                        if (staySnap.exists()) {
                            stayInfo = staySnap.data() as Stay;
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

    if (loading) {
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
                                <Switch id="hide-delivered" checked={hideDelivered} onCheckedChange={setHideDelivered} />
                                <Label htmlFor="hide-delivered" className="flex items-center gap-2 cursor-pointer">
                                    {hideDelivered ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
                                    <span>{hideDelivered ? 'Esconder Entregues' : 'Mostrar Todos'}</span>
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
                                        aria-label="Selecionar todos os pedidos visíveis"
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
                                        <TableCell>{format(new Date(order.deliveryDate), "dd 'de' MMMM", { locale: ptBR })}</TableCell>
                                        <TableCell>{order.createdAt?.toDate ? format(order.createdAt.toDate(), "dd/MM/yy HH:mm", { locale: ptBR }) : 'N/A'}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Ações do Pedido</DropdownMenuLabel>
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
                            ) : ( <TableRow><TableCell colSpan={6} className="text-center h-24">{hideDelivered ? 'Nenhum pedido ativo encontrado.' : 'Nenhum pedido encontrado.'}</TableCell></TableRow> )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}