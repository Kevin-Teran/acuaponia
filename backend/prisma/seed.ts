// Asegúrate de tener esta referencia al inicio
/// <reference types="node" />

// Importación óptima para Prisma 6.x
import { PrismaClient } from '@prisma/client';
import type { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Solución para el tipado seguro
const prisma = new PrismaClient() as unknown as {
  user: {
    upsert: (params: {
      where: { email: string };
      update: {};
      create: {
        email: string;
        name: string;
        password: string;
        role: Role;
        status: string;
      };
    }) => Promise<any>;
  };
  $disconnect: () => Promise<void>;
};

async function main() {
  console.log('Iniciando el proceso de siembra...');

  const password = '123456';
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    // Creación del usuario Administrador
    const admin = await prisma.user.upsert({
      where: { email: 'admin@sena.edu.co' },
      update: {},
      create: {
        email: 'admin@sena.edu.co',
        name: 'Administrador',
        password: hashedPassword,
        role: 'ADMIN', // Usa el string directamente como alternativa
        status: 'ACTIVE',
      },
    });
    console.log(`✅ Administrador creado: ${admin.email}`);

    // Creación del usuario Normal
    const user = await prisma.user.upsert({
      where: { email: 'usuario@sena.edu.co' },
      update: {},
      create: {
        email: 'usuario@sena.edu.co',
        name: 'Usuario de Prueba',
        password: hashedPassword,
        role: 'USER', // Usa el string directamente
        status: 'ACTIVE',
      },
    });
    console.log(`✅ Usuario normal creado: ${user.email}`);

  } catch (error) {
    console.error('❌ Error en la siembra:', error);
    throw error;
  }
}

// Ejecución controlada
main()
  .catch((e) => {
    console.error('🔥 Error crítico:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 Conexión a Prisma cerrada');
  });