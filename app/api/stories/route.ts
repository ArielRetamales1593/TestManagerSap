import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const stories = await prisma.userStory.findMany({
      include: {
        testCases: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(stories);
  } catch (error) {
    return NextResponse.json({ error: 'Error cargando HUs' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sapCode, title, description, sapModule, sapTransaction, acceptanceCriteria } = body;

    const newStory = await prisma.userStory.create({
      data: {
        sapCode,
        title,
        description,
        sapModule,
        sapTransaction,
        acceptanceCriteria
      }
    });
    return NextResponse.json(newStory);
  } catch (error) {
    return NextResponse.json({ error: 'Error creando HU' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, sapCode, title, description, sapModule, sapTransaction, acceptanceCriteria } = body;

    const updated = await prisma.userStory.update({
      where: { id },
      data: {
        sapCode,
        title,
        description,
        sapModule,
        sapTransaction,
        acceptanceCriteria
      }
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Error actualizando HU' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 });

    await prisma.userStory.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error eliminando HU' }, { status: 500 });
  }
}