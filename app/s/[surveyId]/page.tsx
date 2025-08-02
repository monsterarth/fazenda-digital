"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import * as firestore from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Survey, SurveyQuestion } from "@/types";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast, Toaster } from 'sonner';
import { Loader2, Send, Star, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';

// --- Componentes de Pergunta ---

const Rating5Stars = ({ control, name }: { control: any, name: string }) => ( <Controller control={control} name={name} render={({ field }) => ( <div className="flex items-center justify-center gap-2"> {[1, 2, 3, 4, 5].map((value) => ( <Star key={value} className={`h-10 w-10 cursor-pointer transition-colors ${field.value >= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} onClick={() => field.onChange(value)} /> ))} </div> )} /> );
const BinaryChoice = ({ control, name, options }: { control: any, name: string, options: string[] }) => ( <Controller control={control} name={name} render={({ field }) => ( <RadioGroup onValueChange={field.onChange} value={field.value || ""} className="flex justify-center gap-4"> <FormItem className="flex items-center space-x-3 space-y-0"> <FormControl><RadioGroupItem value={options[0] || 'Sim'} /></FormControl> <FormLabel className="font-normal text-lg">{options[0] || 'Sim'}</FormLabel> </FormItem> <FormItem className="flex items-center space-x-3 space-y-0"> <FormControl><RadioGroupItem value={options[1] || 'Não'} /></FormControl> <FormLabel className="font-normal text-lg">{options[1] || 'Não'}</FormLabel> </FormItem> </RadioGroup> )} /> );

const MultipleChoice = ({ control, name, question }: { control: any, name: string, question: SurveyQuestion }) => (
    <FormField
        control={control}
        name={name}
        render={({ field }) => (
            <FormItem className="space-y-3 text-left w-fit mx-auto">
                {question.allowMultiple ? (
                    question.options?.map(option => (
                        <FormField
                            key={option}
                            control={control}
                            name={name}
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value?.includes(option)}
                                            onCheckedChange={(checked) => {
                                                const currentValue = field.value || [];
                                                return checked
                                                    ? field.onChange([...currentValue, option])
                                                    : field.onChange(currentValue.filter((value: string) => value !== option));
                                            }}
                                        />
                                    </FormControl>
                                    <FormLabel className="font-normal">{option}</FormLabel>
                                </FormItem>
                            )}
                        />
                    ))
                ) : (
                    <FormControl>
                        <RadioGroup onValueChange={field.onChange} value={field.value || ''} className="flex flex-col space-y-1">
                            {question.options?.map(option => (
                                <FormItem key={option} className="flex items-center space-x-3 space-y-0">
                                    <FormControl><RadioGroupItem value={option} /></FormControl>
                                    <FormLabel className="font-normal">{option}</FormLabel>
                                </FormItem>
                            ))}
                        </RadioGroup>
                    </FormControl>
                )}
                <FormMessage />
            </FormItem>
        )}
    />
);

const NpsScale = ({ control, name }: { control: any, name: string }) => ( <Controller control={control} name={name} render={({ field }) => ( <div className="flex flex-wrap justify-center items-center gap-2"> {Array.from({ length: 11 }, (_, i) => i).map(value => ( <Button key={value} type="button" variant={field.value === value ? 'default' : 'outline'} className="h-10 w-10 rounded-full" onClick={() => field.onChange(value)}> {value} </Button> ))} </div> )} /> );

// --- Página Principal da Pesquisa ---
export default function SurveyPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const surveyId = params.surveyId as string;
    const stayId = searchParams.get('stayId');

    const [survey, setSurvey] = useState<Survey | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    
    const formSchema = useMemo(() => {
        const shape: { [key: string]: z.ZodType<any, any> } = {};
        survey?.questions.forEach(q => {
            if (q.type !== 'separator') {
                shape[q.id] = z.any().optional();
            }
        });
        return z.object(shape);
    }, [survey]);

    const form = useForm({ resolver: zodResolver(formSchema) });

    useEffect(() => {
        if (!stayId) { setLoading(false); return; }
        const fetchSurvey = async () => {
            if (!surveyId) return;
            const db = await getFirebaseDb();
            const surveyRef = firestore.doc(db, 'surveys', surveyId);
            const docSnap = await firestore.getDoc(surveyRef);
            if (docSnap.exists()) {
                setSurvey({ id: docSnap.id, ...docSnap.data() } as Survey);
            } else {
                toast.error("Pesquisa não encontrada.");
            }
            setLoading(false);
        };
        fetchSurvey();
    }, [surveyId, stayId]);

    const onSubmit: SubmitHandler<any> = async (data) => {
        const db = await getFirebaseDb();
        if (!db || !survey || !stayId) {
            toast.error("Não foi possível enviar sua resposta. Faltam informações.");
            return;
        }

        const toastId = toast.loading("Enviando suas respostas...");
        try {
            const responseData = {
                surveyId,
                stayId,
                submittedAt: firestore.Timestamp.now(),
                answers: Object.entries(data)
                    .filter(([, answer]) => {
                        if (answer === undefined || answer === null || answer === '') return false;
                        if (Array.isArray(answer) && answer.length === 0) return false;
                        return true;
                    })
                    .map(([questionId, answer]) => ({
                        questionId,
                        questionText: survey.questions.find(q => q.id === questionId)?.text,
                        answer,
                    })),
            };
            
            if (responseData.answers.length === 0) {
                 toast.error("Você precisa responder pelo menos uma pergunta.", { id: toastId });
                 return;
            }

            await firestore.addDoc(firestore.collection(db, 'surveyResponses'), responseData);
            toast.success("Obrigado pelo seu feedback!", { id: toastId });
            setIsSubmitted(true);
        } catch (error: any) {
            toast.error("Falha ao enviar respostas.", { id: toastId, description: error.message });
        }
    };

    const handleNextStep = async () => {
        const currentQuestion = survey?.questions[currentStep];
        if (currentQuestion && currentQuestion.type !== 'separator') {
            const isValid = await form.trigger(currentQuestion.id);
            if (!isValid) return;
        }
        if (currentStep < (survey?.questions.length || 0) - 1) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handlePrevStep = () => setCurrentStep(prev => prev - 1);
    
    if (loading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>;
    if (!stayId) return <div className="text-center p-8 text-red-600">Erro: ID da estadia não fornecido. Acesso inválido.</div>;
    if (!survey) return <div className="text-center p-8">Pesquisa não encontrada ou inválida.</div>;

    if (isSubmitted) {
         return (
            <div className="bg-gray-50 min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-2xl shadow-xl text-center">
                    <CardHeader>
                        <div className="mx-auto bg-green-100 rounded-full p-3 w-fit"><CheckCircle className="h-10 w-10 text-green-600" /></div>
                        <CardTitle className="text-3xl mt-4">Obrigado!</CardTitle>
                        <CardDescription>Sua opinião é muito valiosa e nos ajudará a melhorar nossos serviços.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    const currentQuestion = survey.questions[currentStep];
    const totalQuestions = survey.questions.length;
    
    return (
         <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
            <Toaster richColors position="top-center" />
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="text-3xl">{survey.title}</CardTitle>
                        <CardDescription>{survey.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="my-4">
                            <Progress value={((currentStep + 1) / totalQuestions) * 100} />
                            <p className="text-center text-sm text-muted-foreground mt-2">Pergunta {currentStep + 1} de {totalQuestions}</p>
                        </div>
                        <Form {...form}>
                            <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
                                <div className="text-center space-y-4 p-4 rounded-lg min-h-[200px] flex flex-col justify-center">
                                    <FormLabel className="text-xl font-semibold">{currentQuestion.text}</FormLabel>
                                    {currentQuestion.subtitle && <p className="text-sm text-muted-foreground">{currentQuestion.subtitle}</p>}
                                    
                                    {currentQuestion.type === 'separator' && <Separator className="my-4"/>}
                                    {currentQuestion.type === 'rating_5_stars' && <Rating5Stars control={form.control} name={currentQuestion.id} />}
                                    {currentQuestion.type === 'binary' && <BinaryChoice control={form.control} name={currentQuestion.id} options={currentQuestion.options || ['Sim', 'Não']} />}
                                    {currentQuestion.type === 'multiple_choice' && <MultipleChoice control={form.control} name={currentQuestion.id} question={currentQuestion} />}
                                    {currentQuestion.type === 'nps_0_10' && <NpsScale control={form.control} name={currentQuestion.id} />}
                                    {currentQuestion.type === 'text' && <Textarea placeholder="Sua resposta..." {...form.register(currentQuestion.id)} />}
                                    <FormMessage>{form.formState.errors[currentQuestion.id]?.message as React.ReactNode}</FormMessage>
                                </div>
                                
                                <div className="flex justify-between items-center pt-4">
                                    {currentStep > 0 ? (
                                        <Button type="button" variant="ghost" onClick={handlePrevStep}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
                                    ) : <div/>}

                                    {currentStep < totalQuestions - 1 ? (
                                        <Button type="button" onClick={handleNextStep}>Avançar <ArrowRight className="ml-2 h-4 w-4" /></Button>
                                    ) : (
                                        <Button type="button" size="lg" disabled={form.formState.isSubmitting} onClick={form.handleSubmit(onSubmit)}>
                                            {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                                            Enviar Respostas
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}