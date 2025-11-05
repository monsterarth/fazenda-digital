// components/admin/maintenance/DelegateTaskDialog.tsx

"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useModalStore } from '@/hooks/use-modal-store';
import { StaffMember } from '@/types/maintenance';
import { delegateMaintenanceTask } from '@/app/actions/manage-maintenance-task';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export const DelegateTaskDialog = ({ staff }: { staff: StaffMember[] }) => {
  const { isOpen, onClose, type, data } = useModalStore();
  const { user } = useAuth();
  const { task } = data;

  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  const isModalOpen = isOpen && type === 'delegateMaintenanceTask';

  // Popula o estado com os delegados atuais quando o modal abre
  useEffect(() => {
    if (task) {
      setSelectedEmails(task.assignedTo || []);
    }
  }, [task, isOpen]);

  const handleToggle = (email: string) => {
    setSelectedEmails((prev) =>
      prev.includes(email)
        ? prev.filter((e) => e !== email)
        : [...prev, email]
    );
  };

  const onSubmit = async () => {
    if (!task || !user?.email) return;

    setIsLoading(true);
    const response = await delegateMaintenanceTask(
      task.id,
      selectedEmails,
      user.email
    );

    if (response.success) {
      toast.success("Tarefa delegada com sucesso!");
      handleClose();
    } else {
      toast.error(`Erro: ${response.message}`);
    }
    setIsLoading(false);
  };

  const handleClose = () => {
    onClose();
    setSelectedEmails([]);
    setSearch('');
  };

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delegar Tarefa</DialogTitle>
          <DialogDescription>
            Atribua esta tarefa para um ou mais membros da equipe.
          </DialogDescription>
        </DialogHeader>
        <Command className="border rounded-md">
          <CommandInput 
            placeholder="Buscar por nome ou email..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <ScrollArea className="h-48">
              <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
              <CommandGroup>
                {filteredStaff.map((member) => (
                  <CommandItem
                    key={member.uid}
                    onSelect={() => handleToggle(member.email)}
                    className="cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedEmails.includes(member.email)}
                      className="mr-2"
                    />
                    <span>{member.name} ({member.email})</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};