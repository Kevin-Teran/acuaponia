# Sistema SENA de Monitoreo Acuático - Full Stack

Sistema profesional de monitoreo en tiempo real para variables acuáticas en sistemas de acuaponía desarrollado para el SENA (Servicio Nacional de Aprendizaje). Arquitectura completa Frontend/Backend con MySQL y MQTT.

## 🏗️ Arquitectura del Proyecto

```
sena-acuaponia-system/
├── frontend/                 # Aplicación React + TypeScript + Vite
│   ├── src/
│   │   ├── components/      # Componentes React
│   │   ├── services/        # Servicios (API, Socket.IO)
│   │   ├── hooks/          # Custom hooks
│   │   ├── config/         # Configuraciones
│   │   └── types/          # Definiciones TypeScript
│   ├── Dockerfile          # Docker para frontend
│   └── package.json
├── backend/                 # API Node.js + Express + TypeScript
│   ├── src/
│   │   ├── config/         # Configuraciones (DB, etc.)
│   │   ├── routes/         # Rutas de la API
│   │   ├── middleware/     # Middlewares
│   │   ├── services/       # Servicios del backend
│   │   └── utils/          # Utilidades
│   ├── prisma/             # Esquema de base de datos
│   ├── Dockerfile          # Docker para backend
│   └── package.json
├── mqtt/                   # Configuración MQTT
│   └── config/
├── docker-compose.yml      # Orquestación de servicios
└── package.json            # Scripts principales
```

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+
- MySQL 8.0+
- Docker y Docker Compose (recomendado)
- Broker MQTT (Mosquitto)
- npm o yarn

### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd sena-acuaponia-system
```

### 2. Instalar dependencias
```bash
npm run install:all
```

### 3. Configurar variables de entorno

**Backend (backend/.env):**
```bash
cp backend/.env.example backend/.env
# Editar backend/.env con tus configuraciones
```

**Frontend (frontend/.env):**
```bash
cp frontend/.env.example frontend/.env
# Editar frontend/.env con tus configuraciones
```

### 4. Configurar Base de Datos
```bash
# Usando Docker Compose (recomendado)
docker-compose up -d mysql

# O usando MySQL local
mysql -u root -p
CREATE DATABASE sena_acuaponia;

# Ejecutar migraciones
cd backend
npx prisma migrate dev
npx prisma generate
```

### 5. Iniciar servicios con Docker
```bash
# Iniciar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f
```

### 6. Ejecutar en desarrollo (sin Docker)

**Desarrollo (Frontend + Backend):**
```bash
npm run dev
```

**Solo Frontend:**
```bash
npm run dev:frontend
```

**Solo Backend:**
```bash
npm run dev:backend
```

## 🔧 Stack Tecnológico

### Frontend
- **React 18** - Biblioteca de UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server
- **Tailwind CSS** - Framework CSS
- **Chart.js** - Gráficos y visualizaciones
- **Socket.IO Client** - Comunicación en tiempo real
- **Axios** - Cliente HTTP
- **SweetAlert2** - Alertas y notificaciones
- **Date-fns** - Manipulación de fechas

### Backend
- **Node.js** - Runtime de JavaScript
- **Express** - Framework web
- **TypeScript** - Tipado estático
- **MySQL + Prisma** - Base de datos y ORM
- **Socket.IO** - Comunicación en tiempo real
- **MQTT** - Protocolo IoT para sensores
- **JWT** - Autenticación
- **bcryptjs** - Encriptación de contraseñas
- **Helmet** - Seguridad HTTP
- **Winston** - Logging
- **Joi** - Validación de datos

### Infraestructura
- **MySQL 8.0** - Base de datos principal
- **Eclipse Mosquitto** - Broker MQTT
- **Redis** - Caché y sesiones
- **Docker** - Contenedorización
- **Nginx** - Proxy reverso y servidor web

## 📊 Funcionalidades

### 🎯 Módulos Principales

1. **Dashboard** - Monitoreo en tiempo real
2. **Reportes** - Generación y exportación de datos
3. **Predictivo** - Modelos de forecasting
4. **Recolección** - Ingreso manual de datos
5. **Análisis** - Estadísticas avanzadas
6. **Sensores** - Gestión de dispositivos IoT
7. **Usuarios** - Administración de usuarios
8. **Configuración** - Ajustes del sistema
9. **Alertas** - Sistema de notificaciones automáticas

### 🔐 Sistema de Autenticación
- Login con email/contraseña
- Roles: Administrador y Usuario
- JWT para autenticación
- Middleware de autorización

### 📡 Comunicación IoT y Tiempo Real
- Socket.IO para datos de sensores
- MQTT para comunicación con dispositivos IoT
- Alertas críticas automáticas
- Actualizaciones de estado en vivo

### 🗄️ Base de Datos
- MySQL con Prisma ORM
- Migraciones automáticas
- Relaciones optimizadas

### 🏭 Relaciones del Sistema
- **Sensores** → vinculados a **Tanques**
- **Tanques** → asignados a **Usuarios**
- **Datos** → almacenados por sensor y timestamp

## 🎨 Diseño y UX

### Colores Institucionales SENA
- **Naranja**: `#FF671F` (Primario)
- **Verde**: `#39A900` (Secundario)  
- **Azul**: `#007BBF` (Acento)

### Características de Diseño
- Tema claro/oscuro
- Diseño responsivo
- Velocímetros animados con rangos óptimos
- Gráficos interactivos
- Alertas con SweetAlert2

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev                 # Frontend + Backend
npm run dev:frontend        # Solo frontend
npm run dev:backend         # Solo backend

# Construcción
npm run build              # Build completo
npm run build:frontend     # Build frontend
npm run build:backend      # Build backend

# Producción
npm start                 # Iniciar backend en producción

# Docker
docker-compose up -d      # Iniciar todos los servicios
docker-compose down       # Detener servicios
docker-compose logs -f    # Ver logs en tiempo real

# Instalación
npm run install:all       # Instalar todas las dependencias

# Base de datos
cd backend
npx prisma migrate dev    # Ejecutar migraciones
npx prisma generate       # Generar cliente
npx prisma studio         # Interfaz web de DB
```

## 🌐 Endpoints de la API

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener usuario actual
- `POST /api/auth/refresh` - Renovar token

### Usuarios
- `GET /api/users` - Listar usuarios
- `POST /api/users` - Crear usuario
- `PUT /api/users/:id` - Actualizar usuario
- `PATCH /api/users/:id/toggle-status` - Cambiar estado

### Sensores
- `GET /api/sensors` - Listar sensores
- `POST /api/sensors` - Crear sensor
- `PUT /api/sensors/:id` - Actualizar sensor
- `GET /api/sensors/:id/data` - Datos del sensor

### Datos
- `GET /api/data/historical` - Datos históricos
- `GET /api/data/statistics` - Estadísticas
- `GET /api/data/realtime` - Datos en tiempo real

### Tanques
- `GET /api/tanks` - Listar tanques
- `POST /api/tanks` - Crear tanque
- `PUT /api/tanks/:id` - Actualizar tanque

### Alertas
- `GET /api/alerts` - Listar alertas
- `POST /api/alerts/:id/resolve` - Resolver alerta
- `GET /api/alerts/statistics` - Estadísticas de alertas

## 🚀 Despliegue

### Desarrollo Local
```bash
npm run dev
```

### Producción con Docker
```bash
# Construir y ejecutar
docker-compose -f docker-compose.prod.yml up -d

# Solo construir
npm run build
```

### Producción Manual
```bash
# Backend
cd backend
npm run build
npm start

# Frontend (servir con Nginx)
cd frontend
npm run build
# Servir carpeta dist/ con servidor web
```

## 🔧 Configuración MQTT

Los sensores IoT deben publicar datos en los siguientes topics:
- `sena/acuaponia/sensors/{sensor_id}/data` - Datos de sensores
- `sena/acuaponia/sensors/{sensor_id}/status` - Estado de sensores
- `sena/acuaponia/alerts` - Alertas del sistema

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 🧪 Testing

```bash
# Frontend
cd frontend && npm run test

# Backend
cd backend && npm run test
```

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 👥 Equipo de Desarrollo

Desarrollado para el **SENA (Servicio Nacional de Aprendizaje)** como parte del programa de formación en tecnologías IoT y sistemas de monitoreo acuático.

## 🔍 Monitoreo y Logs

- Logs del sistema en `backend/logs/`
- Métricas de rendimiento via Winston
- Health checks en `/health`
- Monitoreo de conexiones MQTT y Socket.IO

---

**© 2024 SENA - Todos los derechos reservados**