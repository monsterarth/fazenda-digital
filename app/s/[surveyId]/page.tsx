"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import * as firestore from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { Survey, SurveyQuestion, SurveyResponse, SurveyResponseAnswer } from "@/types";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from '@/components/ui/label';
import { toast, Toaster } from 'sonner';
import { Loader2, Send, Star, CheckCircle, Smile, Frown, Meh } from 'lucide-react';
import { Input } from '@/components/ui/input';

// Componente para a questão de avaliação com 5 estrelas
const Rating5Stars = ({ onChange, value }: { value: number; onChange: (value: number) => void; }) => {
    const [hover, setHover] = useState(0);
    return (
        <div className="flex items-center gap-1">
            {[...Array(5)].map((_, index) => {
                const ratingValue = index + 1;
                return (
                    <button
                        type="button"
                        key={ratingValue}
                        onClick={() => onChange(ratingValue)}
                        onMouseEnter={() => setHover(ratingValue)}
                        onMouseLeave={() => setHover(0)}
                        className="transition-transform transform hover:scale-110"
                    >
                        <Star
                            className="h-8 w-8"
                            fill={ratingValue <= (hover || value) ? "#f59e0b" : "#e4e4e7"}
                            stroke={ratingValue <= (hover || value) ? "#f59e0b" : "#a1a1aa"}
                        />
                    </button>
                );
            })}
        </div>
    );
};


// Componente para a questão de NPS de 0 a 10
const Nps0To10 = ({ onChange, value }: { value: number; onChange: (value: number) => void; }) => {
    return (
        <div className="flex flex-wrap items-center justify-center gap-2">
            {[...Array(11)].map((_, index) => (
                <button
                    key={index}
                    type="button"
                    onClick={() => onChange(index)}
                    className={`flex h-10 w-10 items-center justify-center rounded-md border text-sm font-medium transition-colors
                        ${value === index
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background hover:bg-accent'
                        }
                        ${index <= 6 ? 'hover:bg-red-100' : index <= 8 ? 'hover:bg-yellow-100' : 'hover:bg-green-100'}
                    `}
                >
                    {index}
                </button>
            ))}
        </div>
    );
};

// Componente principal da página da pesquisa
export default function SurveyPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const surveyId = params.surveyId as string;
    const stayId = searchParams.get('stay');

    const [db, setDb] = useState<firestore.Firestore | null>(null);
    const [survey, setSurvey] = useState<Survey | null>(null);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitSuccessful, setIsSubmitSuccessful] = useState(false);
    const [error, setError] = useState<string | null>(null);


    useEffect(() => {
        const initializeDb = async () => {
            const firestoreDb = await getFirebaseDb();
            setDb(firestoreDb);
        };
        initializeDb();
    }, []);

    useEffect(() => {
        if (!db || !surveyId) return;

        if (!stayId) {
            setError("Link de pesquisa inválido. O identificador da estadia não foi encontrado. Por favor, verifique o link que você recebeu.");
            setLoading(false);
            return;
        }

        const fetchSurvey = async () => {
            setLoading(true);
            try {
                const surveyRef = firestore.doc(db, 'surveys', surveyId);
                const surveySnap = await firestore.getDoc(surveyRef);

                if (!surveySnap.exists()) {
                    setError("Pesquisa não encontrada ou indisponível.");
                    return;
                }
                const surveyData = { id: surveySnap.id, ...surveySnap.data() } as Survey;

                const questionsQuery = firestore.query(firestore.collection(surveyRef, "questions"), firestore.orderBy("position", "asc"));
                const questionsSnapshot = await firestore.getDocs(questionsQuery);
                const questionsData = questionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SurveyQuestion));

                setSurvey({ ...surveyData, questions: questionsData });

            } catch (error) {
                toast.error("Falha ao carregar a pesquisa.");
                setError("Ocorreu um erro ao carregar os dados da pesquisa.");
            } finally {
                setLoading(false);
            }
        };

        fetchSurvey();
    }, [db, surveyId, stayId]);
    
    const handleAnswerChange = (questionId: string, answer: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!db || !survey || !stayId) {
            toast.error("Não foi possível enviar sua resposta. Faltam informações essenciais.");
            return;
        }

        setIsSubmitting(true);
        const toastId = toast.loading("Enviando suas respostas...");

        try {
            const responseAnswers: SurveyResponseAnswer[] = Object.entries(answers).map(([questionId, answer]) => ({
                questionId,
                questionText: survey.questions.find(q => q.id === questionId)?.text || 'N/A',
                answer,
            }));

            const responseData: Omit<SurveyResponse, 'id'> = {
                surveyId: survey.id,
                stayId: stayId,
                submittedAt: firestore.Timestamp.now(),
                answers: responseAnswers,
            };

            await firestore.addDoc(firestore.collection(db, 'surveyResponses'), responseData);
            
            toast.success("Obrigado pelo seu feedback!", { id: toastId });
            setIsSubmitSuccessful(true);

        } catch (error) {
            console.error("Submission Error:", error);
            toast.error("Ocorreu um erro ao enviar suas respostas.", { id: toastId });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /> Carregando...</div>;
    }

    if (error) {
        return <div className="flex h-screen w-full items-center justify-center text-center text-red-500 p-8">{error}</div>;
    }

    if (!survey) {
        return <div className="flex h-screen w-full items-center justify-center text-red-500">Pesquisa não encontrada ou inválida.</div>;
    }
    
    if (isSubmitSuccessful) {
        return (
             <div className="bg-gray-50 min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-2xl shadow-xl text-center">
                    <CardHeader>
                        <div className="mx-auto bg-green-100 rounded-full p-3 w-fit">
                            <CheckCircle className="h-10 w-10 text-green-600" />
                        </div>
                        <CardTitle className="text-3xl mt-4">Agradecemos sua contribuição!</CardTitle>
                        <CardDescription>
                            Sua opinião é muito valiosa para nós e nos ajudará a melhorar continuamente nossos serviços.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
            <Toaster richColors position="top-center" />
            <div className="max-w-2xl mx-auto">
                <Card className="shadow-xl">
                    <CardHeader className="text-center border-b">
                        <CardTitle className="text-3xl">{survey.title}</CardTitle>
                        <CardDescription>{survey.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-8 pt-6">
                            {survey.questions.map(question => (
                                <div key={question.id} className="space-y-3">
                                    {question.type === 'separator' ? (
                                        <div className="pt-4 border-t">
                                            <h3 className="text-xl font-semibold">{question.text}</h3>
                                            {question.subtitle && <p className="text-sm text-muted-foreground">{question.subtitle}</p>}
                                        </div>
                                    ) : (
                                        <div>
                                            <Label className="text-base font-semibold">{question.text}</Label>
                                            {question.subtitle && <p className="text-sm text-muted-foreground mb-2">{question.subtitle}</p>}
                                            
                                            {question.type === 'rating_5_stars' && <Rating5Stars value={answers[question.id] || 0} onChange={(val) => handleAnswerChange(question.id, val)} />}
                                            {question.type === 'nps_0_10' && <Nps0To10 value={answers[question.id]} onChange={(val) => handleAnswerChange(question.id, val)} />}
                                            {question.type === 'text' && <Input onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleAnswerChange(question.id, e.target.value)} />}
                                            {question.type === 'comment_box' && <Textarea onChange={(e) => handleAnswerChange(question.id, e.target.value)} />}
                                            {question.type === 'multiple_choice' && (
                                                <div className="space-y-2">
                                                    {question.options?.map(option => (
                                                        <div key={option} className="flex items-center space-x-2">
                                                            {question.allowMultiple ? (
                                                                <Checkbox 
                                                                    id={`${question.id}-${option}`} 
                                                                    onCheckedChange={(checked) => {
                                                                        const current = answers[question.id] || [];
                                                                        const newAnswers = checked ? [...current, option] : current.filter((item: string) => item !== option);
                                                                        handleAnswerChange(question.id, newAnswers);
                                                                    }}
                                                                />
                                                            ) : (
                                                                <RadioGroup onValueChange={(val) => handleAnswerChange(question.id, val)} value={answers[question.id]}>
                                                                    <div className="flex items-center space-x-2">
                                                                        <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                                                                        <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
                                                                    </div>
                                                                </RadioGroup>
                                                            )}
                                                             {!question.allowMultiple || <Label htmlFor={`${question.id}-${option}`}>{option}</Label>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Enviar Respostas
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}