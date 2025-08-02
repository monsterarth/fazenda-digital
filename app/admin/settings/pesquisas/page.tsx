"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as firestore from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast, Toaster } from 'sonner';

import { Survey, SurveyCategory, SurveyQuestion, QuestionType } from "@/types";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GripVertical, Plus, Edit, Trash2, Loader2, List, Settings, Star, CheckSquare, MessageSquare, Divide, Minus, Type, ArrowLeft, Save } from "lucide-react";
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

const questionTypeIcons = {
    rating_5_stars: <Star className="w-4 h-4" />,
    multiple_choice: <List className="w-4 h-4" />,
    nps_0_10: <MessageSquare className="w-4 h-4" />,
    text: <Type className="w-4 h-4" />,
    separator: <Divide className="w-4 h-4" />,
    comment_box: <MessageSquare className="w-4 h-4" />,
};

// Componente para editar uma pergunta individualmente
function QuestionEditorCard({ question, updateQuestion, removeQuestion, dragListeners, categories }: {
    question: SurveyQuestion;
    updateQuestion: (id: string, updates: Partial<SurveyQuestion>) => void;
    removeQuestion: (id: string) => void;
    dragListeners: any;
    categories: SurveyCategory[];
}) {
    const isSeparator = question.type === 'separator';

    return (
        <Card className="bg-white hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between p-3 bg-slate-50">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="cursor-grab h-8 w-8" {...dragListeners}>
                        <GripVertical className="w-5 h-5 text-gray-400" />
                    </Button>
                    <div className="flex items-center gap-2 text-sm font-medium">
                        {questionTypeIcons[question.type]}
                        <span>{isSeparator ? 'Divisor' : 'Pergunta'}</span>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeQuestion(question.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label htmlFor={`q-text-${question.id}`}>{isSeparator ? 'Título do Divisor' : 'Texto da Pergunta'}</Label>
                        <Input id={`q-text-${question.id}`} value={question.text} onChange={(e) => updateQuestion(question.id, { text: e.target.value })} placeholder={isSeparator ? 'Ex: Sobre sua Acomodação' : 'Ex: Como você avalia a limpeza?'} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor={`q-subtitle-${question.id}`}>Subtítulo (Opcional)</Label>
                        <Input id={`q-subtitle-${question.id}`} value={question.subtitle || ''} onChange={(e) => updateQuestion(question.id, { subtitle: e.target.value })} placeholder="Texto de apoio ou instrução." />
                    </div>
                </div>

                {!isSeparator && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor={`q-type-${question.id}`}>Tipo de Pergunta</Label>
                            <Select value={question.type} onValueChange={(value: QuestionType) => updateQuestion(question.id, { type: value, options: [] })}>
                                <SelectTrigger id={`q-type-${question.id}`}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="rating_5_stars">Avaliação (5 estrelas)</SelectItem>
                                    <SelectItem value="nps_0_10">NPS (0 a 10)</SelectItem>
                                    <SelectItem value="multiple_choice">Múltipla Escolha</SelectItem>
                                    <SelectItem value="text">Texto Curto</SelectItem>
                                    <SelectItem value="comment_box">Caixa de Comentário</SelectItem>
                                    <SelectItem value="separator">Divisor de Seção</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor={`q-category-${question.id}`}>Categoria (KPI)</Label>
                            <Select value={question.categoryId || ''} onValueChange={(value) => updateQuestion(question.id, { categoryId: value, categoryName: categories.find(c => c.id === value)?.name })}>
                                <SelectTrigger id={`q-category-${question.id}`}>
                                    <SelectValue placeholder="Selecione uma categoria..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                {question.type === 'multiple_choice' && (
                    <div className="space-y-2 pt-2">
                        <Label>Opções de Resposta</Label>
                        {question.options?.map((option, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Input value={option} onChange={(e) => {
                                    const newOptions = [...(question.options || [])];
                                    newOptions[index] = e.target.value;
                                    updateQuestion(question.id, { options: newOptions });
                                }} />
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => {
                                    const newOptions = [...(question.options || [])];
                                    newOptions.splice(index, 1);
                                    updateQuestion(question.id, { options: newOptions });
                                }}><Minus className="w-4 h-4" /></Button>
                            </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => updateQuestion(question.id, { options: [...(question.options || []), ''] })}>
                            <Plus className="w-4 h-4 mr-1" /> Adicionar Opção
                        </Button>
                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox id={`q-multiple-${question.id}`} checked={question.allowMultiple} onCheckedChange={(checked: boolean | 'indeterminate') => updateQuestion(question.id, { allowMultiple: !!checked })} />
                            <Label htmlFor={`q-multiple-${question.id}`}>Permitir múltiplas respostas</Label>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Componente SortableQuestionCard movido para fora do SurveyBuilder
function SortableQuestionCard({ id, question, updateQuestion, removeQuestion, categories }: {
    id: string;
    question: SurveyQuestion;
    updateQuestion: (id: string, updates: Partial<SurveyQuestion>) => void;
    removeQuestion: (id: string) => void;
    categories: SurveyCategory[];
}) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition };
    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <QuestionEditorCard
                question={question}
                updateQuestion={updateQuestion}
                removeQuestion={removeQuestion}
                dragListeners={listeners}
                categories={categories}
            />
        </div>
    );
}


// Componente para o construtor da pesquisa (quando uma pesquisa é selecionada)
function SurveyBuilder({ survey, categories, onBack, onSave }: {
    survey: Survey;
    categories: SurveyCategory[];
    onBack: () => void;
    onSave: (surveyData: Omit<Survey, 'id'>) => Promise<void>;
}) {
    const [title, setTitle] = useState(survey.title);
    const [description, setDescription] = useState(survey.description);
    const [isDefault, setIsDefault] = useState(survey.isDefault);
    const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const sorted = [...survey.questions].sort((a, b) => (a as any).position - (b as any).position);
        setQuestions(sorted);
    }, [survey]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const addNewQuestion = (type: QuestionType) => {
        const newQuestion: SurveyQuestion = {
            id: `q_${Date.now()}`,
            text: '',
            type,
            position: questions.length,
            ...(type === 'multiple_choice' && { options: [''] }),
        } as SurveyQuestion;
        setQuestions(prev => [...prev, newQuestion]);
    };

    const updateQuestion = useCallback((id: string, updates: Partial<SurveyQuestion>) => {
        setQuestions(prev => prev.map(q => (q.id === id ? { ...q, ...updates } : q)));
    }, []);

    const removeQuestion = useCallback((id: string) => {
        setQuestions(prev => prev.filter(q => q.id !== id));
    }, []);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setQuestions((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                const reorderedItems = arrayMove(items, oldIndex, newIndex);
                return reorderedItems.map((item, index) => ({ ...item, position: index } as SurveyQuestion));
            });
        }
    };

    const handleSaveClick = async () => {
        if (!title) {
            toast.error("O título da pesquisa é obrigatório.");
            return;
        }
        setIsSaving(true);
        const surveyDataToSave = { title, description, isDefault, questions };
        await onSave(surveyDataToSave);
        setIsSaving(false);
    };

    return (
        <div className="space-y-6">
            <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar para a lista</Button>
            <Card>
                <CardHeader>
                    <CardTitle>Editor de Pesquisa</CardTitle>
                    <CardDescription>Configure os detalhes e as perguntas da sua pesquisa.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                        <div>
                            <Label htmlFor="survey-default" className="font-semibold">Pesquisa Padrão</Label>
                            <p className="text-sm text-muted-foreground">Marcar como padrão para envio automático.</p>
                        </div>
                        <Switch id="survey-default" checked={isDefault} onCheckedChange={setIsDefault} />
                    </div>
                    <div>
                        <Label htmlFor="survey-title">Título da Pesquisa</Label>
                        <Input id="survey-title" value={title} onChange={e => setTitle(e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor="survey-description">Descrição</Label>
                        <Textarea id="survey-description" value={description} onChange={e => setDescription(e.target.value)} />
                    </div>
                </CardContent>
            </Card>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={questions.map(q => q.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-4">
                        {questions.map((q) => <SortableQuestionCard key={q.id} id={q.id} question={q} updateQuestion={updateQuestion} removeQuestion={removeQuestion} categories={categories} />)}
                    </div>
                </SortableContext>
            </DndContext>

            <Card>
                <CardHeader>
                    <CardTitle>Adicionar Elemento</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => addNewQuestion('rating_5_stars')}><Star className="mr-2 h-4 w-4" /> Avaliação</Button>
                    <Button variant="outline" size="sm" onClick={() => addNewQuestion('nps_0_10')}><MessageSquare className="mr-2 h-4 w-4" /> NPS</Button>
                    <Button variant="outline" size="sm" onClick={() => addNewQuestion('multiple_choice')}><CheckSquare className="mr-2 h-4 w-4" /> Múltipla Escolha</Button>
                    <Button variant="outline" size="sm" onClick={() => addNewQuestion('text')}><Type className="mr-2 h-4 w-4" /> Texto Curto</Button>
                    <Button variant="outline" size="sm" onClick={() => addNewQuestion('comment_box')}><MessageSquare className="mr-2 h-4 w-4" /> Comentário</Button>
                    <Button variant="outline" size="sm" onClick={() => addNewQuestion('separator')}><Divide className="mr-2 h-4 w-4" /> Divisor</Button>
                </CardContent>
            </Card>
            <div className="flex justify-end">
                <Button onClick={handleSaveClick} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Pesquisa
                </Button>
            </div>
        </div>
    );
}


// Página Principal
export default function ManageSurveysPage() {
    const [db, setDb] = useState<firestore.Firestore | null>(null);
    const [surveys, setSurveys] = useState<Survey[]>([]);
    const [categories, setCategories] = useState<SurveyCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);

    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    useEffect(() => {
        async function initialize() {
            const firestoreDb = await getFirebaseDb();
            setDb(firestoreDb);
        }
        initialize();
    }, []);

    useEffect(() => {
        if (!db) return;
        setLoading(true);

        const unsubSurveys = firestore.onSnapshot(firestore.collection(db, 'surveys'), (snapshot) => {
            const surveysData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Survey));
            setSurveys(surveysData);
            setLoading(false);
        });

        const unsubCategories = firestore.onSnapshot(firestore.collection(db, 'surveyCategories'), (snapshot) => {
            const categoriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SurveyCategory));
            setCategories(categoriesData);
        });

        return () => {
            unsubSurveys();
            unsubCategories();
        };
    }, [db]);


    const handleCreateNewSurvey = () => {
        const newSurvey: Survey = {
            id: `new_${Date.now()}`,
            title: 'Nova Pesquisa Sem Título',
            description: '',
            isDefault: false,
            questions: [],
        };
        setSelectedSurvey(newSurvey);
    };

    const handleSelectSurvey = async (surveyId: string) => {
        if (!db) return;
        const survey = surveys.find(s => s.id === surveyId);
        if (survey) {
            const questionsQuery = firestore.query(firestore.collection(db, `surveys/${surveyId}/questions`), firestore.orderBy('position'));
            const questionsSnapshot = await firestore.getDocs(questionsQuery);
            const questionsData = questionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SurveyQuestion));
            setSelectedSurvey({ ...survey, questions: questionsData });
        }
    };
    
    const handleSaveSurvey = async (surveyData: Omit<Survey, 'id'>) => {
        if (!db || !selectedSurvey) return;
        const { questions, ...surveyDetails } = surveyData;
        const isNew = selectedSurvey.id.startsWith('new_');
        
        const toastId = toast.loading(isNew ? 'Criando pesquisa...' : 'Atualizando pesquisa...');
    
        try {
            let surveyId = selectedSurvey.id;
    
            if (isNew) {
                const newSurveyRef = await firestore.addDoc(firestore.collection(db, 'surveys'), surveyDetails);
                surveyId = newSurveyRef.id;
            } else {
                await firestore.updateDoc(firestore.doc(db, 'surveys', surveyId), surveyDetails);
            }
    
            // Atualiza o status "isDefault" se necessário
            if (surveyDetails.isDefault) {
                const otherSurveys = surveys.filter(s => s.id !== surveyId && s.isDefault);
                const batch = firestore.writeBatch(db);
                otherSurveys.forEach(s => {
                    batch.update(firestore.doc(db, 'surveys', s.id), { isDefault: false });
                });
                await batch.commit();
            }
    
            // Sincroniza as perguntas
            const questionsCollection = firestore.collection(db, `surveys/${surveyId}/questions`);
            const existingQuestionsSnapshot = await firestore.getDocs(questionsCollection);
            const existingQuestionIds = existingQuestionsSnapshot.docs.map(d => d.id);
            const currentQuestionIds = questions.map(q => q.id).filter(id => !id.startsWith('q_'));
    
            const batch = firestore.writeBatch(db);
    
            // Deleta perguntas removidas
            existingQuestionIds.filter(id => !currentQuestionIds.includes(id)).forEach(idToDelete => {
                batch.delete(firestore.doc(questionsCollection, idToDelete));
            });
    
            // Adiciona/Atualiza perguntas
            questions.forEach((question) => {
                const { id, ...data } = question;
                const docRef = id.startsWith('q_') ? firestore.doc(questionsCollection) : firestore.doc(questionsCollection, id);
                batch.set(docRef, data);
            });
    
            await batch.commit();
            toast.success('Pesquisa salva com sucesso!', { id: toastId });
            setSelectedSurvey(null);
        } catch (error) {
            console.error(error);
            toast.error('Falha ao salvar a pesquisa.', { id: toastId });
        }
    };
    
    const handleSaveCategory = async () => {
        if (!db || !newCategoryName.trim()) return;
        try {
            await firestore.addDoc(firestore.collection(db, 'surveyCategories'), { name: newCategoryName });
            toast.success('Categoria criada!');
            setNewCategoryName('');
            setCategoryModalOpen(false);
        } catch (error) {
            toast.error('Erro ao criar categoria.');
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 text-slate-400 animate-spin"/></div>
    }

    if (selectedSurvey) {
        return <SurveyBuilder survey={selectedSurvey} categories={categories} onBack={() => setSelectedSurvey(null)} onSave={handleSaveSurvey} />;
    }

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            <Toaster richColors position="top-center" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Pesquisas de Satisfação</CardTitle>
                                <CardDescription>Gerencie suas pesquisas e visualize os resultados.</CardDescription>
                            </div>
                            <Button onClick={handleCreateNewSurvey}><Plus className="mr-2 h-4 w-4" /> Criar Pesquisa</Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {surveys.map(s => (
                                    <div key={s.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-slate-50">
                                        <div>
                                            <span className="font-medium">{s.title}</span>
                                            {s.isDefault && <Badge variant="secondary" className="ml-2">Padrão</Badge>}
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => handleSelectSurvey(s.id)}>
                                            <Settings className="mr-2 h-4 w-4" /> Gerenciar
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Categorias (KPIs)</CardTitle>
                            <Button size="sm" variant="outline" onClick={() => setCategoryModalOpen(true)}><Plus className="mr-1 h-4 w-4" /> Nova</Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1 text-sm">
                                {categories.map(cat => <p key={cat.id} className="p-2 rounded hover:bg-slate-100">{cat.name}</p>)}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nova Categoria</DialogTitle>
                        <DialogDescription>Crie uma categoria para agrupar as perguntas e analisar os KPIs.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="category-name">Nome da Categoria</Label>
                        <Input id="category-name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCategoryModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveCategory}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}