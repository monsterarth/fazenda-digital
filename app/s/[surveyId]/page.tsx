//app\s\[surveyId]\page.tsx

"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import * as firestore from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { Survey, SurveyQuestion, SurveyResponse, SurveyResponseAnswer } from "@/types/survey";
import { Property } from "@/types"; // <-- ADICIONADO

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from '@/components/ui/label';
import { toast, Toaster } from 'sonner';
import { Loader2, Send, Star, CheckCircle, Award } from 'lucide-react'; // <-- ÍCONE 'Award' ADICIONADO
import { Input } from '@/components/ui/input';

const Rating5Stars = ({ onChange, value }: { value: number; onChange: (value: number) => void; }) => {
    const [hover, setHover] = useState(0);
    return (
        <div className="flex items-center gap-1">
            {[...Array(5)].map((_, index) => {
                const ratingValue = index + 1;
                return (
                    <button type="button" key={ratingValue} onClick={() => onChange(ratingValue)} onMouseEnter={() => setHover(ratingValue)} onMouseLeave={() => setHover(0)} className="transition-transform transform hover:scale-110">
                        <Star className="h-8 w-8" fill={ratingValue <= (hover || value) ? "#f59e0b" : "#e4e4e7"} stroke={ratingValue <= (hover || value) ? "#f59e0b" : "#a1a1aa"} />
                    </button>
                );
            })}
        </div>
    );
};

const Nps0To10 = ({ onChange, value }: { value: number; onChange: (value: number) => void; }) => {
    return (
        <div className="flex flex-wrap items-center justify-center gap-2">
            {[...Array(11)].map((_, index) => (
                <button key={index} type="button" onClick={() => onChange(index)} className={`flex h-10 w-10 items-center justify-center rounded-md border text-sm font-medium transition-colors ${value === index ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent'} ${index <= 6 ? 'hover:bg-red-100' : index <= 8 ? 'hover:bg-yellow-100' : 'hover:bg-green-100'}`}>
                    {index}
                </button>
            ))}
        </div>
    );
};

function SurveyComponent() {
    const params = useParams();
    const searchParams = useSearchParams();
    const surveyId = params.surveyId as string;
    const token = searchParams.get('token');

    const [db, setDb] = useState<firestore.Firestore | null>(null);
    const [stayId, setStayId] = useState<string | null>(null);
    const [survey, setSurvey] = useState<Survey | null>(null);
    const [property, setProperty] = useState<Property | null>(null); // <-- ADICIONADO
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitSuccessful, setIsSubmitSuccessful] = useState(false);
    const [isPromoter, setIsPromoter] = useState(false); // <-- ADICIONADO
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initializeAndAuth = async () => {
            setLoading(true);
            try {
                const firestoreDb = await getFirebaseDb();
                setDb(firestoreDb);

                if (!token) {
                    setError("Link de pesquisa inválido. O token de acesso não foi encontrado.");
                    return;
                }

                // 1. Chamar a nova API para obter o custom token
                const authResponse = await fetch('/api/auth/survey', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });

                if (!authResponse.ok) {
                    const errorResult = await authResponse.json();
                    throw new Error(errorResult.error || "Falha na autenticação para a pesquisa.");
                }
                
                const { customToken, stayId: fetchedStayId } = await authResponse.json();
                
                // 2. Fazer login silencioso com o custom token
                const auth = getAuth();
                await signInWithCustomToken(auth, customToken);
                setStayId(fetchedStayId);

            } catch (authError: any) {
                setError(authError.message || "Não foi possível validar seu acesso à pesquisa.");
            } finally {
                // setLoading(false) será chamado após o fetch da pesquisa
            }
        };

        initializeAndAuth();
    }, [token]);

    useEffect(() => {
        if (!db || !surveyId || !stayId) {
            // Se não há stayId após a tentativa de auth, não prosseguir
            if(!loading && !stayId) setError("Acesso não autorizado ou link inválido.");
            return;
        };

        const fetchSurvey = async () => {
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
            } catch (fetchError) {
                toast.error("Falha ao carregar a pesquisa.");
                setError("Ocorreu um erro ao carregar os dados da pesquisa.");
            } finally {
                setLoading(false);
            }
        };

        // NOVA FUNÇÃO PARA BUSCAR DADOS DA PROPRIEDADE
        const fetchProperty = async () => {
            if (!db) return;
            try {
                const propRef = firestore.doc(db, 'properties', 'default');
                const propSnap = await firestore.getDoc(propRef);
                if (propSnap.exists()) {
                    setProperty(propSnap.data() as Property);
                }
            } catch (err) {
                console.error("Failed to fetch property settings:", err);
                // Não é um erro crítico para bloquear a pesquisa
            }
        };

        fetchSurvey();
        fetchProperty(); // <-- CHAMADA ADICIONADA

    }, [db, surveyId, stayId]); // Removido 'loading' da dependência, pois é setado internamente
    
    const handleAnswerChange = (questionId: string, answer: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const auth = getAuth();
        const user = auth.currentUser;

        if (!survey || !stayId || !user) {
            toast.error("Não foi possível enviar. Sessão inválida ou dados faltando.");
            return;
        }

        // <-- LÓGICA DE VERIFICAÇÃO NPS ADICIONADA AQUI -->
        let promoter = false;
        if (survey?.questions) {
            const npsQuestion = survey.questions.find(q => q.type === 'nps_0_10');
            if (npsQuestion) {
                const npsAnswer = answers[npsQuestion.id];
                // Verifica se a resposta é um número e é 9 ou 10
                if (typeof npsAnswer === 'number' && npsAnswer >= 9) {
                    promoter = true;
                }
            }
        }
        setIsPromoter(promoter); // Define o estado para a tela de sucesso
        // <-- FIM DA LÓGICA NPS -->

        setIsSubmitting(true);
        const toastId = toast.loading("Enviando suas respostas...");

        try {
            const idToken = await user.getIdToken();
            const responseAnswers: SurveyResponseAnswer[] = Object.entries(answers).map(([questionId, answer]) => ({
                questionId,
                questionText: survey.questions.find(q => q.id === questionId)?.text || 'N/A',
                answer,
            }));

            const responseData: Omit<SurveyResponse, 'id' | 'submittedAt'> = {
                surveyId: survey.id,
                stayId: stayId,
                answers: responseAnswers,
            };

            const response = await fetch('/api/surveys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify({ responseData })
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || "Não foi possível registrar suas respostas.");
            }
            
            toast.success("Obrigado pelo seu feedback!", { id: toastId });
            setIsSubmitSuccessful(true);
        } catch (error: any) {
            toast.error("Ocorreu um erro ao enviar suas respostas.", { id: toastId, description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /> Validando acesso e carregando...</div>;
    }

    if (error) {
        return <div className="flex h-screen w-full items-center justify-center text-center text-red-500 p-8">{error}</div>;
    }

    if (!survey) {
        return <div className="flex h-screen w-full items-center justify-center text-red-500">Pesquisa não encontrada.</div>;
    }
    
    // <-- TELA DE SUCESSO MODIFICADA -->
    if (isSubmitSuccessful) {
        return (
             <div className="bg-gray-50 min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-2xl shadow-xl">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-green-100 rounded-full p-3 w-fit">
                            <CheckCircle className="h-10 w-10 text-green-600" />
                        </div>
                        <CardTitle className="text-3xl mt-4">
                            {property?.messages?.surveySuccessTitle || "Agradecemos sua contribuição!"}
                        </CardTitle>
                        <CardDescription>
                            {property?.messages?.surveySuccessSubtitle || "Sua opinião é muito valiosa para nós e nos ajudará a melhorar continuamente."}
                        </CardDescription>
                    </CardHeader>

                    {/* NOVO BLOCO CONDICIONAL PARA GOOGLE REVIEW */}
                    {isPromoter && property?.googleReviewLink && (
                        <CardContent className="pt-6 border-t">
                            <p className="text-sm text-muted-foreground mb-4 text-center">
                                Seu feedback positivo ilumina o nosso dia! Que tal compartilhá-lo com outros viajantes?
                            </p>
                            <Button asChild size="lg" className="w-full">
                                <a href={property.googleReviewLink} target="_blank" rel="noopener noreferrer">
                                    <Award className="mr-2 h-5 w-5" />
                                    Avaliar no Google
                                </a>
                            </Button>
                        </CardContent>
                    )}
                </Card>
            </div>
        )
    }
    // <-- FIM DA TELA DE SUCESSO MODIFICADA -->

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
                                            {question.type === 'text' && <Input value={answers[question.id] || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleAnswerChange(question.id, e.target.value)} />}
                                            {question.type === 'comment_box' && <Textarea value={answers[question.id] || ''} onChange={(e) => handleAnswerChange(question.id, e.target.value)} />}
                                            {question.type === 'multiple_choice' && (
                                                <div className="space-y-2">
                                                    {question.options?.map(option => (
                                                        <div key={option} className="flex items-center space-x-2">
                                                            {question.allowMultiple ? (
                                                                <>
                                                                    <Checkbox id={`${question.id}-${option}`} checked={answers[question.id]?.includes(option) || false} onCheckedChange={(checked) => {
                                                                        const current = answers[question.id] || [];
                                                                        const newAnswers = checked ? [...current, option] : current.filter((item: string) => item !== option);
                                                                        handleAnswerChange(question.id, newAnswers);
                                                                    }} />
                                                                    <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
                                                                </>
                                                            ) : (
                                                                <div className="flex items-center space-x-2">
                                                                    <RadioGroup value={answers[question.id]} onValueChange={(val) => handleAnswerChange(question.id, val)}>
                                                                        <div className="flex items-center space-x-2">
                                                                            <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                                                                            <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
                                                                        </div>
                                                                    </RadioGroup>
                                                                </div>
                                                            )}
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

// O componente principal agora usa Suspense para lidar com useSearchParams
export default function SurveyPageWrapper() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>}>
            <SurveyComponent />
        </Suspense>
    );
}