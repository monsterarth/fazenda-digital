import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename || !request.body) {
    return NextResponse.json({ error: 'Nome do arquivo não fornecido.' }, { status: 400 });
  }

  // O Vercel Blob cria o blob e retorna seus detalhes, incluindo a URL final.
  const blob = await put(filename, request.body, {
    access: 'public',
  });

  return NextResponse.json(blob);
}