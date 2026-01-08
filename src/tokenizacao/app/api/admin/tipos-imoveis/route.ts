/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server';
import { findAllTiposImovel, createTipoImovel } from '@/lib/database/tipos-imoveis';
import { verifyTokenNode } from '@/lib/auth/jwt-node';

export async function GET(request: NextRequest) {
  try {
    const tipos = await findAllTiposImovel();
    return NextResponse.json(tipos);
  } catch (error) {
    console.error('Erro ao buscar tipos de imÃ³veis:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nome, descricao, ativo = true } = await request.json();

    if (!nome) {
      return NextResponse.json({ error: 'Nome Ã© obrigatÃ³rio' }, { status: 400 });
    }

    const tipo = await createTipoImovel({ nome, descricao, ativo });
    return NextResponse.json(tipo, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar tipo de imÃ³vel:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

