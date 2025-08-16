// app/(portal)/cultura/page.tsx

"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Leaf, Shield, HeartHandshake, Award, Users, ArrowLeft } from 'lucide-react';

// Dados dos valores, sem alterações
const valores = [
    {
        icon: <HeartHandshake className="h-5 w-5 text-brand-primary" />,
        title: "Bem-Estar & Gentileza",
        content: "Nosso maior propósito é criar condições de satisfação plena, proporcionando a renovação das energias em um contato íntimo e respeitoso com a natureza. Atuamos com cortesia e demonstramos amor em cada detalhe das nossas relações."
    },
    {
        icon: <Leaf className="h-5 w-5 text-brand-primary" />,
        title: "Sustentabilidade",
        content: "Respeitar e cuidar da natureza é a nossa base. Agimos com responsabilidade socioambiental, buscando sempre a preservação e a sintonia com os ecossistemas que nos cercam."
    },
    {
        icon: <Shield className="h-5 w-5 text-brand-primary" />,
        title: "Ética e Transparência",
        content: "Agimos com integridade, justiça e honestidade. Nossas relações com hóspedes, colaboradores e parceiros são pautadas pela transparência e pela verdade."
    },
    {
        icon: <Award className="h-5 w-5 text-brand-primary" />,
        title: "Comprometimento",
        content: "Atuamos como donos do negócio, com proatividade e compromisso com os resultados. Buscamos a melhoria constante e a superação para oferecer sempre a melhor experiência."
    },
    {
        icon: <Users className="h-5 w-5 text-brand-primary" />,
        title: "Cooperação",
        content: "Acreditamos na força do trabalho em equipe. Procuramos colaborar uns com os outros em todas as situações, escutando, respeitando e contribuindo com novas ideias para evoluirmos juntos."
    }
];

export default function CulturaPage() {
    const router = useRouter();

    return (
        // Layout principal ajustado para seguir o padrão
        <div className="min-h-screen bg-brand-light-green text-brand-dark-green flex flex-col items-center p-4 md:p-8">
            <div className="w-full max-w-5xl">

                {/* Cabeçalho padronizado, igual ao de Agendamentos */}
                <div className="flex items-center gap-4 mb-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="text-brand-dark-green hover:bg-brand-mid-green/20"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-brand-dark-green flex items-center gap-2">
                            <Leaf className="h-7 w-7 text-brand-primary" /> Nossa Cultura
                        </h1>
                        <p className="text-brand-mid-green">Nossos valores e o que nos move.</p>
                    </div>
                </div>

                {/* Conteúdo da página (sem a imagem do topo) */}
                <main>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Coluna da Esquerda: História e Valores */}
                        <div className="lg:col-span-2 space-y-8">
                            <Card className="bg-white/80 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle className="text-2xl">Nossa História</CardTitle>
                                </CardHeader>
                                <CardContent className="prose prose-sm max-w-none text-brand-dark-green">
                                    <p>
                                        Nossa jornada começou em 1985, quando a Praia do Rosa era um refúgio de pescadores. O que nasceu como poucas casas para receber amigos e familiares, floresceu com o movimento de ecoturismo, transformando-se em um convite para um estilo de vida mais descontraído, que combina aconchego e um profundo contato com a natureza.
                                    </p>
                                    <p>
                                        Hoje, nosso maior compromisso é proporcionar essa conexão natural, um respiro em meio à vida agitada, valorizando a vida simples do campo, o respeito ambiental e o bem-receber.
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="bg-white/80 backdrop-blur-sm">
                                <CardHeader>
                                    <CardTitle className="text-2xl">Nossos Valores</CardTitle>
                                    <CardDescription>Os princípios que guiam cada detalhe da sua experiência.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Accordion type="single" collapsible className="w-full">
                                        {valores.map((valor) => (
                                            <AccordionItem key={valor.title} value={valor.title}>
                                                <AccordionTrigger className="text-left">
                                                    <div className="flex items-center gap-3">
                                                        {valor.icon}
                                                        <span className="font-semibold">{valor.title}</span>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="prose prose-sm max-w-none text-brand-dark-green pt-2">
                                                    {valor.content}
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Coluna da Direita: Missão, Visão e Compromisso */}
                        <div className="lg:col-span-1 space-y-8">
                            <Card className="bg-white/80 backdrop-blur-sm sticky top-24">
                                <CardHeader>
                                    <CardTitle>Nosso Propósito</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <h3 className="font-bold">Missão</h3>
                                        <p className="text-sm text-brand-mid-green">
                                            Receber e hospedar com qualidade, amor e dedicação, compartilhando bem-estar e renovando energias junto à Natureza.
                                        </p>
                                    </div>
                                    <div>
                                        <h3 className="font-bold">Visão</h3>
                                        <p className="text-sm text-brand-mid-green">
                                            Ser referência global em experiências que proporcionam felicidade através da conexão com a natureza.
                                        </p>
                                    </div>
                                    <div>
                                        <h3 className="font-bold">Slogan</h3>
                                        <p className="text-sm text-brand-mid-green italic">
                                            "Experiências para descobrir."
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-brand-primary/10 border-brand-primary/30">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-brand-dark-green"><Leaf /> Nosso Compromisso</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-brand-mid-green">
                                        Quanto mais as pessoas passam tempo em frente às telas, mais compreendemos a importância de proporcionar uma conexão natural e verdadeira. Nosso intento é seduzi-lo para o que é vivo, nosso lar comum: a natureza.
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}