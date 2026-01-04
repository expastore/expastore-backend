#!/bin/bash

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes con colores
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Banner
echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║                                                   ║"
echo "║        🛍️  EXPASTORE BACKEND SETUP  🛍️           ║"
echo "║                                                   ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# 1. Verificar Node.js
print_info "Verificando Node.js..."
if ! command -v node &> /dev/null; then
    print_error "Node.js no está instalado. Por favor instala Node.js >= 18.0.0"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js versión muy antigua. Necesitas >= 18.0.0"
    exit 1
fi
print_success "Node.js $(node -v) detectado"

# 2. Verificar npm
print_info "Verificando npm..."
if ! command -v npm &> /dev/null; then
    print_error "npm no está instalado"
    exit 1
fi
print_success "npm $(npm -v) detectado"

# 3. Crear estructura de carpetas
print_info "Creando estructura de carpetas..."
mkdir -p src/{config,middleware,models,migrations,seeders,controllers,services,routes,utils/{validators,helpers,constants},uploads/{products,temp},public/images,jobs/{cron,workers},tests/{unit,integration}}
mkdir -p logs scripts docs
print_success "Estructura de carpetas creada"

# 4. Instalar dependencias
print_info "Instalando dependencias de producción..."
npm install --production=false

if [ $? -ne 0 ]; then
    print_error "Error instalando dependencias"
    exit 1
fi
print_success "Dependencias instaladas"

# 5. Copiar .env.example a .env
if [ ! -f .env ]; then
    print_info "Creando archivo .env..."
    cp .env.example .env
    print_success ".env creado desde .env.example"
    print_warning "⚠️  IMPORTANTE: Edita el archivo .env con tus configuraciones"
else
    print_warning ".env ya existe, no se sobrescribirá"
fi

# 6. Verificar PostgreSQL
print_info "Verificando PostgreSQL..."
if command -v psql &> /dev/null; then
    print_success "PostgreSQL detectado"
    
    read -p "¿Deseas crear la base de datos ahora? (s/n): " CREATE_DB
    if [ "$CREATE_DB" = "s" ] || [ "$CREATE_DB" = "S" ]; then
        read -p "Usuario de PostgreSQL [postgres]: " PG_USER
        PG_USER=${PG_USER:-postgres}
        
        read -p "Nombre de la base de datos [expastore_db]: " DB_NAME
        DB_NAME=${DB_NAME:-expastore_db}
        
        read -p "Usuario de la aplicación [expastore_user]: " APP_USER
        APP_USER=${APP_USER:-expastore_user}
        
        read -sp "Contraseña para $APP_USER: " APP_PASSWORD
        echo ""
        
        # Crear base de datos y usuario
        sudo -u $PG_USER psql << EOF
CREATE DATABASE $DB_NAME;
CREATE USER $APP_USER WITH PASSWORD '$APP_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $APP_USER;
ALTER DATABASE $DB_NAME OWNER TO $APP_USER;
\q
EOF
        
        if [ $? -eq 0 ]; then
            print_success "Base de datos creada correctamente"
            
            # Actualizar .env
            sed -i "s/DB_NAME=.*/DB_NAME=$DB_NAME/" .env
            sed -i "s/DB_USER=.*/DB_USER=$APP_USER/" .env
            sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$APP_PASSWORD/" .env
            print_success "Configuración de .env actualizada"
        else
            print_error "Error creando la base de datos"
        fi
    fi
else
    print_warning "PostgreSQL no detectado. Instálalo manualmente."
fi

# 7. Verificar Redis
print_info "Verificando Redis..."
if command -v redis-cli &> /dev/null; then
    if redis-cli ping > /dev/null 2>&1; then
        print_success "Redis está corriendo"
    else
        print_warning "Redis instalado pero no está corriendo"
        print_info "Inicia Redis con: sudo service redis-server start"
    fi
else
    print_warning "Redis no detectado. Instálalo para mejor rendimiento."
fi

# 8. Generar secretos JWT
print_info "Generando secretos JWT..."
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
COOKIE_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
sed -i "s/JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET/" .env
sed -i "s/COOKIE_SECRET=.*/COOKIE_SECRET=$COOKIE_SECRET/" .env
print_success "Secretos JWT generados y guardados en .env"

# 9. Crear carpeta de logs
print_info "Configurando carpeta de logs..."
mkdir -p logs
chmod 755 logs
print_success "Carpeta de logs configurada"

# 10. Resumen final
echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║                                                   ║"
echo "║           ✅  SETUP COMPLETADO  ✅                ║"
echo "║                                                   ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
print_info "PRÓXIMOS PASOS:"
echo ""
echo "1. Edita el archivo .env con tus configuraciones"
echo "2. Configura PostgreSQL si no lo hiciste"
echo "3. Configura Redis (opcional pero recomendado)"
echo "4. Ejecuta las migraciones: npm run db:migrate"
echo "5. (Opcional) Carga datos de prueba: npm run db:seed"
echo "6. Inicia el servidor: npm run dev"
echo ""
print_success "¡Listo para empezar a desarrollar!"
echo ""