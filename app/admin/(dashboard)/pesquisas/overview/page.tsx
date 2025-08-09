"use client";

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function PesquisasOverviewPage() {
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Overview das Pesquisas</CardTitle>
          <CardDescription>Esta página exibirá os resultados e análises das pesquisas de satisfação.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}