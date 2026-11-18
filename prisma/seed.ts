import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const qaLead = await prisma.user.upsert({
    where: { email: 'qa.lead@empresa.cl' },
    update: {},
    create: {
      name: 'QA Lead Principal',
      email: 'qa.lead@empresa.cl',
      role: 'QA_LEAD',
      sapModule: 'ALL',
    },
  });

  const keyUserMM = await prisma.user.upsert({
    where: { email: 'comprador.mm@empresa.cl' },
    update: {},
    create: {
      name: 'Carlos Mendoza (Key User MM)',
      email: 'comprador.mm@empresa.cl',
      role: 'KEY_USER',
      sapModule: 'MM',
    },
  });

  const keyUserFI = await prisma.user.upsert({
    where: { email: 'analista.fi@empresa.cl' },
    update: {},
    create: {
      name: 'Elena Rojas (Key User FI)',
      email: 'analista.fi@empresa.cl',
      role: 'KEY_USER',
      sapModule: 'FI',
    },
  });

  const story1 = await prisma.userStory.upsert({
    where: { sapCode: 'HU-MM-014' },
    update: {},
    create: {
      sapCode: 'HU-MM-014',
      title: 'Estrategia de liberación de pedidos de compra nacionales',
      sapModule: 'MM',
      sapTransaction: 'ME21N',
      riskLevel: 'ALTO',
      description: 'Como comprador nacional, necesito que los pedidos sobre $10,000 USD activen bloqueo automático para requerir firma de gerencia.',
      acceptanceCriteria: '1. Pedidos <= $10,000 USD se liberan automáticamente.\n2. Pedidos > $10,000 USD activan pestaña Estrategia de Liberación con estado Bloqueado.\n3. No permite recepción MIGO mientras esté bloqueado.',
    },
  });

  await prisma.testCase.upsert({
    where: { code: 'CP-MM-014-01' },
    update: {},
    create: {
      code: 'CP-MM-014-01',
      userStoryId: story1.id,
      title: 'Verificar activación de bloqueo en pedido mayor a $10,000 USD',
      testType: 'POSITIVA',
      preconditions: 'Usuario con rol Z_MM_COMPRADOR activo. Proveedor 10045 habilitado en sociedad 1000. Material MAT-889 con precio $1,500 USD.',
      steps: '1. Ingresar a transacción ME21N.\n2. Seleccionar clase de pedido NB e ingresar proveedor 10045.\n3. Ingresar material MAT-889 con cantidad 10 (Total $15,000 USD).\n4. Presionar Verificar y luego Guardar.',
      expectedResult: 'El sistema emite mensaje "Pedido estándar grabado bajo el número 45000..." y muestra la pestaña Estrategia de Liberación con indicador de bloqueo activo.',
      governanceStatus: 'DRAFT',
    },
  });

  console.log('Seed ejecutado correctamente:', { qaLead, keyUserMM, keyUserFI });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
