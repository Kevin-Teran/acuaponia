# Sistema SENA de Monitoreo Acuático

Sistema profesional de monitoreo en tiempo real para variables acuáticas en sistemas de acuaponía desarrollado para el SENA (Servicio Nacional de Aprendizaje).

## 🏗️ Arquitectura del Proyecto

```
sena-acuaponia-system/
├── frontend/                 # Aplicación React + TypeScript
│   ├── src/
│   │   ├── components/      # Componentes React
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # Servicios (API, Socket.IO)
│   │   ├── config/         # Configuraciones
│   │   └── types/          # Definiciones TypeScript
│   └── package.json
├── backend/                 # API Node.js + Express
│   ├── src/
│   │   ├── models/         # Modelos MongoDB
│   │   ├── routes/         # Rutas de la API
│   │   ├── middleware/     # Middlewares
│   │   ├── services/       # Servicios del backend
│   │   └── config/         # Configuraciones
│   └── package.json
└── package.json            # Scripts principales
```

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+ 
- MongoDB 6+
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

**Backend (.env):**
```bash
cp backend/.env.example backend/.env
# Editar backend/.env con tus configuraciones
```

**Frontend (.env):**
```bash
cp frontend/.env.example frontend/.env
# Editar frontend/.env con tus configuraciones
```

### 4. Iniciar MongoDB
```bash
# Usando Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# O usando instalación local
mongod
```

### 5. Ejecutar la aplicación

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

## 🔧 Tecnologías Utilizadas

### Frontend
- **React 18** - Biblioteca de UI
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Framework CSS
- **Chart.js** - Gráficos y visualizaciones
- **Socket.IO Client** - Comunicación en tiempo real
- **Axios** - Cliente HTTP
- **SweetAlert2** - Alertas y notificaciones

### Backend
- **Node.js** - Runtime de JavaScript
- **Express** - Framework web
- **TypeScript** - Tipado estático
- **MongoDB + Mongoose** - Base de datos
- **Socket.IO** - Comunicación en tiempo real
- **JWT** - Autenticación
- **bcryptjs** - Encriptación de contraseñas
- **Helmet** - Seguridad HTTP

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

### 🔐 Sistema de Autenticación
- Login con email/contraseña
- Roles: Administrador y Usuario
- JWT para autenticación
- Middleware de autorización

### 📡 Comunicación en Tiempo Real
- Socket.IO para datos de sensores
- Alertas críticas automáticas
- Actualizaciones de estado en vivo

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
npm start                  # Iniciar backend en producción

# Instalación
npm run install:all        # Instalar todas las dependencias
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
- `GET /api/sensors/:id/data` - Datos del sensor

### Datos
- `GET /api/data/historical` - Datos históricos
- `GET /api/data/statistics` - Estadísticas
- `GET /api/data/realtime` - Datos en tiempo real

## 🚀 Despliegue

### Desarrollo Local
```bash
npm run dev
```

### Producción
```bash
npm run build
npm start
```

### Docker (Próximamente)
```bash
docker-compose up -d
```

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 👥 Equipo de Desarrollo

Desarrollado para el **SENA (Servicio Nacional de Aprendizaje)** como parte del programa de formación en tecnologías IoT y sistemas de monitoreo acuático.

---

**© 2024 SENA - Todos los derechos reservados**