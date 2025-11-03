// components/admin/maintenance/DelegateTaskDialog.tsx

"use client";

import React, { useState } from 'react';
import { MaintenanceTask, StaffProfile } from '@/types/maintenance';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,  // ++ IMPORTADO
  SelectLabel,  // ++ IMPORTADO
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface DelegateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: MaintenanceTask | null;
  staffList: StaffProfile[]; // Recebemos a lista de funcionários por props
}

export function DelegateTaskDialog({
  open,
  onOpenChange,
  task,
  staffList,
}: DelegateTaskDialogProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!task || !selectedStaffId) {
      toast.error('Tarefa ou funcionário inválido.');
      return;
    }

    const selectedStaff = staffList.find(s => s.id === selectedStaffId);
    if (!selectedStaff) {
      toast.error('Funcionário selecionado não encontrado.');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Delegando tarefa...');

    try {
      const db = await getFirebaseDb();
      const taskRef = doc(db, 'maintenance_tasks', task.id);

      // Atualiza a tarefa no Firestore
      await updateDoc(taskRef, {
        status: 'in_progress', // Move do 'backlog' para 'em andamento'
        assignedToId: selectedStaff.id,
        assignedToName: selectedStaff.name,
      });

      toast.success(`Tarefa delegada para ${selectedStaff.name}!`, { id: toastId });
      onOpenChange(false);
      setSelectedStaffId('');
    } catch (error) {
      console.error('Erro ao delegar tarefa:', error);
      toast.error('Falha ao delegar a tarefa.', { id: toastId, description: (error as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delegar Tarefa</DialogTitle>
          <DialogDescription>
            Atribua esta tarefa a um membro da equipe de manutenção.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Tarefa:</h4>
            <p className="text-lg font-semibold">{task?.title}</p>
            <p className="text-sm text-muted-foreground">{task?.location}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="staff-select">Atribuir para:</Label>
            <Select
              value={selectedStaffId}
              onValueChange={setSelectedStaffId}
            >
              <SelectTrigger id="staff-select">
                <SelectValue placeholder="Selecione um funcionário..." />
              </SelectTrigger>
              {/* ++ ESTA É A CORREÇÃO ++ */}
              <SelectContent>
                {staffList.length === 0 ? (
                  <SelectGroup>
                    <SelectLabel className="text-muted-foreground italic px-2 py-1.5">Nenhum funcionário encontrado</SelectLabel>
                  </SelectGroup>
                ) : (
                  <SelectGroup>
                    {staffList.map(staff => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
              {/* ++ FIM DA CORREÇÃO ++ */}
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedStaffId}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Confirmar Delegação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}