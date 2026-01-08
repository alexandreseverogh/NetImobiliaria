/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server';
import { findTipoImovelById, updateTipoImovel, toggleTipoImovelStatus, deleteTipoImovel } from '@/lib/database/tipos-imoveis';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tipo = await findTipoImovelById(parseInt(params.id));

    if (!tipo) {
      return NextResponse.json({ error: 'Tipo de imóvel não encontrado' }, { status: 404 });
    }

    return NextResponse.json(tipo);
  } catch (error) {
    console.error('Erro ao buscar tipo de imóvel:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { nome, descricao, ativo } = await request.json();

    if (!nome) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const tipo = await updateTipoImovel(parseInt(params.id), { nome, descricao, ativo });

    if (!tipo) {
      return NextResponse.json({ error: 'Tipo de imóvel não encontrado' }, { status: 404 });
    }

    return NextResponse.json(tipo);
  } catch (error) {
    console.error('Erro ao atualizar tipo de imóvel:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { ativo } = await request.json();

    const tipo = await updateTipoImovel(parseInt(params.id), { ativo });

    if (!tipo) {
      return NextResponse.json({ error: 'Tipo de imóvel não encontrado' }, { status: 404 });
    }

    return NextResponse.json(tipo);
  } catch (error) {
    console.error('Erro ao alterar status do tipo de imóvel:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = await deleteTipoImovel(parseInt(params.id));

    if (!success) {
      return NextResponse.json({ error: 'Tipo de imóvel não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Tipo de imóvel excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir tipo de imóvel:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
