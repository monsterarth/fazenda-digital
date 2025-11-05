// app/admin/(dashboard)/solicitacoes/page.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { getFirebaseDb } from '@/lib/firebase';
import * as firestore from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
// ++ INÍCIO DA ADIÇÃO ++
import { useNotification } from '@/context/NotificationContext';
// ++ FIM DA ADIÇÃO ++
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { manageRequest } from '@/app/actions/manage-request';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast, Toaster } from 'sonner';
import { Loader2, ConciergeBell, MoreHorizontal, CheckCircle, Clock, Construction, ShoppingBag } from 'lucide-react';

// Tipos
export type RequestType = 'item' | 'cleaning' | 'maintenance';
export type RequestStatus = 'pending' | 'in_progress' | 'completed';

export interface Request {
  id: string;
  stayId: string;
  guestName: string;
  cabinName: string;
  type: RequestType;
  details: {
    itemName?: string;
    quantity?: number;
    description?: string;
  };
  status: RequestStatus;
  createdAt: firestore.Timestamp;
  updatedAt: firestore.Timestamp;
}
// Fim dos tipos

const REQUESTS_COLLECTION = 'requests';

export default function ManageRequestsPage() {
    const { isAdmin, user } = useAuth();
    // ++ INÍCIO DA ADIÇÃO ++
    // Consome o hook de notificação para limpar o alerta
    const { clearRequestsNotification } = useNotification();
    // ++ FIM DA ADIÇÃO ++
    const [db, setDb] = useState<firestore.Firestore | null>(null);
    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState(true);

    // ++ INÍCIO DA ADIÇÃO ++
    // Limpa a notificação assim que o componente é montado
    useEffect(() => {
        clearRequestsNotification();
    }, [clearRequestsNotification]);
    // ++ FIM DA ADIÇÃO ++

    useEffect(() => {
        if (!isAdmin) return;
        const initializeApp = async () => {
            const firestoreDb = await getFirebaseDb();
            setDb(firestoreDb);
            if (!firestoreDb) {
                toast.error("Falha ao conectar ao banco de dados.");
                setLoading(false);
                return;
            }
            const q = firestore.query(firestore.collection(firestoreDb, REQUESTS_COLLECTION), firestore.orderBy('createdAt', 'desc'));
            const unsubscribe = firestore.onSnapshot(q, (snapshot) => {
                const requestsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Request));
                setRequests(requestsData);
                setLoading(false);
            }, (error) => {
                console.error("Erro no Firestore:", error);
                toast.error("Falha ao carregar solicitações.");
                setLoading(false);
            });
            return () => unsubscribe();
        };
        initializeApp();
    }, [isAdmin]);

    // (resto do código sem alterações...)
    const updateRequestStatus = async (requestId: string, newStatus: 'in_progress' | 'completed') => {
        if (!user || !user.email) {
            toast.error("Autenticação do admin não encontrada. Faça login novamente.");
            return;
        }
        
        const toastId = toast.loading("Atualizando status...");
        try {
            // Chama a Server Action que criamos
            const result = await manageRequest({
                requestId,
                adminEmail: user.email,
                action: 'update_status',
                newStatus,
            });

            if (result.success) {
                toast.success("Status atualizado com sucesso!", { id: toastId });
            } else {
                toast.error("Falha ao atualizar status.", { id: toastId, description: result.message });
            }
        } catch (error: any) {
            toast.error("Falha ao atualizar status.", { id: toastId, description: error.message });
        }
    };
    
    const deleteRequest = async (requestId: string) => {
        if (!user || !user.email) {
            toast.error("Autenticação do admin não encontrada. Faça login novamente.");
            return;
        }
        if (!confirm("Tem certeza que deseja excluir esta solicitação?")) return;
        
        const toastId = toast.loading("Excluindo solicitação...");
        try {
            // Chama a Server Action que criamos
            const result = await manageRequest({
                requestId,
                adminEmail: user.email,
                action: 'delete',
            });

            if (result.success) {
                toast.success("Solicitação excluída com sucesso!", { id: toastId });
            } else {
                toast.error("Falha ao excluir.", { id: toastId, description: result.message });
            }
        } catch (error: any) {
            toast.error("Falha ao excluir.", { id: toastId, description: error.message });
        }
    };

    const filteredRequests = (status: RequestStatus) => requests.filter(r => r.status === status);

    const RequestTable = ({ status }: { status: RequestStatus }) => {
        const data = filteredRequests(status);
        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Hóspede / Cabana</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Detalhes</TableHead>
                        <TableHead>Solicitado em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length > 0 ? (
                        data.map(req => <RequestRow key={req.id} request={req} />)
                    ) : (
                        <TableRow><TableCell colSpan={5} className="h-24 text-center">Nenhuma solicitação {status === 'pending' ? 'pendente' : status === 'in_progress' ? 'em andamento' : 'concluída'}.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        );
    };

    const RequestRow = ({ request }: { request: Request }) => {
        const typeInfo = {
            item: { icon: ShoppingBag, label: "Item", color: "bg-blue-500" },
            cleaning: { icon: CheckCircle, label: "Limpeza", color: "bg-green-500" },
            maintenance: { icon: Construction, label: "Manutenção", color: "bg-yellow-600" },
        };
        const Icon = typeInfo[request.type].icon;

        return (
            <TableRow>
                <TableCell>
                    <div className="font-medium">{request.guestName}</div>
                    <div className="text-sm text-muted-foreground">{request.cabinName}</div>
                </TableCell>
                <TableCell>
                    <Badge className={`${typeInfo[request.type].color} text-white hover:${typeInfo[request.type].color}`}>
                        <Icon className="mr-1 h-3 w-3" />
                        {typeInfo[request.type].label}
                    </Badge>
                </TableCell>
                <TableCell className="max-w-xs truncate">
                    {request.type === 'item' && `${request.details.quantity}x ${request.details.itemName}`}
                    {request.type === 'cleaning' && "Solicitação de limpeza de rotina"}
                    {request.type === 'maintenance' && request.details.description}
                </TableCell>
                <TableCell>{format(request.createdAt.toDate(), "dd/MM 'às' HH:mm", { locale: ptBR })}</TableCell>
                <TableCell className="text-right">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {request.status === 'pending' && <DropdownMenuItem onClick={() => updateRequestStatus(request.id, 'in_progress')}>Marcar como Em Andamento</DropdownMenuItem>}
                            {request.status === 'in_progress' && <DropdownMenuItem onClick={() => updateRequestStatus(request.id, 'completed')}>Marcar como Concluída</DropdownMenuItem>}
                            <DropdownMenuItem className="text-red-500" onClick={() => deleteRequest(request.id)}>Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
            </TableRow>
        );
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin" /></div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            <Toaster richColors position="top-center" />
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ConciergeBell /> Central de Solicitações</CardTitle>
                    <CardDescription>Gerencie todos os pedidos de itens, limpeza e manutenção dos hóspedes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="pending">
                        <TabsList>
                            <TabsTrigger value="pending">
                                <Clock className="mr-2 h-4 w-4" /> Pendentes ({filteredRequests('pending').length})
                            </TabsTrigger>
                            <TabsTrigger value="in_progress">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Em Andamento ({filteredRequests('in_progress').length})
                            </TabsTrigger>
                            <TabsTrigger value="completed">
                                <CheckCircle className="mr-2 h-4 w-4" /> Concluídas ({filteredRequests('completed').length})
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="pending"><RequestTable status="pending" /></TabsContent>
                        <TabsContent value="in_progress"><RequestTable status="in_progress" /></TabsContent>
                        <TabsContent value="completed"><RequestTable status="completed" /></TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}