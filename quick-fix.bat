@echo off
echo ========================================
echo   EXPASTORE - SOLUCION RAPIDA
echo ========================================
echo.

REM Crear carpetas necesarias
echo Creando carpetas...
if not exist "logs" mkdir logs
if not exist "uploads" mkdir uploads
if not exist "uploads\products" mkdir uploads\products
if not exist "uploads\temp" mkdir uploads\temp
if not exist "public" mkdir public
if not exist "public\images" mkdir public\images
if not exist "src\models" mkdir src\models
if not exist "src\migrations" mkdir src\migrations
if not exist "src\seeders" mkdir src\seeders
if not exist "src\controllers" mkdir src\controllers
if not exist "src\services" mkdir src\services
if not exist "src\routes" mkdir src\routes
if not exist "src\jobs" mkdir src\jobs
if not exist "src\tests" mkdir src\tests
echo OK - Carpetas creadas
echo.

REM Verificar si existe .env
if not exist ".env" (
    echo Creando archivo .env...
    if exist ".env.minimal" (
        copy .env.minimal .env
        echo OK - .env creado desde .env.minimal
    ) else if exist ".env.example" (
        copy .env.example .env
        echo OK - .env creado desde .env.example
    ) else (
        echo ERROR - No se encontro .env.example ni .env.minimal
        echo Crea manualmente el archivo .env
    )
) else (
    echo OK - .env ya existe
)
echo.

REM Verificar node_modules
if not exist "node_modules" (
    echo Instalando dependencias...
    call pnpm install
) else (
    echo OK - node_modules ya existe
)
echo.

echo ========================================
echo   CONFIGURACION COMPLETADA
echo ========================================
echo.
echo PROXIMOS PASOS:
echo 1. Edita el archivo .env con tus datos de PostgreSQL
echo 2. Asegurate de que PostgreSQL este corriendo
echo 3. Ejecuta: pnpm run dev
echo.
pause