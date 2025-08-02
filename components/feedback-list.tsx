import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquareText } from 'lucide-react';

interface FeedbackListProps {
    feedbacks: { text: string; guestName: string; cabinName: string }[];
}

export const FeedbackList: React.FC<FeedbackListProps> = ({ feedbacks }) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><MessageSquareText /> Comentários</CardTitle>
            <CardDescription>Respostas abertas dos hóspedes.</CardDescription>
        </CardHeader>
        <CardContent>
            {feedbacks && feedbacks.length > 0 ? (
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                    {feedbacks.map((fb, index) => (
                        <blockquote key={index} className="border-l-4 pl-4 py-2 bg-slate-50 rounded-r-md">
                            <p className="italic">"{fb.text}"</p>
                            <footer className="text-xs text-muted-foreground mt-1">- {fb.guestName} ({fb.cabinName})</footer>
                        </blockquote>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-10">Nenhum comentário neste período.</p>
            )}
        </CardContent>
    </Card>
);