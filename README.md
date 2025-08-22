# Sistema de Acuaponía 🐟🌱

Sistema completo de monitoreo para acuaponía con backend NestJS y frontend Next.js, desarrollado siguiendo las mejores prácticas de documentación JSDoc.

## 🚀 Características Principales

### Backend (NestJS)
- **Autenticación JWT** con roles de usuario
- **Base de datos MySQL** con TypeORM
- **Documentación automática** con Swagger
- **Arquitectura modular** y escalable
- **Validación robusta** con class-validator
- **Documentación JSDoc completa**

### Frontend (Next.js)
- **Interfaz moderna** con Tailwind CSS
- **Componentes reutilizables** con TypeScript
- **Gráficos interactivos** con Recharts
- **Diseño responsivo** y accesible
- **Animaciones fluidas** y micro-interacciones

## 📋 Módulos del Sistema

1. **Dashboard** - Monitoreo en tiempo real con filtros avanzados
2. **Analytics** - Análisis detallado con sugerencias inteligentes
3. **Predicciones** - Predicciones basadas en IA y datos climáticos
4. **Asistente IA** - Chat inteligente para consultas y soporte
5. **Entrada de Datos** - Simulación de sensores para pruebas
6. **Reportes** - Generación de reportes manuales y automáticos
7. **Tanques y Sensores** - Configuración y gestión de equipos
8. **Usuarios** - Gestión de usuarios del sistema
9. **Configuración** - Ajustes generales del sistema

## 🛠️ Instalación y Configuración

### Prerrequisitos
- Node.js 18+ 
- MySQL 8.0+
- npm o yarn

### Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd acuaponia
```

2. **Instalar dependencias**
```bash
npm run install:all
```

3. **Configurar base de datos**
```bash
# Crear base de datos MySQL
mysql -u root -p
CREATE DATABASE acuaponia;
```

4. **Configurar variables de entorno**
```bash
# Backend
cp backend/.env.example backend/.env
# Editar backend/.env con tus configuraciones
```

5. **Ejecutar migraciones**
```bash
cd backend
npm run migration:run
```

### Desarrollo

**Ejecutar ambos servidores:**
```bash
npm run dev
```

**Ejecutar por separado:**
```bash
# Backend (Puerto 3001)
npm run backend:dev

# Frontend (Puerto 3000)  
npm run frontend:dev
```

## 📚 Documentación JSDoc

El proyecto incluye documentación JSDoc completa con:

### Funciones
```typescript
/**
 * Valida las credenciales de un usuario
 * @async
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Promise<User | null>} Usuario si las credenciales son válidas
 * @throws {UnauthorizedException} Si las credenciales son inválidas
 * @example
 * const user = await authService.validateUser('user@example.com', 'password123');
 */
```

### Clases
```typescript
/**
 * Servicio de autenticación
 * @class AuthService
 * @description Maneja la autenticación de usuarios y generación de tokens JWT
 */
```

### Tipos Personalizados
```typescript
/**
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Indica si la operación fue exitosa
 * @property {string} message - Mensaje descriptivo de la respuesta
 * @property {T} [data] - Datos de la respuesta (opcional)
 */
```

## 🗄️ Esquema de Base de Datos

### Tablas Principales
- **users** - Gestión de usuarios y autenticación
- **tanks** - Información de tanques de acuaponía
- **sensors** - Configuración de sensores IoT
- **sensor_data** - Datos históricos de sensores
- **alerts** - Sistema de alertas y notificaciones
- **reports** - Reportes generados del sistema

### Usuarios de Prueba
```sql
-- Administrador
Email: sena.acuaponia.admi@gmail.com
Password: 123456

-- Usuario Regular  
Email: usuario@sena.edu.co
Password: 123456
```

## 🔧 Scripts Disponibles

### Raíz del Proyecto
- `npm run dev` - Ejecutar ambos servidores en desarrollo
- `npm run build` - Construir ambos proyectos
- `npm run install:all` - Instalar todas las dependencias

### Backend
- `npm run start:dev` - Servidor de desarrollo
- `npm run build` - Construir para producción
- `npm run test` - Ejecutar pruebas

### Frontend
- `npm run dev` - Servidor de desarrollo
- `npm run build` - Construir para producción
- `npm run lint` - Linter de código

## 🌐 URLs del Sistema

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Documentación API**: http://localhost:3001/api

## 🏗️ Arquitectura del Proyecto

```
acuaponia/
├── backend/                 # API NestJS
│   ├── src/
│   │   ├── auth/           # Autenticación JWT
│   │   ├── users/          # Gestión de usuarios
│   │   ├── tanks/          # Gestión de tanques
│   │   ├── sensors/        # Gestión de sensores
│   │   ├── dashboard/      # Lógica del dashboard
│   │   ├── analytics/      # Análisis avanzado
│   │   ├── predictions/    # Predicciones IA
│   │   ├── reports/        # Generación de reportes
│   │   ├── entities/       # Entidades de base de datos
│   │   └── common/         # Utilidades compartidas
│   └── package.json
├── frontend/               # Aplicación Next.js
│   ├── app/
│   │   ├── dashboard/      # Página del dashboard
│   │   ├── analytics/      # Página de analytics
│   │   ├── predictions/    # Página de predicciones
│   │   └── ...            # Otros módulos
│   └── package.json
└── package.json           # Scripts principales
```

## 🤝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 👥 Equipo de Desarrollo

- **Desarrollador Senior** - Arquitectura y desarrollo principal
- **SENA** - Institución educativa patrocinadora

---

**Desarrollado con ❤️ para el futuro sostenible de la acuaponía**