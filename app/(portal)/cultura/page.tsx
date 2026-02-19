"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, Target, HeartHandshake, Leaf, Users, Award, Telescope, History, Waves } from 'lucide-react';

// Dados da página para fácil manutenção
const pageData = {
    hero: {
        title: "A Essência da Fazenda",
        subtitle: "Mais que uma hospedagem, um estado de espírito.",
        imageUrl: "https://od6apn3gvpg0jwyr.public.blob.vercel-storage.com/CAU_0530.jpg" // Mesma imagem da tela de login para consistência
    },
    history: {
        title: "Nossa História: Onde Tudo Começou",
        content: [
            "Em 1985, numa Praia do Rosa habitada por pescadores e cercada pela natureza intocada, Neco e Regina fundaram o que viria a ser a Fazenda do Rosa. O que começou como um refúgio para amigos floresceu, atraindo viajantes e dando início a um movimento de ecoturismo que hoje define a alma da região.",
            "Com a virada do milênio, uma nova geração assumiu, infundindo inovação e criando experiências memoráveis, como a icônica Virada Mágica. Hoje, nosso compromisso é mais profundo do que nunca: ser um oásis de conexão verdadeira em um mundo digital, valorizando a vida simples, o respeito ambiental e a arte de bem-receber."
        ]
    },
    principles: [
        {
            icon: <Target className="h-6 w-6 text-brand-dark-green" />,
            title: "Propósito",
            description: "Acrescentar valor à vida de todos que se conectam conosco, cultivando relações saudáveis, éticas e transparentes."
        },
        {
            icon: <HeartHandshake className="h-6 w-6 text-brand-dark-green" />,
            title: "Missão",
            description: "Receber e hospedar com qualidade, amor e dedicação, compartilhando bem-estar e renovação de energias junto à Natureza."
        },
        {
            icon: <Telescope className="h-6 w-6 text-brand-dark-green" />,
            title: "Visão",
            description: "Ser referência em experiências que proporcionam felicidade através da hospedagem e serviços em sintonia com o meio ambiente."
        }
    ],
    values: [
        {
            icon: <HeartHandshake className="w-5 h-5" />,
            title: "Bem-Estar & Gentileza",
            content: "Proporcionamos a renovação das energias em contato com a natureza. Atendemos com personalização, cortesia e empatia, demonstrando amor em cada detalhe da sua estadia."
        },
        {
            icon: <Leaf className="w-5 h-5" />,
            title: "Sustentabilidade & Ética",
            content: "Respeitamos e cuidamos do nosso ecossistema, agindo com responsabilidade socioambiental. Nossa base é a integridade, a justiça e a honestidade em todas as nossas ações."
        },
        {
            icon: <Users className="w-5 h-5" />,
            title: "Comprometimento & Cooperação",
            content: "Atuamos como uma família, com proatividade e paixão pelo que fazemos. Colaboramos uns com os outros, ouvindo, respeitando e contribuindo para uma melhoria contínua."
        }
    ]
};

export default function CulturaPage() {
    const router = useRouter();

    return (
        <div className="space-y-12">
            {/* --- Seção de Navegação e Título --- */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="flex-shrink-0" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                    <span className="sr-only">Voltar</span>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-brand-dark-green">Nossa Cultura</h1>
                    <p className="text-muted-foreground">Conheça a essência que nos move.</p>
                </div>
            </div>

            {/* --- Hero Section --- */}
            <div className="relative w-full h-64 rounded-lg overflow-hidden shadow-xl">
                <Image
                    src={pageData.hero.imageUrl}
                    alt="Paisagem da Fazenda do Rosa"
                    layout="fill"
                    objectFit="cover"
                    className="pointer-events-none"
                />
                <div className="absolute inset-0 bg-brand-dark-green/60 flex flex-col items-center justify-center text-center p-4">
                    <h2 className="text-4xl font-bold text-white tracking-tight leading-tight">{pageData.hero.title}</h2>
                    <p className="text-lg text-white/90 mt-2 max-w-md">{pageData.hero.subtitle}</p>
                </div>
            </div>

            {/* --- Seção de História --- */}
            <div className="bg-brand-light-green/30 p-8 rounded-lg shadow-sm">
                <h3 className="flex items-center gap-3 text-2xl font-semibold text-brand-dark-green mb-4">
                    <History className="w-7 h-7" />
                    {pageData.history.title}
                </h3>
                <div className="space-y-4 text-brand-dark-green/80 prose max-w-none">
                    {pageData.history.content.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                </div>
            </div>

            {/* --- Seção de Princípios (Propósito, Missão, Visão) --- */}
            <div className="grid md:grid-cols-3 gap-6 text-center">
                {pageData.principles.map((item) => (
                    <div key={item.title} className="p-6 bg-background rounded-lg border shadow-sm">
                        <div className="flex justify-center mb-3">{item.icon}</div>
                        <h4 className="text-xl font-semibold text-brand-dark-green">{item.title}</h4>
                        <p className="text-muted-foreground mt-1 text-sm">{item.description}</p>
                    </div>
                ))}
            </div>

            {/* --- Seção de Valores com Acordeão --- */}
            <div>
                <div className="text-center mb-6">
                    <h3 className="flex items-center justify-center gap-3 text-2xl font-semibold text-brand-dark-green">
                        <Waves className="w-7 h-7" />
                        Nossos Valores em Ação
                    </h3>
                    <p className="text-muted-foreground mt-1">Os pilares que guiam nosso dia a dia.</p>
                </div>
                <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
                    {pageData.values.map((value, index) => (
                        <AccordionItem key={value.title} value={`item-${index}`}>
                            <AccordionTrigger className="text-lg hover:no-underline">
                                <div className="flex items-center gap-3">
                                    <span className="text-brand-mid-green">{value.icon}</span>
                                    <span className="text-brand-dark-green">{value.title}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 text-base text-muted-foreground">
                                {value.content}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </div>
    );
}