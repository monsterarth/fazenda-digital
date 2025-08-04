"use client";

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { OrderWithStay, Stay, BreakfastOrder } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, CheckCircle, X, MoreHorizontal, Utensils, Loader2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast, Toaster } from 'sonner';

const BreakfastOrdersPage = () => {
  const [orders, setOrders] = useState<OrderWithStay[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "breakfastOrders"), async (snapshot) => {
      setLoading(true);
      const ordersData: BreakfastOrder[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BreakfastOrder));
      
      const ordersWithStays: OrderWithStay[] = await Promise.all(
        ordersData.map(async (order) => {
          let stayInfo: Stay | undefined = undefined;
          
          if (typeof order.stayId === 'string' && order.stayId) {
            try {
              const stayDoc = await getDoc(doc(db, 'stays', order.stayId));
              if (stayDoc.exists()) {
                stayInfo = { id: stayDoc.id, ...stayDoc.data() } as Stay;
              }
            } catch (error) {
              console.error(`Error fetching stay for order ${order.id}:`, error);
            }
          }
          return { ...order, stayInfo };
        })
      );
      
      ordersWithStays.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setOrders(ordersWithStays);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const updateOrderStatus = async (orderId: string, status: BreakfastOrder['status']) => {
    const orderRef = doc(db, 'breakfastOrders', orderId);
    try {
      await updateDoc(orderRef, { status });
      toast.success(`Pedido marcado como "${status}"`);
    } catch (error) {
      toast.error("Erro ao atualizar o status do pedido.");
      console.error("Error updating order status: ", error);
    }
  };

  const getStatusBadge = (status: BreakfastOrder['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pendente</Badge>;
      case 'printed':
        return <Badge><Utensils className="mr-1 h-3 w-3" />Impresso</Badge>;
      case 'delivered':
        return <Badge className="bg-green-600"><CheckCircle className="mr-1 h-3 w-3" />Entregue</Badge>;
      case 'canceled':
        return <Badge variant="destructive"><X className="mr-1 h-3 w-3" />Cancelado</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
        <Toaster richColors position="top-center" />
        <Card>
            <CardHeader>
                <CardTitle>Pedidos de Café da Manhã</CardTitle>
                <CardDescription>Visualize e gerencie todos os pedidos de cestas de café da manhã.</CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Hóspede</TableHead>
                                <TableHead>Data de Entrega</TableHead>
                                <TableHead>Pedido</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell>
                                        <div className="font-medium">{order.stayInfo?.guestName || "Hóspede não encontrado"}</div>
                                        <div className="text-sm text-muted-foreground">{order.stayInfo?.cabinName || "Cabana"}</div>
                                    </TableCell>
                                    <TableCell>{format(new Date(order.deliveryDate), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                                    <TableCell>
                                        {(order.individualItems?.length || 0) + (order.collectiveItems?.length || 0)} itens
                                    </TableCell>
                                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Abrir menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => alert(JSON.stringify(order, null, 2))}>Ver Detalhes</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'printed')}>Marcar como Impresso</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'delivered')}>Marcar como Entregue</DropdownMenuItem>
                                                <DropdownMenuItem className="text-red-600" onClick={() => updateOrderStatus(order.id, 'canceled')}>
                                                    Cancelar Pedido
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    </div>
  );
};

export default BreakfastOrdersPage;