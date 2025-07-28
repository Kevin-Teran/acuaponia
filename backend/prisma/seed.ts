import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Inicializar el cliente de Prisma
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando el proceso de siembra...');

  // Contraseña para ambos usuarios
  const password = '123456';
  const hashedPassword = await bcrypt.hash(password, 10);

  // --- Creación del usuario Administrador ---
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sena.edu.co' },
    update: {}, // No hacer nada si ya existe
    create: {
      email: 'admin@sena.edu.co',
      name: 'Administrador',
      password: hashedPassword,
      role: Role.ADMIN, // Usando el enum del schema
      status: 'ACTIVE',
    },
  });
  console.log(`Usuario Administrador creado/verificado: ${admin.email}`);

  // --- Creación del usuario Normal ---
  const user = await prisma.user.upsert({
    where: { email: 'usuario@sena.edu.co' },
    update: {}, // No hacer nada si ya existe
    create: {
      email: 'usuario@sena.edu.co',
      name: 'Usuario de Prueba',
      password: hashedPassword,
      role: Role.USER, // Usando el enum del schema
      status: 'ACTIVE',
    },
  });
  console.log(`Usuario Normal creado/verificado: ${user.email}`);

  console.log('¡Siembra completada exitosamente!');
}

// Ejecutar la función principal y manejar errores
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Cerrar la conexión a la base de datos
    await prisma.$disconnect();
  });
