// components/admin/stays/fast-stays-list.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Stay } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Send, Phone, Loader2, Trash2, Edit, Users } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { resendFastStayWhatsapp } from '@/app/actions/resend-whatsapp';
import { deleteFastStayAction } from '@/app/actions/delete-fast-stay';

interface FastStaysListProps {
  stays: Stay[];
  onEdit?: (stay: Stay) => void;
}

export const FastStaysList: React.FC<FastStaysListProps> = ({ stays, onEdit }) => {
  // --- ESTADOS ---
  const [selectedGroup, setSelectedGroup] = useState<Stay[] | null>(null);
  const [phoneToEdit, setPhoneToEdit] = useState("");
  const [isResendDialogOpen, setIsResendDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [groupToDelete, setGroupToDelete] = useState<Stay[] | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // --- AGRUPAMENTO DE ESTADIAS ---
  const groupedStays = useMemo(() => {
    const groups: { [key: string]: Stay[] } = {};
    const singles: Stay[] = [];

    stays.forEach(stay => {
      if (stay.groupId) {
        if (!groups[stay.groupId]) groups[stay.groupId] = [];
        groups[stay.groupId].push(stay);
      } else {
        singles.push(stay);
      }
    });

    // Converte o objeto de grupos em array
    const groupArrays = Object.values(groups);
    // Combina grupos (como arrays) e singles (como arrays de 1 item)
    return [...groupArrays, ...singles.map(s => [s])].sort((a, b) => {
       // Ordena pela data de criação do primeiro item
       const dateA = a[0]?.createdAt ? new Date(a[0].createdAt as any).getTime() : 0;
       const dateB = b[0]?.createdAt ? new Date(b[0].createdAt as any).getTime() : 0;
       return dateB - dateA;
    });
  }, [stays]);

  // --- AÇÕES ---

  const handleOpenResend = (group: Stay[]) => {
    // Pega o líder ou o primeiro
    const leader = group.find(s => s.isMainBooker) || group[0];
    const s = leader as any;
    const currentPhone = s.guestPhone || s.tempGuestPhone || "";
    
    setPhoneToEdit(currentPhone);
    setSelectedGroup(group);
    setIsResendDialogOpen(true);
  };

  const handleResend = async () => {
    if (!selectedGroup) return;
    const leader = selectedGroup.find(s => s.isMainBooker) || selectedGroup[0];
    
    // CORREÇÃO: Respeita o formato internacional se houver '+'
    const rawPhone = phoneToEdit.trim();
    const isInternational = rawPhone.startsWith('+');
    
    // Se for internacional (+...), mantém o original. Se não, remove não-números.
    const cleanPhone = isInternational ? rawPhone : rawPhone.replace(/\D/g, '');

    // Validação básica (8 dígitos mínimo para aceitar internacionais curtos também)
    if (cleanPhone.length < 8) {
      toast.error("Telefone inválido.");
      return;
    }

    setIsProcessing(true);
    try {
      // Reenvia apenas para o líder (que detém o token principal)
      const result = await resendFastStayWhatsapp(leader.id, cleanPhone);
      if (result.success) {
        toast.success("Enviado para o líder do grupo!");
        setIsResendDialogOpen(false);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Erro inesperado.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenDelete = (group: Stay[]) => {
    setGroupToDelete(group);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!groupToDelete) return;

    setIsProcessing(true);
    try {
      // Deleta todas as estadias do grupo em paralelo
      await Promise.all(groupToDelete.map(stay => deleteFastStayAction(stay.id)));
      toast.success(`${groupToDelete.length} estadia(s) removida(s).`);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast.error("Erro ao excluir algumas estadias.");
    } finally {
      setIsProcessing(false);
      setGroupToDelete(null);
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hóspede</TableHead>
            <TableHead>Cabana(s)</TableHead>
            <TableHead>Check-in</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupedStays.length > 0 ? (
            groupedStays.map((group, idx) => {
              const leader = group.find(s => s.isMainBooker) || group[0];
              const isGroup = group.length > 1;
              const s = leader as any;
              const cabinNames = group.map(i => i.cabinName).join(', ');

              return (
                <TableRow key={leader.id || idx} className={isGroup ? "bg-slate-50/50" : ""}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium flex items-center gap-2">
                        {leader.guestName}
                        {isGroup && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full flex items-center gap-1"><Users className="w-3 h-3"/> Grupo</span>}
                      </span>
                      <span className="text-xs text-muted-foreground">Token: {leader.token}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px] truncate" title={cabinNames}>
                      {cabinNames}
                    </div>
                  </TableCell>
                  <TableCell>
                    {/* Exibe data se existir, senão traço (Fast Stay Open) */}
                    {leader.checkInDate ? format(new Date(leader.checkInDate), "dd/MM") : "--/--"}
                  </TableCell>
                  <TableCell>{s.guestPhone || s.tempGuestPhone}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 px-2"
                        onClick={() => onEdit && onEdit(leader)}
                        title="Editar Líder"
                      >
                        <Edit className="w-4 h-4 text-blue-600" />
                      </Button>

                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-blue-600 border-blue-200 hover:bg-blue-50 h-8"
                        onClick={() => handleOpenResend(group)}
                        title="Reenviar WhatsApp"
                      >
                        <Send className="w-3 h-3 mr-1" /> Reenviar
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                        onClick={() => handleOpenDelete(group)}
                        title="Cancelar Reserva"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Nenhum Fast Stay aguardando.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>

      {/* Modal de Reenvio */}
      <Dialog open={isResendDialogOpen} onOpenChange={setIsResendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reenviar Convite</DialogTitle>
            <DialogDescription>
              Enviar link para <b>{selectedGroup?.[0]?.guestName}</b> referente a {selectedGroup?.length} cabana(s).
              <br/>
              <span className="text-xs text-muted-foreground mt-1 block">
                Para internacionais, use o formato <strong>+DDI...</strong> (ex: +34...)
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Celular do Líder</Label>
            <div className="flex items-center gap-2 mt-1.5">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <Input 
                value={phoneToEdit} 
                onChange={(e) => setPhoneToEdit(e.target.value)}
                placeholder="55..." 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsResendDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleResend} disabled={isProcessing} className="bg-green-600 hover:bg-green-700 text-white">
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Send className="w-4 h-4 mr-2"/>}
              Enviar Link Único
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alerta de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Cancelar Reserva{groupToDelete && groupToDelete.length > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir <b>{groupToDelete?.length} estadia(s)</b> vinculadas a {groupToDelete?.[0]?.guestName}.
              <br/><br/>
              O link enviado deixará de funcionar imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Voltar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? "Excluindo..." : "Sim, Excluir Tudo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};