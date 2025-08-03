"use client";

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { OrderWithStay, Stay, AppConfig, BreakfastOrder } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, CheckCircle, X, MoreHorizontal } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';

const BreakfastOrdersPage = () => {
  const [orders, setOrders] = useState<OrderWithStay[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Listener para os pedidos
    const unsubscribe = onSnapshot(collection(db, "breakfastOrders"), async (snapshot) => {
      setLoading(true);
      const ordersData: BreakfastOrder[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BreakfastOrder));
      
      const ordersWithStays: OrderWithStay[] = await Promise.all(
        ordersData.map(async (order) => {
          let stayInfo: Stay | undefined = undefined;
          if (order.stayId && order.stayId.path) {
            try {
              const stayDoc = await getDoc(order.stayId);
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
      
      ordersWithStays.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
      setOrders(ordersWithStays);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const updateOrderStatus = async (orderId: string, status: BreakfastOrder['status']) => {
    const orderRef = doc(db, 'breakfastOrders', orderId);
    try {
      await updateDoc(orderRef, { status });
      toast.success(`Pedido #${orderId.substring(0,6)} atualizado para ${status}.`);
    } catch (error) {
      console.error("Error updating order status: ", error);
      toast.error("Falha ao atualizar o status do pedido.");
    }
  };

  const getStatusBadge = (status: BreakfastOrder['status']) => {
    switch (status) {
      case 'pending': return <Badge variant="destructive">Pendente</Badge>;
      case 'printed': return <Badge variant="secondary">Impresso</Badge>;
      case 'delivered': return <Badge className="bg-green-600 text-white">Entregue</Badge>;
      case 'canceled': return <Badge variant="outline">Cancelado</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Carregando pedidos...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Pedidos de Café da Manhã</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hóspede</TableHead>
                <TableHead>Cabana</TableHead>
                <TableHead>Data Pedido</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{order.stayInfo?.guestName || 'N/A'}</TableCell>
                  <TableCell>{order.stayInfo?.cabinName || 'N/A'}</TableCell>
                  <TableCell>{format(order.createdAt.toDate(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
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
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'printed')}><Clock className="mr-2 h-4 w-4" />Marcar como Impresso</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'delivered')}><CheckCircle className="mr-2 h-4 w-4" />Marcar como Entregue</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 focus:text-white focus:bg-red-500" onClick={() => updateOrderStatus(order.id, 'canceled')}><X className="mr-2 h-4 w-4" />Cancelar Pedido</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default BreakfastOrdersPage;