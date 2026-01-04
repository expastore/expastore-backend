# 🛍️ Expastore Backend

Backend completo para e-commerce con sistema de autenticación por PIN, integración con PayPal y gestión avanzada de productos.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Tecnologías](#tecnologías)
- [Requisitos Previos](#requisitos-previos)
- [Instalación Rápida](#instalación-rápida)
- [Instalación Manual](#instalación-manual)
- [Configuración](#configuración)
- [Scripts Disponibles](#scripts-disponibles)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Módulos](#módulos)
- [API Endpoints](#api-endpoints)
- [Testing](#testing)
- [Despliegue](#despliegue)

## ✨ Características

- ✅ **Autenticación sin contraseña** con sistema de PIN de 6 dígitos
- ✅ **Seguridad robusta** con JWT, rate limiting, helmet, xss protection
- ✅ **Device fingerprinting** para sesiones seguras por dispositivo
- ✅ **Base de datos PostgreSQL** con Sequelize ORM
- ✅ **Cache con Redis** para mejor rendimiento
- ✅ **Upload de imágenes** con Cloudinary
- ✅ **Pagos con PayPal** integrado
- ✅ **Sistema de logs** estructurado con Winston
- ✅ **Validación de datos** con Joi y express-validator
- ✅ **CORS configurado** para frontend
- ✅ **Compresión** de respuestas
- ✅ **Rate limiting** por IP y por ruta
- ✅ **Soft delete** en modelos

## 🚀 Tecnologías

- **Runtime:** Node.js >= 18.0.0
- **Framework:** Express.js 4.x
- **Base de Datos:** PostgreSQL 15+
- **ORM:** Sequelize 6.x
- **Cache:** Redis 7+
- **Autenticación:** JWT (jsonwebtoken)
- **Storage:** Cloudinary
- **Pagos:** PayPal SDK
- **Logs:** Winston
- **Validación:** Joi + express-validator
- **Testing:** Jest + Supertest
- **Linter:** ESLint + Prettier

## 📦 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** >= 18.0.0 ([Descargar](https://nodejs.org/))
- **PostgreSQL** >= 15 ([Descargar](https://www.postgresql.org/download/))
- **Redis** >= 7 (Opcional pero recomendado) ([Descargar](https://redis.io/download))
- **Git** ([Descargar](https://git-scm.com/))

### Verificar instalaciones

```bash
node --version   # Debe ser >= 18.0.0
npm --version    # Debe ser >= 9.0.0
psql --version   # PostgreSQL
redis-cli --version  # Redis (opcional)
```

## 🎯 Instalación Rápida

### Opción 1: Script Automático (Linux/Mac)

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/expastore-backend.git
cd expastore-backend

# 2. Dar permisos de ejecución al script
chmod +x setup.sh

# 3. Ejecutar script de instalación
./setup.sh

# 4. Editar variables de entorno
nano .env

# 5. Ejecutar migraciones
npm run db:migrate

# 6. (Opcional) Cargar datos de prueba
npm run db:seed

# 7. Iniciar servidor
npm run dev
```

### Opción 2: Instalación Manual

Ver [Instalación Manual](#instalación-manual) más abajo.

## 📝 Instalación Manual

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/expastore-backend.git
cd expastore-backend

# 2. Instalar dependencias
npm install

# 3. Copiar variables de entorno
cp .env.example .env

# 4. Editar .env con tus configuraciones
nano .env

# 5. Crear base de datos PostgreSQL
sudo -u postgres psql
CREATE DATABASE expastore_db;
CREATE USER expastore_user WITH PASSWORD 'tu_password';
GRANT ALL PRIVILEGES ON DATABASE expastore_db TO expastore_user;
\q

# 6. Ejecutar migraciones
npm run db:migrate

# 7. (Opcional) Cargar datos de prueba
npm run db:seed

# 8. Iniciar servidor
npm run dev
```

## ⚙️ Configuración

### Variables de Entorno Importantes

Edita el archivo `.env` con tus configuraciones:

```env
# Servidor
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001

# Base de datos
DB_HOST=localhost
DB_NAME=expastore_db
DB_USER=expastore_user
DB_PASSWORD=tu_password_seguro

# JWT (genera secretos con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=tu_secreto_jwt_aqui
JWT_REFRESH_SECRET=otro_secreto_para_refresh

# PayPal (obtén en https://developer.paypal.com/)
PAYPAL_CLIENT_ID=tu_client_id
PAYPAL_CLIENT_SECRET=tu_client_secret
PAYPAL_MODE=sandbox

# Email (configurar Gmail o SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=tu_email@gmail.com
EMAIL_PASSWORD=tu_app_password

# Cloudinary (registrarse en https://cloudinary.com/)
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

### Generar Secretos JWT

```bash
# Genera secretos seguros con Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 📜 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Inicia servidor con nodemon
npm start               # Inicia servidor en producción

# Base de Datos
npm run db:create       # Crear base de datos
npm run db:migrate      # Ejecutar migraciones
npm run db:migrate:undo # Deshacer última migración
npm run db:seed         # Cargar datos de prueba
npm run db:reset        # Resetear BD (undo all + migrate + seed)

# Testing
npm test                # Ejecutar tests
npm run test:watch      # Tests en modo watch

# Linting y Formato
npm run lint            # Verificar código
npm run lint:fix        # Corregir errores de lint
npm run format          # Formatear código con Prettier
```

## 📁 Estructura del Proyecto

```
expastore-backend/
│
├── src/
│   ├── config/              # Configuraciones (DB, Redis, etc.)
│   ├── middleware/          # Middlewares (auth, errors, etc.)
│   ├── models/              # Modelos de Sequelize
│   ├── migrations/          # Migraciones de BD
│   ├── seeders/            # Datos iniciales
│   ├── controllers/         # Controladores (lógica de rutas)
│   ├── services/           # Lógica de negocio
│   ├── routes/             # Definición de rutas
│   ├── utils/              # Utilidades (validators, helpers)
│   ├── jobs/               # Trabajos cron y workers
│   ├── tests/              # Tests unitarios e integración
│   ├── app.js              # Configuración Express
│   └── server.js           # Entry point
│
├── logs/                   # Archivos de logs
├── docs/                   # Documentación adicional
├── scripts/                # Scripts auxiliares
├── .env                    # Variables de entorno (NO SUBIR)
├── .env.example           # Ejemplo de variables
├── package.json           # Dependencias
└── README.md              # Este archivo
```

## 🔧 Módulos

### ✅ Módulo 1: Configuración Base (Completado)
- Express setup
- PostgreSQL + Sequelize
- Redis cache
- Winston logger
- Middleware de seguridad

### 🚧 Próximos Módulos (En desarrollo)

1. **Autenticación y Usuarios**
   - Registro con PIN
   - Login con PIN
   - Gestión de sesiones
   - Recuperación de cuenta

2. **Productos y Categorías**
   - CRUD productos
   - Categorías jerárquicas
   - Búsqueda y filtros
   - Gestión de stock

3. **Carrito de Compras**
   - Agregar/quitar productos
   - Calcular totales
   - Aplicar cupones

4. **Órdenes y Pagos**
   - Crear órdenes
   - Integración PayPal
   - Webhooks de pago
   - Estado de órdenes

5. **Sistema de Imágenes**
   - Upload a Cloudinary
   - Optimización automática
   - Galería de productos

## 🌐 API Endpoints

### Health Check
```
GET /health          # Estado del servidor
GET /                # Info de la API
```

### Módulos (Próximamente)
```
# Autenticación
POST /api/v1/auth/register
POST /api/v1/auth/activate
POST /api/v1/auth/login/request-pin
POST /api/v1/auth/login/verify-pin
POST /api/v1/auth/logout

# Usuarios (requiere autenticación)
GET    /api/v1/users/me
PATCH  /api/v1/users/me
DELETE /api/v1/users/me

# ... más endpoints según avancemos
```

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Tests con coverage
npm test -- --coverage

# Tests en modo watch
npm run test:watch

# Test específico
npm test -- auth.test.js
```

## 🚀 Despliegue

### Opciones Recomendadas

1. **Railway.app** - $5-20/mes (incluye PostgreSQL + Redis)
2. **Render.com** - $7-15/mes (tier gratuito disponible)
3. **Fly.io** - $5-10/mes
4. **DigitalOcean App Platform** - $12/mes

### Deploy en Railway.app

```bash
# 1. Instalar Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Inicializar proyecto
railway init

# 4. Agregar servicios
railway add postgresql
railway add redis

# 5. Deploy
railway up
```

### Variables de Entorno en Producción

Asegúrate de configurar:
- `NODE_ENV=production`
- `JWT_SECRET` (diferente al de desarrollo)
- Credenciales de base de datos
- Credenciales de PayPal (modo live)
- Resto de variables según `.env.example`

## 📚 Documentación Adicional

- [API Documentation](docs/API.md) - Documentación completa de la API
- [Database Schema](docs/DB_SCHEMA.md) - Esquema de base de datos
- [Deployment Guide](docs/DEPLOYMENT.md) - Guía detallada de despliegue

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

## 👥 Equipo

- **Desarrollador Principal:** Tu Nombre
- **Email:** tu@email.com
- **GitHub:** [@tu-usuario](https://github.com/tu-usuario)

## 🐛 Reportar Bugs

Si encuentras un bug, por favor abre un issue en GitHub con:
- Descripción del problema
- Pasos para reproducirlo
- Comportamiento esperado
- Screenshots (si aplica)

---

⭐ Si este proyecto te fue útil, ¡dale una estrella en GitHub!