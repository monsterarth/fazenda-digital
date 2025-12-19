//components\admin\stays\pending-checkins-list.tsx
"use client"

import React, { useState } from "react"
import { PreCheckIn, Cabin } from "@/types"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format, addDays } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "sonner"
import {
  Loader2,
  CalendarIcon,
  Users,
  Edit,
  KeyRound,
  PawPrint,
  User,
  Home,
  Car,
  ShieldX,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DateRange } from "react-day-picker"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useAuth } from "@/context/AuthContext"
import { validateCheckinAction } from "@/app/actions/validate-checkin"
import { rejectCheckinAction } from "@/app/actions/reject-checkin"
import { CopyButton } from "@/components/ui/copy-button"

// Helper para traduzir a categoria
const getCategoryLabel = (cat: string) => {
    switch(cat) {
        case 'adult': return 'Adulto';
        case 'child': return 'Criança';
        case 'baby': return 'Free';
        default: return cat;
    }
};

const validationSchema = z.object({
  cabinId: z.string().min(1, "É obrigatório selecionar uma cabana."),
  dates: z.object({
    from: z.date({ required_error: "Data de check-in é obrigatória." }),
    to: z.date({ required_error: "Data de check-out é obrigatória." }),
  }),
})

type ValidationFormValues = z.infer<typeof validationSchema>

interface PendingCheckInsListProps {
  pendingCheckIns: PreCheckIn[]
  cabins: Cabin[]
}

export const PendingCheckInsList: React.FC<PendingCheckInsListProps> = ({
  pendingCheckIns,
  cabins,
}) => {
  const { user } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false);
  const [selectedCheckIn, setSelectedCheckIn] = useState<PreCheckIn | null>(
    null
  )

  const form = useForm<ValidationFormValues>({
    resolver: zodResolver(validationSchema),
  })

  // Função auxiliar de extração de datas com logs
  const extractDate = (val: any, label: string): Date | null => {
    if (!val) return null;
    
    let parsedDate: Date | null = null;

    if (val instanceof Date) {
        parsedDate = val;
    } else if (typeof val === 'string') {
        // Tenta construtor nativo primeiro (lida bem com ISO strings completas)
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
            parsedDate = d;
        }
    } else if (typeof val === 'object' && val.seconds) {
        // Tratamento para Timestamps do Firebase
        parsedDate = new Date(val.seconds * 1000);
    }

    if (parsedDate) {
        console.log(`[PendingList] Data extraída (${label}):`, parsedDate.toISOString());
        return parsedDate;
    }

    return null;
  };

  const handleOpenModal = (checkIn: PreCheckIn) => {
    setSelectedCheckIn(checkIn)
    
    const rawCheckIn = checkIn as any;
    console.log("[PendingList] Abrindo modal para:", rawCheckIn.leadGuestName);
    console.log("[PendingList] Dados brutos de data:", { 
        rootIn: rawCheckIn.checkInDate, 
        rootOut: rawCheckIn.checkOutDate,
        stayIn: rawCheckIn.stay?.checkInDate,
        stayOut: rawCheckIn.stay?.checkOutDate
    });

    // Lógica de Prioridade: 1. Raiz do objeto, 2. Objeto Stay aninhado
    const checkInDateVal = rawCheckIn.checkInDate || rawCheckIn.stay?.checkInDate;
    const checkOutDateVal = rawCheckIn.checkOutDate || rawCheckIn.stay?.checkOutDate;
    
    // Extrai ou usa fallback
    const fromDate = extractDate(checkInDateVal, 'Check-In') || new Date();
    const toDate = extractDate(checkOutDateVal, 'Check-Out') || addDays(new Date(), 2);

    const prefilledCabinId = rawCheckIn.cabinId || rawCheckIn.stay?.cabinId || "";
    
    // Força o reset do formulário com os novos valores
    form.reset({
      cabinId: prefilledCabinId, 
      dates: { 
          from: fromDate, 
          to: toDate 
      },
    })
    
    setIsModalOpen(true)
  }

  const handleValidateStay: SubmitHandler<ValidationFormValues> = async (
    data
  ) => {
    if (!selectedCheckIn || !user?.email) {
      return toast.error(
        "Dados da sessão inválidos. Por favor, recarregue a página."
      )
    }

    const toastId = toast.loading("Validando estadia...")

    const result = await validateCheckinAction(
      selectedCheckIn.id,
      data,
      user.email
    )

    if (result.success) {
      toast.success(result.message, {
        id: toastId,
        description: `Token: ${result.token}`,
      })
      setIsModalOpen(false)
      setSelectedCheckIn(null)
    } else {
      toast.error("Falha ao validar.", {
        id: toastId,
        description: result.message,
      })
    }
  }

  const handleRejectStay = async () => {
    if (!selectedCheckIn || !user?.email) return;
    
    setIsRejecting(true);
    const toastId = toast.loading("Recusando pré-check-in...");

    try {
        const result = await rejectCheckinAction(selectedCheckIn.id, user.email);
        
        if (result.success) {
            toast.success(result.message, { id: toastId });
            setIsModalOpen(false);
            setSelectedCheckIn(null);
        } else {
            toast.error("Erro ao recusar", { id: toastId, description: result.message });
        }
    } catch (error) {
        toast.error("Erro inesperado", { id: toastId });
    } finally {
        setIsRejecting(false);
    }
  }

  const formatAddress = (address: PreCheckIn["address"]) => {
    if (!address) return "Endereço não informado"
    const { street, number, complement, neighborhood, city, state, cep } =
      address
    return `${street}, ${number}${
      complement ? ` - ${complement}` : ""
    } - ${neighborhood}, ${city} - ${state}, CEP: ${cep}`
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hóspede</TableHead>
            <TableHead>Nº Pessoas</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pendingCheckIns.length > 0 ? (
            pendingCheckIns.map((checkIn) => (
              <TableRow key={checkIn.id}>
                <TableCell className="font-medium">
                  {checkIn.leadGuestName}
                </TableCell>
                <TableCell>{1 + (checkIn.companions?.length || 0)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenModal(checkIn)}
                  >
                    <Edit className="mr-2 h-4 w-4" /> Revisar
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center">
                Nenhum pré-check-in pendente.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {selectedCheckIn && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                Validar Pré-Check-in de: {selectedCheckIn.leadGuestName}
              </DialogTitle>
              <DialogDescription>
                Confirme os detalhes para criar a estadia ou recuse para
                arquivar o registro.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 py-4 max-h-[70vh] overflow-y-auto pr-4">
              <div className="space-y-6">
                <section>
                  <h4 className="font-semibold flex items-center gap-2 mb-2 pb-2 border-b">
                    <User />
                    Responsável
                  </h4>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between items-center">
                      <p>
                        <strong>Nome:</strong> {selectedCheckIn.leadGuestName}
                      </p>
                      <CopyButton textToCopy={selectedCheckIn.leadGuestName} />
                    </div>
                    <div className="flex justify-between items-center">
                      <p>
                        <strong>Doc:</strong>{" "}
                        {selectedCheckIn.leadGuestDocument}
                      </p>
                      <CopyButton
                        textToCopy={selectedCheckIn.leadGuestDocument}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <p>
                        <strong>Telefone:</strong>{" "}
                        {selectedCheckIn.leadGuestPhone}
                      </p>
                      <CopyButton
                        textToCopy={selectedCheckIn.leadGuestPhone}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <p>
                        <strong>Email:</strong> {selectedCheckIn.leadGuestEmail}
                      </p>
                      <CopyButton
                        textToCopy={selectedCheckIn.leadGuestEmail}
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold flex items-center gap-2 mb-2 pb-2 border-b">
                    <Home />
                    Endereço
                  </h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between items-center">
                      <p className="flex-1 pr-2">
                        {formatAddress(selectedCheckIn.address)}
                      </p>
                      <CopyButton
                        textToCopy={formatAddress(selectedCheckIn.address)}
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold flex items-center gap-2 mb-2 pb-2 border-b">
                    <Car />
                    Chegada
                  </h4>
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Horário:</strong>{" "}
                      {selectedCheckIn.estimatedArrivalTime}
                    </p>
                    <p>
                      <strong>Veículo:</strong>{" "}
                      {selectedCheckIn.vehiclePlate || "Não informado"}
                    </p>
                  </div>
                </section>
                {selectedCheckIn.companions &&
                  selectedCheckIn.companions.length > 0 && (
                    <section>
                      <h4 className="font-semibold flex items-center gap-2 mb-2 pb-2 border-b">
                        <Users />
                        Acompanhantes ({selectedCheckIn.companions.length})
                      </h4>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {selectedCheckIn.companions.map((c, i) => (
                          <li key={i}>
                            {c.fullName} <span className="text-muted-foreground">({getCategoryLabel(c.category as string)})</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                {selectedCheckIn.pets && selectedCheckIn.pets.length > 0 && (
                  <section>
                    <h4 className="font-semibold flex items-center gap-2 mb-2 pb-2 border-b">
                      <PawPrint />
                      Pets ({selectedCheckIn.pets.length})
                    </h4>
                    {selectedCheckIn.pets.map((p) => (
                      <div key={p.id} className="text-sm">
                        <p>
                          <strong>{p.name}</strong> ({p.species}, {p.weight}kg)
                        </p>
                      </div>
                    ))}
                  </section>
                )}
              </div>
              <div className="space-y-4">
                <Form {...form}>
                  <form
                    id="validation-form"
                    onSubmit={form.handleSubmit(handleValidateStay)}
                    className="space-y-4 p-4 border rounded-md bg-slate-50 sticky top-0"
                  >
                    <h4 className="font-semibold">Aprovar e Criar Estadia</h4>
                    <FormField
                      control={form.control}
                      name="cabinId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cabana</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <ScrollArea className="h-72">
                                {cabins.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </ScrollArea>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dates"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Período</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "pl-3 text-left font-normal bg-white",
                                    !field.value?.from &&
                                      "text-muted-foreground"
                                  )}
                                >
                                  {field.value?.from && field.value?.to ? (
                                    `${format(
                                      field.value.from,
                                      "dd/MM/yy"
                                    )} até ${format(
                                      field.value.to,
                                      "dd/MM/yy"
                                    )}`
                                  ) : (
                                    <span>Selecione</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="range"
                                selected={field.value as DateRange}
                                onSelect={field.onChange}
                                defaultMonth={field.value?.from}
                                numberOfMonths={2}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </div>
            </div>
            <DialogFooter className="sm:justify-between items-center pt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" type="button">
                    <ShieldX className="mr-2 h-4 w-4" />
                    Recusar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação irá recusar o pré-check-in de{" "}
                      <span className="font-semibold">
                        {selectedCheckIn.leadGuestName}
                      </span>
                      . O registro será arquivado e a ação não poderá ser
                      desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRejectStay}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Sim, recusar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                type="submit"
                form="validation-form"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="mr-2 h-4 w-4" />
                )}
                Validar e Gerar Token
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}