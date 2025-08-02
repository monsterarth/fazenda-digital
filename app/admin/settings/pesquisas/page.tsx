"use client";

import React, { useState, useEffect, useMemo } from 'react';
import * as firestore from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast, Toaster } from 'sonner';

import { Survey, SurveyQuestion, QuestionType, SurveyCategory } from "@/types";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, PlusCircle, Edit, Trash2, GripVertical, MessageSquareQuote, Star, Binary, ListChecks, ListOrdered, Minus, X, Tag, Link as LinkIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

const questionSchema = z.object({
    type: z.enum(['rating_5_stars', 'binary', 'multiple_choice', 'nps_0_10', 'text', 'separator']),
    text: z.string().min(3, "O título é obrigatório."),
    subtitle: z.string().optional(),
    categoryId: z.string().optional(),
    options: z.array(z.object({ value: z.string().min(1, "Opção não pode ser vazia") })).optional(),
    allowMultiple: z.boolean().optional(),
});
type QuestionFormValues = z.infer<typeof questionSchema>;

// Componente reordenável (sem alterações)
function SortableQuestion({ question, onEdit, onDelete }: { question: SurveyQuestion, onEdit: () => void, onDelete: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: question.id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    if (question.type === 'separator') {
        return (
            <div ref={setNodeRef} style={style} className="py-4">
                <div className="flex items-center gap-2">
                    <GripVertical className="cursor-grab text-muted-foreground" {...attributes} {...listeners} />
                    <div className="flex-grow">
                        <p className="font-semibold">{question.text}</p>
                        {question.subtitle && <p className="text-sm text-muted-foreground">{question.subtitle}</p>}
                        <Separator className="mt-2" />
                    </div>
                    <Button variant="ghost" size="icon" onClick={onEdit}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </div>
            </div>
        );
    }
    return (
        <div ref={setNodeRef} style={style} className="flex items-center justify-between p-3 border rounded-md bg-white">
            <div className="flex items-center gap-2">
                <GripVertical className="cursor-grab text-muted-foreground" {...attributes} {...listeners} />
                <div>
                    <p>{question.text}</p>
                    {question.categoryName && <p className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="h-3 w-3"/> {question.categoryName}</p>}
                </div>
            </div>
            <div className="flex items-center gap-2">
                 <Button variant="ghost" size="icon" onClick={onEdit}><Edit className="h-4 w-4" /></Button>
                 <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="h-4 w-4 text-red-500" /></Button>
            </div>
        </div>
    );
}

export default function ManageSurveysPage() {
    const [db, setDb] = useState<firestore.Firestore | null>(null);
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [selectedSurveyId, setSelectedSurveyId] = useState<string>('');
    const [categories, setCategories] = useState<SurveyCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<SurveyQuestion | null>(null);
    
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<SurveyCategory | null>(null);
    const [categoryName, setCategoryName] = useState("");
    
    const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
    const [newSurveyTitle, setNewSurveyTitle] = useState("");
    const [newSurveyDescription, setNewSurveyDescription] = useState("");

    const form = useForm<QuestionFormValues>();
    const { fields: optionFields, append, remove } = useFieldArray({ control: form.control, name: "options" });
    const questionType = form.watch('type');
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const selectedSurvey = useMemo(() => surveys.find(s => s.id === selectedSurveyId), [surveys, selectedSurveyId]);

    useEffect(() => {
        const initializeApp = async () => {
            const firestoreDb = await getFirebaseDb();
            if (!firestoreDb) return; setDb(firestoreDb);
            const unsubSurveys = firestore.onSnapshot(firestore.collection(firestoreDb, 'surveys'), (snapshot) => {
                const surveysData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Survey));
                setSurveys(surveysData);
                if (!selectedSurveyId && surveysData.length > 0) {
                    const defaultSurvey = surveysData.find(s => s.isDefault) || surveysData[0];
                    setSelectedSurveyId(defaultSurvey.id);
                }
                setLoading(false);
            });
            const catQuery = firestore.query(firestore.collection(firestoreDb, 'surveyCategories'), firestore.orderBy("order", "asc"));
            const unsubCategories = firestore.onSnapshot(catQuery, (snapshot) => {
                setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SurveyCategory)));
            });
            return () => { unsubSurveys(); unsubCategories(); };
        };
        initializeApp();
    }, [selectedSurveyId]);
    
    const handleOpenQuestionModal = (question: SurveyQuestion | null) => {
        setEditingQuestion(question);
        if (question) form.reset({ ...question, options: question.options?.map(o => ({ value: o })) });
        else form.reset({ type: 'rating_5_stars', text: '', subtitle: '', options: [{ value: '' }], allowMultiple: false, categoryId: '' });
        setIsQuestionModalOpen(true);
    };

    const handleSaveQuestion: SubmitHandler<QuestionFormValues> = async (data) => {
        if (!selectedSurvey || !db) return;
        setIsSaving(true);
        const selectedCat = categories.find(c => c.id === data.categoryId);
        const newQuestionData: SurveyQuestion = {
            id: editingQuestion?.id || new Date().toISOString(), type: data.type as QuestionType, text: data.text, subtitle: data.subtitle,
            categoryId: data.categoryId === 'none' ? '' : data.categoryId, categoryName: selectedCat?.name || '',
            ...(data.type === 'multiple_choice' && { options: data.options?.map(o => o.value) || [], allowMultiple: data.allowMultiple })
        };
        const updatedQuestions = editingQuestion ? selectedSurvey.questions.map(q => q.id === editingQuestion.id ? newQuestionData : q) : [...selectedSurvey.questions, newQuestionData];
        try {
            await firestore.updateDoc(firestore.doc(db, 'surveys', selectedSurveyId), { questions: updatedQuestions });
            toast.success("Pesquisa atualizada!");
            setIsQuestionModalOpen(false);
        } catch (e: any) { toast.error("Erro ao salvar.", { description: e.message }); } finally { setIsSaving(false); }
    };
    
    const handleDeleteQuestion = async (questionId: string) => {
        if (!selectedSurvey || !db || !confirm("Tem certeza?")) return;
        const updatedQuestions = selectedSurvey.questions.filter(q => q.id !== questionId);
        try {
            await firestore.updateDoc(firestore.doc(db, 'surveys', selectedSurveyId), { questions: updatedQuestions });
            toast.success("Pergunta excluída.");
        } catch (e: any) { toast.error("Erro ao excluir.", { description: e.message }); }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        if (!selectedSurvey || !db) return;
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = selectedSurvey.questions.findIndex(q => q.id === active.id);
            const newIndex = selectedSurvey.questions.findIndex(q => q.id === over.id);
            const newQuestions = arrayMove(selectedSurvey.questions, oldIndex, newIndex);
            setSurveys(currentSurveys => currentSurveys.map(s => s.id === selectedSurveyId ? { ...s, questions: newQuestions } : s));
            await firestore.updateDoc(firestore.doc(db, 'surveys', selectedSurveyId), { questions: newQuestions });
            toast.success("Ordem das perguntas salva!");
        }
    };

    const handleOpenCategoryModal = (category: SurveyCategory | null) => {
        setEditingCategory(category);
        setCategoryName(category?.name || "");
        setIsCategoryModalOpen(true);
    };

    const handleSaveCategory = async () => {
        if (!db || !categoryName.trim()) return toast.error("O nome da categoria não pode ser vazio.");
        setIsSaving(true);
        try {
            if (editingCategory) {
                await firestore.updateDoc(firestore.doc(db, 'surveyCategories', editingCategory.id), { name: categoryName });
                toast.success("Categoria atualizada!");
            } else {
                await firestore.addDoc(firestore.collection(db, 'surveyCategories'), { name: categoryName, order: categories.length });
                toast.success("Categoria criada!");
            }
            setCategoryName("");
            setIsCategoryModalOpen(false);
            setEditingCategory(null);
        } catch (e: any) { toast.error("Erro ao salvar categoria.", { description: e.message }); } finally { setIsSaving(false); }
    };

    const handleDeleteCategory = async (categoryId: string) => {
        if (!db || !confirm("Tem certeza?")) return;
        await firestore.deleteDoc(firestore.doc(db, 'surveyCategories', categoryId));
        toast.success("Categoria excluída.");
    };
    
    const handleCreateSurvey = async () => {
        if (!db || !newSurveyTitle.trim()) return toast.error("O título é obrigatório.");
        setIsSaving(true);
        try {
            const newSurveyRef = await firestore.addDoc(firestore.collection(db, 'surveys'), { 
                title: newSurveyTitle, 
                description: newSurveyDescription, 
                isDefault: false, 
                questions: [] 
            });
            setSelectedSurveyId(newSurveyRef.id);
            toast.success("Nova pesquisa criada!");
            setIsSurveyModalOpen(false);
            setNewSurveyTitle("");
            setNewSurveyDescription("");
        } catch(e: any) { toast.error("Erro ao criar pesquisa.", { description: e.message }); }
        finally { setIsSaving(false); }
    };

    const handleDeleteSurvey = async () => {
        if(!db || !selectedSurvey || selectedSurvey.isDefault || !confirm(`Tem certeza que deseja excluir a pesquisa "${selectedSurvey.title}"?`)) return;
        await firestore.deleteDoc(firestore.doc(db, 'surveys', selectedSurvey.id));
        toast.success("Pesquisa excluída!");
        setSelectedSurveyId(surveys.find(s => s.isDefault)?.id || surveys[0]?.id || '');
    };

    const copySurveyLink = () => {
        const url = `${window.location.origin}/s/${selectedSurveyId}?stayId=TESTE`;
        navigator.clipboard.writeText(url);
        toast.success("Link de teste copiado para a área de transferência!");
    }

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>;

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            <Toaster richColors position="top-center" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex justify-between items-center flex-wrap gap-4">
                            <CardTitle className="flex items-center gap-2"><MessageSquareQuote /> Construtor de Pesquisas</CardTitle>
                            <div className="flex items-center gap-2">
                                 <Select value={selectedSurveyId} onValueChange={setSelectedSurveyId}>
                                    <SelectTrigger className="w-auto md:w-[250px]"><SelectValue placeholder="Selecione uma pesquisa..." /></SelectTrigger>
                                    <SelectContent>
                                        {surveys.map(s => <SelectItem key={s.id} value={s.id}>{s.title}{s.isDefault && " (Padrão)"}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Button variant="outline" onClick={() => setIsSurveyModalOpen(true)}><PlusCircle className="mr-2 h-4 w-4"/> Nova Pesquisa</Button>
                            </div>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                            <CardDescription>{selectedSurvey?.description || 'Selecione uma pesquisa para editar.'}</CardDescription>
                            {selectedSurveyId && (
                                <div className="flex items-center gap-2">
                                     <Button size="sm" variant="ghost" onClick={copySurveyLink}><LinkIcon className="mr-2 h-4 w-4"/>Copiar Link</Button>
                                    {!selectedSurvey?.isDefault && <Button size="sm" variant="destructive" onClick={handleDeleteSurvey}><Trash2 className="mr-2 h-4 w-4"/>Excluir</Button>}
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={selectedSurvey?.questions.map(q => q.id) || []} strategy={verticalListSortingStrategy}>
                                    {selectedSurvey?.questions.map(q => (
                                        <SortableQuestion key={q.id} question={q} onEdit={() => handleOpenQuestionModal(q)} onDelete={() => handleDeleteQuestion(q.id)} />
                                    ))}
                                </SortableContext>
                            </DndContext>
                            <Button onClick={() => handleOpenQuestionModal(null)} className="w-full" variant="outline" disabled={!selectedSurveyId}><PlusCircle className="mr-2 h-4 w-4"/> Adicionar Pergunta ou Seção</Button>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Tag /> Categorias de KPI</CardTitle>
                        <CardDescription>Gerencie as categorias para análise.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {categories.map(cat => (
                            <div key={cat.id} className="flex items-center justify-between p-2 rounded-md bg-slate-50 border">
                                <span>{cat.name}</span>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenCategoryModal(cat)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteCategory(cat.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                </div>
                            </div>
                        ))}
                        <Button onClick={() => handleOpenCategoryModal(null)} className="w-full mt-2" variant="outline"><PlusCircle className="mr-2 h-4 w-4"/> Adicionar Categoria</Button>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isQuestionModalOpen} onOpenChange={setIsQuestionModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>{editingQuestion ? "Editar Pergunta" : "Nova Pergunta / Seção"}</DialogTitle></DialogHeader>
                    <Form {...form}>
                        <form id="question-form" onSubmit={form.handleSubmit(handleSaveQuestion)} className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-4">
                             <FormField control={form.control} name="type" render={({ field }) => (
                                <FormItem><FormLabel>Tipo</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="separator"><div className="flex items-center gap-2"><Minus /> Separador</div></SelectItem>
                                        <SelectItem value="rating_5_stars"><div className="flex items-center gap-2"><Star /> 5 Estrelas</div></SelectItem>
                                        <SelectItem value="binary"><div className="flex items-center gap-2"><Binary /> Sim/Não</div></SelectItem>
                                        <SelectItem value="multiple_choice"><div className="flex items-center gap-2"><ListChecks /> Múltipla Escolha</div></SelectItem>
                                        <SelectItem value="nps_0_10"><div className="flex items-center gap-2"><ListOrdered /> Escala NPS</div></SelectItem>
                                        <SelectItem value="text"><div className="flex items-center gap-2"><MessageSquareQuote /> Texto</div></SelectItem>
                                    </SelectContent>
                                </Select>
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="text" render={({ field }) => (
                                <FormItem><FormLabel>{questionType === 'separator' ? 'Título da Seção' : 'Texto da Pergunta'}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="subtitle" render={({ field }) => (
                                <FormItem><FormLabel>Subtítulo (opcional)</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            {questionType !== 'separator' && (
                                <FormField control={form.control} name="categoryId" render={({ field }) => (
                                    <FormItem><FormLabel>Categoria (para KPIs)</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione uma categoria..."/></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">Nenhuma</SelectItem>
                                            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            <Separator className="my-2"/>
                                            <Button type="button" variant="ghost" className="w-full justify-start pl-2 font-normal" onClick={() => { setIsQuestionModalOpen(false); handleOpenCategoryModal(null); }}>
                                                <PlusCircle className="mr-2 h-4 w-4"/> Criar nova categoria
                                            </Button>
                                        </SelectContent>
                                    </Select>
                                    </FormItem>
                                )}/>
                            )}
                            {questionType === 'multiple_choice' && (
                                <div className="space-y-4 p-4 border rounded-md">
                                    <FormLabel>Opções de Resposta</FormLabel>
                                    {optionFields.map((field, index) => (
                                        <FormField key={field.id} control={form.control} name={`options.${index}.value`} render={({ field }) => (
                                            <FormItem className="flex items-center gap-2">
                                                <FormControl><Input {...field} /></FormControl>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><X className="h-4 w-4 text-red-500" /></Button>
                                            </FormItem>
                                        )}/>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={() => append({ value: ''})}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Opção</Button>
                                     <FormField control={form.control} name="allowMultiple" render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-4">
                                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                            <FormLabel className="font-normal">Permitir múltiplas seleções</FormLabel>
                                        </FormItem>
                                    )}/>
                                </div>
                            )}
                        </form>
                    </Form>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsQuestionModalOpen(false)}>Cancelar</Button>
                        <Button type="submit" form="question-form" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Criar Nova Categoria'}</DialogTitle>
                        <DialogDescription>Esta categoria ficará disponível para todas as perguntas.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="category-name">Nome da Categoria</Label>
                        <Input id="category-name" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => { setIsCategoryModalOpen(false); setEditingCategory(null); }}>Cancelar</Button>
                        <Button onClick={handleSaveCategory} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

             <Dialog open={isSurveyModalOpen} onOpenChange={setIsSurveyModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Criar Nova Pesquisa</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <Label htmlFor="survey-title">Título da Pesquisa</Label>
                            <Input id="survey-title" value={newSurveyTitle} onChange={(e) => setNewSurveyTitle(e.target.value)} />
                        </div>
                         <div>
                            <Label htmlFor="survey-description">Descrição</Label>
                            <Textarea id="survey-description" value={newSurveyDescription} onChange={(e) => setNewSurveyDescription(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsSurveyModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateSurvey} disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Criar Pesquisa</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}