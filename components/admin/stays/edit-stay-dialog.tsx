"use client";

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as firestore from 'firebase/firestore';
import { Cabin, PreCheckIn, Property, Stay } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
// CORREÇÃO: Adicionados Phone e Users na importação
import { 
    Loader2, X, User, MapPin, Car, Key, 
    Pencil, Save, AlertCircle, Copy, 
    Baby, PawPrint, Globe, MessageSquare, CalendarDays, Phone, Users
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createActivityLog } from '@/lib/activity-logger';
import { useModalStore } from '@/hooks/use-modal-store'; 
import { getFirebaseDb } from '@/lib/firebase';
import { Badge } from '@/components/ui/badge';
import { z } from 'zod';
import { FullStayFormValues } from '@/lib/schemas/stay-schema';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Tipo estendido
type ExtendedFormValues = FullStayFormValues & {
    notes?: string;
};

const permissiveSchema = z.object({}).passthrough(); 

// --- HELPERS DE DATA ---
// Converte string do input (YYYY-MM-DD) para Date ao meio-dia
const parseDateInputValue = (value: string) => {
    if (!value) return undefined;
    return new Date(`${value}T12:00:00`);
};

// Converte Date para string do input (YYYY-MM-DD)
const formatDateForInput = (date: Date | undefined | null) => {
    if (!date) return '';
    return format(new Date(date), 'yyyy-MM-dd');
};

// --- COMPONENTE DE SEÇÃO (CARD) ---
const SectionCard = ({ 
    title, 
    subtitle,
    icon: Icon, 
    isEditing, 
    onEdit, 
    onSave, 
    onCancel, 
    children,
    hasWarning = false,
    loading = false
}: any) => {
    return (
        <div className={`bg-white rounded-lg border ${hasWarning ? 'border-orange-200' : 'border-slate-200'} shadow-sm overflow-hidden flex flex-col transition-all duration-200 ${isEditing ? 'ring-2 ring-blue-100 border-blue-300' : ''}`}>
            {/* Header do Card */}
            <div className={`px-4 py-3 border-b ${hasWarning ? 'bg-orange-50/50' : 'bg-slate-50'} flex justify-between items-center h-14`}>
                <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm uppercase tracking-wide">
                        <Icon className={`h-4 w-4 ${hasWarning ? 'text-orange-500' : 'text-slate-500'}`} />
                        {title}
                    </div>
                    {subtitle && <span className="text-[10px] text-slate-400 font-mono ml-6">{subtitle}</span>}
                </div>
                
                <div>
                    {!isEditing && (
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={onEdit} title="Editar">
                            <Pencil className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Corpo do Card */}
            <div className="p-4 flex-1 flex flex-col gap-4">
                {children}
            </div>

            {/* Rodapé de Ação (VISÍVEL APENAS NA EDIÇÃO) */}
            {isEditing && (
                <div className="px-4 py-3 bg-slate-50 border-t flex justify-end gap-2 animate-in slide-in-from-top-2">
                    <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading} className="text-slate-500 hover:text-slate-700">
                        Cancelar
                    </Button>
                    <Button size="sm" onClick={onSave} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-sm font-semibold px-6">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4" />}
                        Salvar
                    </Button>
                </div>
            )}
        </div>
    );
};

const DataRow = ({ label, value, warningIfEmpty = false, fullWidth = false }: { label: string, value: string | undefined | null, warningIfEmpty?: boolean, fullWidth?: boolean }) => {
    const isEmpty = !value || value.trim() === '';
    return (
        <div className={`flex flex-col mb-3 last:mb-0 ${fullWidth ? 'col-span-2' : ''}`}>
            <span className="text-[10px] font-medium text-slate-400 uppercase">{label}</span>
            <div className={`text-sm ${isEmpty ? 'text-slate-300 italic' : 'text-slate-800'} break-words whitespace-pre-wrap`}>
                {isEmpty ? (warningIfEmpty ? <span className="text-orange-400 flex items-center gap-1"><AlertCircle className="h-3 w-3"/> Não informado</span> : '--') : value}
            </div>
        </div>
    );
};

interface EditStayDialogProps {
    cabins: Cabin[];
    property?: Property;
    isOpen?: boolean;
    onClose?: () => void;
    stay?: Stay;
    onSuccess?: () => void;
}

export const EditStayDialog: React.FC<EditStayDialogProps> = ({ 
    cabins, 
    isOpen: propIsOpen,
    onClose: propOnClose,
    stay: propStay,
    onSuccess
}) => {
    const { user } = useAuth();
    const { isOpen: storeIsOpen, onClose: storeOnClose, type, data } = useModalStore();

    const isControlled = propIsOpen !== undefined;
    const isModalOpen = isControlled ? !!propIsOpen : (storeIsOpen && type === 'editStay');
    const handleClose = isControlled ? (propOnClose || (() => {})) : storeOnClose;
    const stay = isControlled ? propStay : (type === 'editStay' ? data?.stay : undefined);

    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [loadingData, setLoadingData] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<ExtendedFormValues>({
        // @ts-ignore
        resolver: zodResolver(permissiveSchema), 
        mode: 'onChange'
    });

    useEffect(() => {
        if (!isModalOpen) setEditingSection(null);
    }, [isModalOpen]);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!isModalOpen || !stay) return;
            setLoadingData(true);

            let loadedPreCheckIn = null;
            if (stay.preCheckInId) {
                const db = await getFirebaseDb();
                const snap = await firestore.getDoc(firestore.doc(db, 'preCheckIns', stay.preCheckInId));
                if (snap.exists()) loadedPreCheckIn = snap.data() as PreCheckIn;
            }

            const defaultCompanions = stay.companions || loadedPreCheckIn?.companions || [];
            const defaultPets = (Array.isArray(stay.pets) ? stay.pets : loadedPreCheckIn?.pets) || [];
            // @ts-ignore
            const notes = stay.notes || loadedPreCheckIn?.travelReason || '';

            form.reset({
                leadGuestName: stay.guestName,
                cabinId: stay.cabinId,
                // Garante que as datas venham como objeto Date do JS
                dates: { 
                    from: new Date(stay.checkInDate), 
                    to: new Date(stay.checkOutDate) 
                },
                token: stay.token,
                
                isForeigner: loadedPreCheckIn?.isForeigner || false,
                leadGuestDocument: loadedPreCheckIn?.leadGuestDocument || '',
                country: loadedPreCheckIn?.address?.country || 'Brasil',
                leadGuestEmail: stay.guestEmail || loadedPreCheckIn?.leadGuestEmail || '',
                leadGuestPhone: stay.guestPhone || loadedPreCheckIn?.leadGuestPhone || '',
                
                address: loadedPreCheckIn?.address || { cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' },
                
                estimatedArrivalTime: loadedPreCheckIn?.estimatedArrivalTime || '16:00',
                knowsVehiclePlate: loadedPreCheckIn?.knowsVehiclePlate ?? true,
                vehiclePlate: loadedPreCheckIn?.vehiclePlate || '',
                
                companions: defaultCompanions.map(c => ({ 
                    fullName: c.fullName, 
                    category: (c.category || (Number(c.age) < 2 ? 'baby' : Number(c.age) < 12 ? 'child' : 'adult')) as any,
                })),
                
                pets: defaultPets.map((p: any) => ({ 
                    id: p.id || Math.random().toString(),
                    name: p.name || 'Pet', 
                    species: p.species || 'outro',
                    breed: p.breed || p.notes || '',
                    weight: String(p.weight || ''), 
                    age: String(p.age || ''),
                    notes: p.notes 
                })),
                
                notes: notes
            });

            setLoadingData(false);
        };

        fetchDetails();
    }, [isModalOpen, stay, form]);

    const handleSave = async () => {
        if (!user || !stay) return;
        
        const data = form.getValues();

        // VALIDAÇÃO DE DATAS NO SALVAMENTO
        if (data.dates.to <= data.dates.from) {
            toast.error("A data de saída deve ser posterior à data de entrada.");
            return;
        }

        setIsSaving(true);

        try {
            const db = await getFirebaseDb();
            const selectedCabin = cabins.find(c => c.id === data.cabinId);
            const batch = firestore.writeBatch(db);
            const stayRef = firestore.doc(db, 'stays', stay.id);

            // Garante formato ISO correto
            const checkInISO = data.dates.from instanceof Date ? data.dates.from.toISOString() : new Date(data.dates.from).toISOString();
            const checkOutISO = data.dates.to instanceof Date ? data.dates.to.toISOString() : new Date(data.dates.to).toISOString();

            const stayPayload = {
                guestName: data.leadGuestName,
                guestPhone: data.leadGuestPhone,
                guestEmail: data.leadGuestEmail,
                cabinId: selectedCabin?.id,
                cabinName: selectedCabin?.name,
                checkInDate: checkInISO,
                checkOutDate: checkOutISO,
                numberOfGuests: 1 + (data.companions?.length || 0),
                token: data.token,
                companions: data.companions,
                pets: data.pets,
                notes: data.notes || '',
                updatedAt: firestore.Timestamp.now()
            };
            batch.update(stayRef, stayPayload);

            if (stay.preCheckInId) {
                const preCheckInRef = firestore.doc(db, 'preCheckIns', stay.preCheckInId);
                batch.update(preCheckInRef, {
                    leadGuestName: data.leadGuestName,
                    leadGuestPhone: data.leadGuestPhone,
                    leadGuestEmail: data.leadGuestEmail,
                    leadGuestDocument: data.leadGuestDocument,
                    address: data.address,
                    estimatedArrivalTime: data.estimatedArrivalTime,
                    vehiclePlate: data.vehiclePlate,
                    companions: data.companions,
                    pets: data.pets,
                    travelReason: data.notes 
                });
            }

            await createActivityLog({
                type: 'stay_updated',
                actor: { type: 'admin', identifier: user.email! },
                details: `Estadia atualizada (Seção: ${editingSection || 'Geral'})`,
                link: '/admin/stays'
            });

            await batch.commit();
            toast.success("Atualizado com sucesso!");
            setEditingSection(null);
            if (onSuccess) onSuccess();

        } catch (error) {
            toast.error("Erro ao salvar.");
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const getAcfpSummary = () => {
        const companions = form.watch('companions') || [];
        const pets = form.watch('pets') || [];
        let a = 1; let c = 0; let b = 0;
        companions.forEach((comp: any) => {
            if (comp.category === 'child') c++;
            else if (comp.category === 'baby') b++;
            else a++;
        });
        return `${a}A ${c}C ${b}B ${pets.length}P`;
    }

    if (!isModalOpen || !stay) return null;

    const values = form.watch();

    return (
        <Dialog open={isModalOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0 bg-slate-50/50">
                
                {/* --- TOPO --- */}
                <div className="bg-white border-b p-5 flex-none shadow-sm z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-xl font-bold text-slate-800">{values.leadGuestName || "Hóspede"}</h2>
                                <Badge className={`
                                    ${stay.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}
                                    ${stay.status === 'pending_guest_data' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' : ''}
                                `}>
                                    {stay.status === 'active' ? 'Hospedado' : stay.status === 'pending_guest_data' ? 'Aguardando' : 'Validação'}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                <span className="flex items-center gap-1"><Key className="h-3.5 w-3.5"/> {stay.cabinName}</span>
                                <span className="w-px h-3 bg-slate-300"></span>
                                <span className="flex items-center gap-1">
                                    <CalendarDays className="h-3.5 w-3.5" />
                                    {values.dates?.from ? format(new Date(values.dates.from), "dd/MMM", { locale: ptBR }) : '??'} 
                                    <span className="text-slate-300 mx-1">➜</span> 
                                    {values.dates?.to ? format(new Date(values.dates.to), "dd/MMM", { locale: ptBR }) : '??'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="gap-2 text-green-700 border-green-200 bg-green-50 hover:bg-green-100"
                                onClick={() => values.leadGuestPhone && window.open(`https://wa.me/${values.leadGuestPhone.replace(/\D/g, '')}`, '_blank')}
                            >
                                <Phone className="h-4 w-4"/> WhatsApp
                            </Button>
                            <Button variant="outline" size="sm" className="gap-2"
                                onClick={() => {
                                    navigator.clipboard.writeText(`https://portal.fazendadorosa.com.br/?token=${stay.token}`);
                                    toast.success("Link copiado!");
                                }}
                            >
                                <Copy className="h-4 w-4"/> Link
                            </Button>
                            <Button variant="ghost" size="icon" onClick={handleClose}>
                                <X className="h-5 w-5 text-slate-400"/>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* --- CORPO --- */}
                {loadingData ? (
                    <div className="flex-1 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600"/></div>
                ) : (
                    <Form {...form}>
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 content-start">
                            
                            {/* 1. HÓSPEDE */}
                            <SectionCard 
                                title="Hóspede Responsável" 
                                icon={User}
                                isEditing={editingSection === 'guest'}
                                onEdit={() => setEditingSection('guest')}
                                onCancel={() => setEditingSection(null)}
                                onSave={handleSave}
                                loading={isSaving}
                                hasWarning={!values.leadGuestDocument || !values.leadGuestPhone}
                            >
                                {editingSection === 'guest' ? (
                                    <div className="space-y-3">
                                        <FormField control={form.control} name="leadGuestName" render={({ field }) => (
                                            <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                        )} />
                                        <div className="grid grid-cols-2 gap-2">
                                            <FormField control={form.control} name="leadGuestDocument" render={({ field }) => (
                                                <FormItem><FormLabel>CPF/Doc</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                            )} />
                                            <FormField control={form.control} name="leadGuestPhone" render={({ field }) => (
                                                <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                            )} />
                                        </div>
                                        <FormField control={form.control} name="leadGuestEmail" render={({ field }) => (
                                            <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                        )} />
                                    </div>
                                ) : (
                                    <>
                                        <DataRow label="Nome" value={values.leadGuestName} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <DataRow label="Documento" value={values.leadGuestDocument} warningIfEmpty />
                                            <DataRow label="Telefone" value={values.leadGuestPhone} warningIfEmpty />
                                        </div>
                                        <DataRow label="E-mail" value={values.leadGuestEmail} />
                                    </>
                                )}
                            </SectionCard>

                            {/* 2. ENDEREÇO */}
                            <SectionCard 
                                title="Endereço (N.F.)" 
                                icon={MapPin}
                                isEditing={editingSection === 'address'}
                                onEdit={() => setEditingSection('address')}
                                onCancel={() => setEditingSection(null)}
                                onSave={handleSave}
                                loading={isSaving}
                                hasWarning={!values.address?.city}
                            >
                                {editingSection === 'address' ? (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-3 gap-2">
                                            <FormField control={form.control} name="address.cep" render={({ field }) => (
                                                <FormItem className="col-span-1"><FormLabel>CEP</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                            )} />
                                            <FormField control={form.control} name="address.city" render={({ field }) => (
                                                <FormItem className="col-span-2"><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                            )} />
                                        </div>
                                        <FormField control={form.control} name="address.street" render={({ field }) => (
                                            <FormItem><FormLabel>Rua</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                        )} />
                                        <div className="grid grid-cols-2 gap-2">
                                            <FormField control={form.control} name="address.number" render={({ field }) => (
                                                <FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                            )} />
                                            <FormField control={form.control} name="address.state" render={({ field }) => (
                                                <FormItem><FormLabel>Estado</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                            )} />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <DataRow label="CEP" value={values.address?.cep} />
                                            <DataRow label="Cidade/UF" value={`${values.address?.city || ''} - ${values.address?.state || ''}`} warningIfEmpty />
                                        </div>
                                        <DataRow label="Endereço" value={`${values.address?.street || ''}, ${values.address?.number || ''}`} />
                                    </>
                                )}
                            </SectionCard>

                             {/* 3. LOGÍSTICA & OBSERVAÇÕES */}
                             <SectionCard 
                                title="Detalhes da Chegada" 
                                icon={Car}
                                isEditing={editingSection === 'logistics'}
                                onEdit={() => setEditingSection('logistics')}
                                onCancel={() => setEditingSection(null)}
                                onSave={handleSave}
                                loading={isSaving}
                            >
                                {editingSection === 'logistics' ? (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            <FormField control={form.control} name="estimatedArrivalTime" render={({ field }) => (
                                                <FormItem><FormLabel>Horário</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>
                                            )} />
                                            <FormField control={form.control} name="vehiclePlate" render={({ field }) => (
                                                <FormItem><FormLabel>Placa</FormLabel><FormControl><Input {...field} placeholder="ABC-1234" /></FormControl></FormItem>
                                            )} />
                                        </div>
                                        
                                        <FormField control={form.control} name="notes" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Observações / Demandas</FormLabel>
                                                <FormControl>
                                                    <Textarea {...field} placeholder="Restrições alimentares, berço, etc..." className="min-h-[80px]" />
                                                </FormControl>
                                            </FormItem>
                                        )} />

                                        <FormField control={form.control} name="knowsVehiclePlate" render={({ field }) => (
                                            <div className="flex items-center gap-2 mt-1">
                                                <input type="checkbox" checked={field.value} onChange={field.onChange} className="h-4 w-4 text-blue-600 rounded border-gray-300"/>
                                                <label className="text-sm text-slate-700">Hóspede sabe a placa</label>
                                            </div>
                                        )} />
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <DataRow label="Horário Chegada" value={values.estimatedArrivalTime} />
                                            <DataRow label="Placa" value={values.vehiclePlate || "Não informado"} />
                                        </div>
                                        <div className="mt-2 bg-yellow-50/50 p-2 rounded border border-yellow-100">
                                            <div className="flex items-center gap-1 mb-1">
                                                <MessageSquare className="h-3 w-3 text-yellow-600"/>
                                                <span className="text-[10px] font-bold text-yellow-700 uppercase">Observações</span>
                                            </div>
                                            <p className="text-sm text-slate-700 whitespace-pre-wrap">
                                                {values.notes || <span className="text-slate-400 italic">Nenhuma observação registrada.</span>}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </SectionCard>

                            {/* 4. CONFIG DA ESTADIA (COM LÓGICA DE DATA) */}
                            <SectionCard 
                                title="Configuração" 
                                icon={Globe}
                                isEditing={editingSection === 'config'}
                                onEdit={() => setEditingSection('config')}
                                onCancel={() => setEditingSection(null)}
                                onSave={handleSave}
                                loading={isSaving}
                            >
                                {editingSection === 'config' ? (
                                    <div className="space-y-3">
                                        <FormField control={form.control} name="cabinId" render={({ field }) => (
                                            <FormItem><FormLabel>Cabana</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                                                    <SelectContent>{cabins.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </FormItem>
                                        )} />
                                        
                                        <div className="grid grid-cols-2 gap-2">
                                            {/* CHECK-IN */}
                                            <FormField control={form.control} name="dates.from" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Check-in</FormLabel>
                                                    <FormControl>
                                                        <Input 
                                                            type="date" 
                                                            value={formatDateForInput(field.value)} 
                                                            onChange={e => {
                                                                const newStart = parseDateInputValue(e.target.value);
                                                                field.onChange(newStart);
                                                                
                                                                // Lógica: Se a data de saída for menor/igual à nova entrada, empurra saída pra frente
                                                                if (newStart) {
                                                                    const currentEnd = form.getValues('dates.to');
                                                                    if (currentEnd <= newStart) {
                                                                        form.setValue('dates.to', addDays(newStart, 1));
                                                                    }
                                                                }
                                                            }} 
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )} />
                                            
                                            {/* CHECK-OUT (Com restrição visual min) */}
                                            <FormField control={form.control} name="dates.to" render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Check-out</FormLabel>
                                                    <FormControl>
                                                        <Input 
                                                            type="date" 
                                                            min={formatDateForInput(addDays(values.dates.from, 1))}
                                                            value={formatDateForInput(field.value)} 
                                                            onChange={e => field.onChange(parseDateInputValue(e.target.value))} 
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )} />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <DataRow label="Cabana Atual" value={cabins.find(c => c.id === values.cabinId)?.name || stay.cabinName} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <DataRow label="Check-in" value={values.dates?.from ? format(new Date(values.dates.from), 'dd/MM/yyyy') : '--'} />
                                            <DataRow label="Check-out" value={values.dates?.to ? format(new Date(values.dates.to), 'dd/MM/yyyy') : '--'} />
                                        </div>
                                    </>
                                )}
                            </SectionCard>

                             {/* 5. ACOMPANHANTES (ACFP) */}
                             <SectionCard 
                                title="Hóspedes & Pets"
                                subtitle={getAcfpSummary()}
                                icon={Users}
                                isEditing={editingSection === 'companions'}
                                onEdit={() => setEditingSection('companions')}
                                onCancel={() => setEditingSection(null)}
                                onSave={handleSave}
                                loading={isSaving}
                            >
                                {editingSection === 'companions' ? (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <span className="text-xs font-bold text-slate-500 uppercase block">Humanos</span>
                                            {values.companions?.map((comp, index) => (
                                                <div key={index} className="flex gap-2">
                                                    <FormField control={form.control} name={`companions.${index}.fullName`} render={({ field }) => (
                                                        <Input {...field} placeholder="Nome" className="h-8 text-sm flex-1" />
                                                    )} />
                                                    <FormField control={form.control} name={`companions.${index}.category`} render={({ field }) => (
                                                        <Select onValueChange={field.onChange} defaultValue={field.value || 'adult'}>
                                                            <FormControl><SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue /></SelectTrigger></FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="adult">Adulto</SelectItem>
                                                                <SelectItem value="child">Criança</SelectItem>
                                                                <SelectItem value="baby">Bebê</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )} />
                                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50"
                                                        onClick={() => {
                                                            const current = form.getValues('companions') || [];
                                                            form.setValue('companions', current.filter((_, i) => i !== index));
                                                        }}
                                                    ><X className="h-4 w-4"/></Button>
                                                </div>
                                            ))}
                                            <Button type="button" variant="outline" size="sm" className="w-full text-xs dashed border-slate-300"
                                                onClick={() => {
                                                    const current = form.getValues('companions') || [];
                                                    // @ts-ignore
                                                    form.setValue('companions', [...current, { fullName: '', category: 'adult' }]);
                                                }}
                                            >+ Adicionar Humano</Button>
                                        </div>

                                        <div className="space-y-2 pt-2 border-t">
                                            <span className="text-xs font-bold text-orange-600 uppercase flex items-center gap-1"><PawPrint className="h-3 w-3"/> Pets</span>
                                            {values.pets?.map((pet: any, index: number) => (
                                                <div key={index} className="flex gap-2">
                                                    <FormField control={form.control} name={`pets.${index}.name`} render={({ field }) => (
                                                        <Input {...field} placeholder="Nome Pet" className="h-8 text-sm flex-1" />
                                                    )} />
                                                    <FormField control={form.control} name={`pets.${index}.notes`} render={({ field }) => (
                                                        <Input {...field} placeholder="Raça/Detalhes" className="h-8 text-sm flex-1" />
                                                    )} />
                                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50"
                                                        onClick={() => {
                                                            const current = form.getValues('pets') || [];
                                                            form.setValue('pets', current.filter((_, i) => i !== index));
                                                        }}
                                                    ><X className="h-4 w-4"/></Button>
                                                </div>
                                            ))}
                                            <Button type="button" variant="outline" size="sm" className="w-full text-xs dashed border-orange-200 text-orange-600 hover:bg-orange-50"
                                                onClick={() => {
                                                    const current = form.getValues('pets') || [];
                                                    // @ts-ignore
                                                    form.setValue('pets', [...current, { id: Math.random().toString(), name: '', species: 'outro', breed: '', weight: '', age: '', notes: '' }]);
                                                }}
                                            >+ Adicionar Pet</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div>
                                            <ul className="space-y-2">
                                                <li className="flex items-center gap-2 text-sm text-slate-800">
                                                    <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><User className="h-3.5 w-3.5"/></div>
                                                    <span className="font-semibold">{values.leadGuestName} <span className="text-xs font-normal text-slate-400">(Titular)</span></span>
                                                </li>
                                                {values.companions?.map((c, i) => (
                                                    <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                                                        <div className="h-6 w-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                                            {c.category === 'baby' ? <Baby className="h-3.5 w-3.5"/> : <User className="h-3.5 w-3.5"/>}
                                                        </div>
                                                        <span>{c.fullName}</span>
                                                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal text-slate-500 border-slate-200">
                                                            {c.category === 'child' ? 'Criança' : c.category === 'baby' ? 'Bebê' : 'Adulto'}
                                                        </Badge>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {values.pets && values.pets.length > 0 && (
                                            <div className="pt-2 border-t">
                                                <span className="text-[10px] font-bold text-orange-400 uppercase mb-1 block">Pets Acompanhantes</span>
                                                <ul className="space-y-1">
                                                    {values.pets.map((p: any, i: number) => (
                                                        <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                                                            <PawPrint className="h-3.5 w-3.5 text-orange-500"/>
                                                            <span className="font-medium">{p.name || 'Pet'}</span>
                                                            {p.notes && <span className="text-xs text-slate-400">({p.notes})</span>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </SectionCard>

                            {/* 6. ACESSO */}
                            <div className="bg-slate-800 text-white rounded-lg p-4 shadow-md flex flex-col justify-between">
                                <div className="flex items-center gap-2 mb-4">
                                    <Key className="h-4 w-4 text-yellow-400" />
                                    <span className="font-bold text-sm uppercase tracking-wider">Acesso Digital</span>
                                </div>
                                <div className="text-center py-2">
                                    <span className="text-xs text-slate-400 uppercase block mb-1">Token de Entrada</span>
                                    <div className="text-3xl font-mono font-bold tracking-[0.2em] text-yellow-400">
                                        {values.token}
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-700">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400">Status</span>
                                        <Badge className="bg-green-500 hover:bg-green-600 text-white border-0">Ativo</Badge>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
};