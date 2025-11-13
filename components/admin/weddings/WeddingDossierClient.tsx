// ARQUIVO: components/admin/weddings/WeddingDossierClient.tsx
// (Note: Corrigido para importar useAuth e passá-lo para a Server Action)

'use client';

import { WeddingData } from '@/app/actions/get-weddings';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Camera,
  CheckSquare,
  FileText,
  DollarSign,
  Users,
  Info,
  Loader2,
  Save,
  X,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { WeddingGeneralForm } from './forms/WeddingGeneralForm';
import { WeddingFinancialForm } from './forms/WeddingFinancialForm';
import { WeddingSuppliersForm } from './forms/WeddingSuppliersForm';
import { WeddingChecklistForm } from './forms/WeddingChecklistForm';
import React, { useState, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { updateWeddingPhoto } from '@/app/actions/manage-weddings';
// --- 1. INÍCIO DA ADIÇÃO ---
import { useAuth } from '@/context/AuthContext'; // <-- Importar o hook de autenticação
// --- FIM DA ADIÇÃO ---

interface DossierClientProps {
  weddingData: WeddingData;
}

export function WeddingDossierClient({ weddingData }: DossierClientProps) {
  const weddingDate = parseISO(weddingData.weddingDate);
  const formattedDate = format(weddingDate, "eeee, dd 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });

  // --- 2. INÍCIO DAS ADIÇÕES ---
  const { user } = useAuth(); // <-- Inicializar o hook
  const router = useRouter();
  // --- FIM DAS ADIÇÕES ---

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
    e.target.value = '';
  };

  const handleCancel = () => {
    setFile(null);
    setPreview(null);
  };

  const handleSavePhoto = async () => {
    if (!file) return;

    // --- 3. INÍCIO DAS ADIÇÕES (VERIFICAÇÃO DE AUTH) ---
    if (!user?.email) {
      toast.error('Erro de autenticação. Faça login novamente.');
      return;
    }
    // --- FIM DAS ADIÇÕES ---

    setIsUploading(true);
    const toastId = toast.loading('Enviando foto...');

    try {
      // 1. Upload para o Vercel Blob
      const response = await fetch(
        `/api/upload?filename=${encodeURIComponent(file.name)}`,
        {
          method: 'POST',
          body: file,
        },
      );

      if (!response.ok) {
        throw new Error('Falha no upload da imagem.');
      }

      const blob = await response.json();
      const photoUrl = blob.url;

      // 2. Salvar a URL no Firestore via Server Action
      // --- 4. INÍCIO DA MODIFICAÇÃO (PASSAR EMAIL) ---
      const result = await updateWeddingPhoto(
        weddingData.id,
        photoUrl,
        user.email, // <-- Passando o email
      );
      // --- FIM DA MODIFICAÇÃO ---

      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success('Foto do casal atualizada!', { id: toastId });
      handleCancel();
      router.refresh();
    } catch (error) {
      console.error('Erro ao salvar foto:', error);
      toast.error('Erro ao salvar foto.', {
        id: toastId,
        description: error instanceof Error ? error.message : 'Tente novamente.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
      />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16 border">
            <AvatarImage src={preview || weddingData.couplePhotoUrl || ''} />
            <AvatarFallback>
              <Camera className="h-6 w-6 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {weddingData.coupleName}
            </h1>
            <p className="text-lg text-muted-foreground">
              {formattedDate} | {weddingData.location}
            </p>
          </div>
        </div>

        <div className="flex space-x-2">
          {!file ? (
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="mr-2 h-4 w-4" />
              Alterar Foto
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={handleCancel}
                disabled={isUploading}
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button onClick={handleSavePhoto} disabled={isUploading}>
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar Foto
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Abas de Gerenciamento */}
      <Tabs defaultValue="geral" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
          <TabsTrigger value="geral">
            <Info className="mr-2 h-4 w-4" /> Geral
          </TabsTrigger>
          <TabsTrigger value="financeiro">
            <DollarSign className="mr-2 h-4 w-4" /> Financeiro
          </TabsTrigger>
          <TabsTrigger value="fornecedores">
            <Users className="mr-2 h-4 w-4" /> Fornecedores
          </TabsTrigger>
          <TabsTrigger value="checklist">
            <CheckSquare className="mr-2 h-4 w-4" /> Checklist
          </TabsTrigger>
          <TabsTrigger value="documentos">
            <FileText className="mr-2 h-4 w-4" /> Documentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-4">
          <WeddingGeneralForm wedding={weddingData} />
        </TabsContent>

        <TabsContent value="financeiro" className="mt-4">
          <WeddingFinancialForm wedding={weddingData} />
        </TabsContent>

        <TabsContent value="fornecedores" className="mt-4">
          <WeddingSuppliersForm wedding={weddingData} />
        </TabsContent>

        <TabsContent value="checklist" className="mt-4">
          <WeddingChecklistForm wedding={weddingData} />
        </TabsContent>

        <TabsContent value="documentos" className="mt-4">
          <h3 className="text-xl font-semibold mb-4">Documentos</h3>
          <p>
            (Aqui vamos construir o módulo de upload de arquivos para o
            contrato e outros documentos.)
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}