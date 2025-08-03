import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquareText } from 'lucide-react';

interface FeedbackItem {
    text: string;
    guestName: string;
    cabinName: string;
}

interface FeedbackListProps {
    feedbacks: Record<string, FeedbackItem[]>;
}

export const FeedbackList: React.FC<FeedbackListProps> = ({ feedbacks }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageSquareText /> Comentários</CardTitle>
            <CardDescription>Respostas abertas dos hóspedes, agrupadas por pergunta.</CardDescription>
        </CardHeader>
        <CardContent>
            {feedbacks && Object.keys(feedbacks).length > 0 ? (
                <div className="space-y-6 max-h-[350px] overflow-y-auto pr-2">
                    {Object.entries(feedbacks).map(([questionText, answers]) => (
                        <div key={questionText}>
                            <h4 className="font-semibold text-sm mb-2">{questionText}</h4>
                            <div className="space-y-3">
                                {answers.map((fb, index) => (
                                    <blockquote key={index} className="border-l-4 pl-4 py-2 bg-slate-50 rounded-r-md">
                                        <p className="italic">"{fb.text}"</p>
                                        <footer className="text-xs text-muted-foreground mt-1">- {fb.guestName} ({fb.cabinName})</footer>
                                    </blockquote>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-10">Nenhum comentário neste período.</p>
            )}
        </CardContent>
    </Card>
);