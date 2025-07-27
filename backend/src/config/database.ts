import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Configuración del cliente Prisma
const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

// Event listeners para logging
prisma.$on('query', (e) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`Query: ${e.query}`);
    logger.debug(`Params: ${e.params}`);
    logger.debug(`Duration: ${e.duration}ms`);
  }
});

prisma.$on('error', (e) => {
  logger.error('Database error:', e);
});

prisma.$on('info', (e) => {
  logger.info('Database info:', e.message);
});

prisma.$on('warn', (e) => {
  logger.warn('Database warning:', e.message);
});

// Función para conectar a la base de datos
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('✅ Conexión a MySQL establecida exitosamente');
    
    // Verificar la conexión
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✅ Verificación de conexión MySQL exitosa');
    
  } catch (error) {
    logger.error('❌ Error conectando a MySQL:', error);
    throw error;
  }
}

// Función para desconectar de la base de datos
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('✅ Desconexión de MySQL exitosa');
  } catch (error) {
    logger.error('❌ Error desconectando de MySQL:', error);
    throw error;
  }
}

// Función para verificar el estado de la base de datos
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('❌ Health check de MySQL falló:', error);
    return false;
  }
}

export { prisma };
export default prisma;