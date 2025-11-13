// ARQUIVO: app/manutencao/components/CompleteTaskModal.tsx
// (Note: Corrigido para usar 'useModalStore')

'use client';

import { useState, useRef, ChangeEvent } from 'react';
// ### CORREÇÃO AQUI ###
import { useModalStore } from '@/hooks/use-modal-store'; // <-- IMPORTAR useModalStore
import { MaintenanceTask } from '@/types/maintenance';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, UploadCloud, X, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { completeTaskWithFeedback } from '@/app/actions/manage-maintenance-task';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';

type Step = 1 | 2 | 3;

export function CompleteTaskModal() {
  const { user } = useAuth();
  // ### CORREÇÃO AQUI ###
  const { isOpen, onClose, type, data } = useModalStore(); // <-- USAR useModalStore
  const { task } = data as { task: MaintenanceTask };

  const isModalOpen = isOpen && type === 'completeMaintenanceTask';

  const [step, setStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
    e.target.value = '';
  };

  const uploadFile = async (fileToUpload: File): Promise<string | null> => {
    setUploading(true);
    try {
      const response = await fetch(
        `/api/upload?filename=${encodeURIComponent(fileToUpload.name)}`,
        {
          method: 'POST',
          body: fileToUpload,
        },
      );

      if (!response.ok) {
        throw new Error('Falha no upload');
      }

      const blob = await response.json();
      return blob.url;
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao enviar imagem.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const resetState = () => {
    setStep(1);
    setIsLoading(false);
    setUploading(false);
    setNotes('');
    setFile(null);
    setPreview(null);
  };

  const handleClose = () => {
    if (isLoading || uploading) return;
    resetState();
    onClose();
  };

  const handleSubmit = async (
    status: 'completed' | 'awaiting_review',
    completionNotes: string,
  ) => {
    if (!task || !user?.email) {
      toast.error('Erro: Tarefa ou usuário não encontrados.');
      return;
    }

    setIsLoading(true);
    let imageUrl = '';

    if (file) {
      const uploadedUrl = await uploadFile(file);
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      } else {
        setIsLoading(false);
        return;
      }
    }

    const toastId = toast.loading('Finalizando tarefa...');
    const response = await completeTaskWithFeedback(
      task.id,
      user.email,
      status,
      completionNotes,
      imageUrl || undefined,
    );

    if (response.success) {
      toast.success(
        `Tarefa ${
          status === 'completed' ? 'concluída' : 'enviada para revisão'
        }!`,
        { id: toastId },
      );
      handleClose();
    } else {
      toast.error(`Erro: ${response.message}`, { id: toastId });
    }

    setIsLoading(false);
  };

  const renderStep1 = () => (
    <>
      <DialogHeader>
        <DialogTitle>Conclusão da Tarefa</DialogTitle>
        <DialogDescription>"{task?.title}"</DialogDescription>
      </DialogHeader>
      <div className="py-6 text-center">
        <h3 className="text-lg font-medium">
          Foi possível resolver o problema 100%?
        </h3>
      </div>
      <DialogFooter className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          onClick={() => setStep(3)}
          disabled={isLoading}
        >
          Não
        </Button>
        <Button onClick={() => setStep(2)} disabled={isLoading}>
          Sim
        </Button>
      </DialogFooter>
    </>
  );

  const renderStep2 = () => (
    <>
      <DialogHeader>
        <DialogTitle>Problema Resolvido!</DialogTitle>
        <DialogDescription>
          Ótimo! Para concluirmos, poderia encaminhar uma foto do resultado?
          (Opcional)
        </DialogDescription>
      </DialogHeader>
      <div className="py-4">{renderUploader()}</div>
      <DialogFooter className="grid grid-cols-2 gap-2">
        <Button
          variant="ghost"
          onClick={() => setStep(1)}
          disabled={isLoading || uploading}
        >
          Voltar
        </Button>
        <Button
          onClick={() => handleSubmit('completed', 'Resolvido 100%')}
          disabled={isLoading || uploading}
        >
          {(isLoading || uploading) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {uploading ? 'Enviando foto...' : 'Concluir'}
        </Button>
      </DialogFooter>
    </>
  );

  const renderStep3 = () => (
    <>
      <DialogHeader>
        <DialogTitle>Pendência Encontrada</DialogTitle>
        <DialogDescription>
          Por favor, explique o que ficou pendente e, se possível, anexe uma
          foto.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-4 py-4">
        <div className="grid w-full gap-1.5">
          <Label htmlFor="notes">Explicação (Obrigatório)</Label>
          <Textarea
            id="notes"
            placeholder="Ex: A troca foi feita, mas a goteira persiste no canto esquerdo..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {renderUploader()}
      </div>
      <DialogFooter className="grid grid-cols-2 gap-2">
        <Button
          variant="ghost"
          onClick={() => setStep(1)}
          disabled={isLoading || uploading}
        >
          Voltar
        </Button>
        <Button
          onClick={() => handleSubmit('awaiting_review', notes)}
          disabled={isLoading || uploading || !notes.trim()}
        >
          {(isLoading || uploading) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {uploading ? 'Enviando foto...' : 'Enviar para Revisão'}
        </Button>
      </DialogFooter>
    </>
  );

  const renderUploader = () => (
    <div className="grid w-full gap-1.5">
      <Label>Foto (Opcional)</Label>
      <Input
        id="file-upload"
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      {preview && file ? (
        <div className="relative w-full h-48">
          <Image
            src={preview}
            alt="Preview da imagem"
            layout="fill"
            objectFit="cover"
            className="rounded-md border"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 rounded-full"
            onClick={() => {
              setFile(null);
              setPreview(null);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={triggerCamera}
          >
            <Camera className="mr-2 h-4 w-4" />
            Usar Câmera
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={triggerFileSelect}
          >
            <UploadCloud className="mr-2 h-4 w-4" />
            Galeria
          </Button>
        </div>
      )}
    </div>
  );

  if (!isModalOpen) {
    return null;
  }

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </DialogContent>
    </Dialog>
  );
}