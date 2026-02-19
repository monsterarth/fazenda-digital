import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface StateCardProps {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode; // Permite strings ou outros componentes, como <br/>
  children?: React.ReactNode; // Para adicionar botões ou outros elementos
}

export const StateCard: React.FC<StateCardProps> = ({ icon, title, description, children }) => {
  return (
    <Card className="text-center w-full max-w-2xl mx-auto border-2 shadow-lg">
      <CardHeader className="items-center p-6 md:p-8">
        <div className="bg-primary/10 rounded-full p-4 w-fit mb-4">
          {/* O ícone é renderizado aqui. A cor e tamanho são definidos no componente pai */}
          {icon}
        </div>
        <CardTitle className="text-2xl md:text-3xl font-bold">{title}</CardTitle>
        <CardDescription className="text-base text-muted-foreground mt-2 max-w-prose">
          {description}
        </CardDescription>
      </CardHeader>
      {children && (
        <CardContent className="p-6 pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  );
};