# Guía de Compilación para Windows

Esta guía te ayudará a compilar el proyecto TPI Redes como un ejecutable `.exe` portable para Windows.

## Requisitos Previos

### Software Necesario

1. **Windows 10/11** (64-bit)
2. **Python 3.14** o superior
   - Descarga: https://www.python.org/downloads/
   - ⚠️ Durante la instalación, marca "Add Python to PATH"
3. **Node.js 18+** (LTS recomendado)
   - Descarga: https://nodejs.org/
4. **Git para Windows**
   - Descarga: https://git-scm.com/download/win
5. **Just** (task runner)
   - Instalación con Scoop: `scoop install just`
   - O con Cargo: `cargo install just`
   - O descargar binario: https://github.com/casey/just/releases
6. **uv** (Python package manager)
   - Instalación: `pip install uv`
7. **Visual Studio Build Tools** (opcional, para compilar extensiones)
   - Descarga: https://visualstudio.microsoft.com/downloads/
   - Selecciona "Build Tools for Visual Studio 2022"
   - Instala la carga de trabajo "Desktop development with C++"

## Preparación del Entorno

### 1. Clonar el Repositorio

```powershell
git clone <tu-repositorio>
cd tpi-redes
```

### 2. Instalar Dependencias del Backend

```powershell
cd backend
uv sync
# O usando scripts batch:
.\scripts\install.bat
cd ..
```

### 3. Instalar Dependencias del Frontend

```powershell
cd frontend
npm install
cd ..
```

## Preparar Assets para Windows

### Icono de la Aplicación

1. Crea o descarga un icono para tu aplicación
2. Convierte el icono a formato `.ico` con múltiples resoluciones (16x16, 32x32, 48x48, 256x256)
   - Herramientas online: https://convertio.co/es/png-ico/
   - O usa ImageMagick: `magick convert logo.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico`
3. Guarda el archivo como `frontend/public/icon.ico`

**Ver más detalles en:** `frontend/public/ICON_README.md`

### Instalador de Npcap

1. Descarga Npcap desde: https://npcap.com/#download
2. Guarda el instalador como `frontend/installers/npcap-installer.exe`

**Ver más detalles en:** `frontend/installers/README.md`

⚠️ **Nota sobre licencia:** Npcap es gratuito para uso educacional. Para distribución comercial, necesitas una licencia OEM.

## Proceso de Compilación

### Método 1: Compilación Completa (Recomendado)

Este método crea un ejecutable portable que incluye Python embebido.

#### Paso 1: Empaquetar Python

**En Windows:**

```powershell
cd backend
python scripts\embed_python.py
```

Este script:
- Descarga Python embeddable para Windows
- Instala todas las dependencias del proyecto
- Crea una estructura `.venv` que electron-builder puede empaquetar

⏱️ **Tiempo estimado:** 10-15 minutos (primera vez)

#### Paso 2: Compilar Frontend + Electron

```powershell
cd ..\frontend
npm run build:win
```

Este comando:
- Compila el código TypeScript de Electron
- Compila la aplicación React con Vite
- Empaqueta todo con electron-builder
- Crea el ejecutable portable

⏱️ **Tiempo estimado:** 5-10 minutos

#### Resultado

El ejecutable se encuentra en:
```
frontend/dist-release/TPI Redes File Transfer-0.0.0-x64-portable.exe
```

### Método 2: Compilación Rápida (Sin Python Embebido)

Si ya tienes Python instalado en el sistema de destino:

```powershell
cd frontend
npm run compile:electron
npm run build
electron-builder --win portable --config.extraResources=null
```

⚠️ **Advertencia:** Este ejecutable requiere que el usuario tenga Python 3.14+ instalado.

## Verificación

### Probar el Ejecutable

1. Copia el `.exe` a una carpeta limpia (sin el código fuente)
2. Ejecuta el `.exe` con doble clic
3. Si no tienes privilegios de administrador, acepta el prompt de UAC
4. La aplicación debería:
   - Iniciar sin errores
   - Mostrar la interfaz de Electron
   - Detectar si Npcap está instalado (si no, preguntará si quieres instalarlo)

### Probar Funcionalidades

1. **Transferencia TCP:**
   ```
   - Inicia un servidor en un puerto (ej: 8080)
   - Envía un archivo desde otro equipo o el mismo
   - Verifica que el archivo se recibe correctamente
   ```

2. **Captura de Paquetes (requiere Npcap):**
   ```
   - Activa el sniffer al iniciar servidor/cliente
   - Verifica que aparecen paquetes en la interfaz
   ```

3. **Descubrimiento de Red:**
   ```
   - Ejecuta "Scan Network"
   - Debería encontrar otros nodos en la red local
   ```

## Solución de Problemas

### Error: "Python not found"

**Problema:** El ejecutable no encuentra Python embebido.

**Solución:**
1. Verifica que ejecutaste `embed_python.py` correctamente
2. Verifica que existe `backend/.venv/` con Python dentro
3. Recompila con `npm run build:win`

### Error: "Npcap is not installed"

**Problema:** El sniffer no funciona porque falta Npcap.

**Solución:**
1. Instala Npcap manualmente desde https://npcap.com/
2. O permite que la aplicación lo instale automáticamente (requiere admin)

### Error: "Permission denied" al iniciar sniffer

**Problema:** Windows bloquea la captura de paquetes sin privilegios.

**Solución:**
1. Ejecuta el `.exe` como Administrador (clic derecho → "Run as administrator")
2. O configura el `.exe` para siempre pedir privilegios (ya está configurado)

### El ejecutable es muy grande (>200MB)

**Esto es normal.** El ejecutable incluye:
- Python 3.14 embebido (~50MB)
- Todas las dependencias de Python (~30MB)
- Electron runtime (~100MB)
- Tu aplicación (~20MB)

Para reducir el tamaño:
- Usa compresión UPX (arriesgado, puede ser detectado como virus)
- Usa método 2 (sin Python embebido)
- Distribuye como instalador en lugar de portable

### Antivirus bloquea el ejecutable

**Problema:** Windows Defender o antivirus marca el `.exe` como sospechoso.

**Solución:**
1. **Falso positivo común:** Electron y Python empaquetados suelen ser marcados
2. Añade excepción en Windows Defender
3. Para distribución real: Firma el ejecutable con certificado code signing

## Distribución

### Preparar para Distribución

1. **Renombra el ejecutable** a algo más descriptivo:
   ```powershell
   mv "TPI Redes File Transfer-0.0.0-x64-portable.exe" "TPI-Redes-Setup.exe"
   ```

2. **Crea un ZIP con:**
   - El ejecutable
   - `README.md` con instrucciones
   - Licencia (si aplica)

3. **Documentación para usuarios:**
   ```markdown
   # TPI Redes - Instalación

   ## Requisitos
   - Windows 10/11 (64-bit)
   - Privilegios de administrador (para captura de paquetes)
   - 500 MB de espacio en disco

   ## Instalación
   1. Descarga `TPI-Redes-Setup.exe`
   2. Ejecuta con doble clic
   3. Acepta el prompt de UAC (administrador)
   4. Si te pregunta por Npcap, acepta la instalación

   ## Uso
   Ver manual de usuario en docs/
   ```

### Firma Digital (Opcional)

Para evitar advertencias de Windows:

1. Obtén un certificado code signing (ej: de DigiCert, Sectigo)
2. Firma el ejecutable:
   ```powershell
   signtool sign /f certificado.pfx /p password /t http://timestamp.digicert.com TPI-Redes-Setup.exe
   ```

## Scripts de Automatización

### Build Script Completo

Crea `build-windows.bat`:

```batch
@echo off
echo ====================================
echo TPI Redes - Windows Build Script
echo ====================================

echo.
echo [1/4] Limpiando builds anteriores...
if exist backend\.venv.backup rmdir /s /q backend\.venv.backup
if exist frontend\dist-release rmdir /s /q frontend\dist-release

echo.
echo [2/4] Empaquetando Python...
cd backend
python scripts\embed_python.py
if %ERRORLEVEL% NEQ 0 (
    echo Error empaquetando Python!
    exit /b 1
)

echo.
echo [3/4] Compilando aplicación...
cd ..\frontend
call npm run build:win
if %ERRORLEVEL% NEQ 0 (
    echo Error compilando aplicación!
    exit /b 1
)

echo.
echo [4/4] Build completado!
echo.
echo Ejecutable: frontend\dist-release\
dir frontend\dist-release\*.exe
echo.
pause
```

Ejecuta: `.\build-windows.bat`

## Recursos Adicionales

- **Electron Builder docs:** https://www.electron.build/
- **Python embeddable:** https://docs.python.org/3/using/windows.html#the-embeddable-package
- **Npcap docs:** https://npcap.com/guide/
- **UAC y privilegios:** https://learn.microsoft.com/en-us/windows/security/application-security/application-control/user-account-control/

## Soporte

Para problemas específicos de Windows:
1. Revisa los logs en `frontend/dist-release/builder-debug.yml`
2. Ejecuta con `--verbose` para más información
3. Consulta issues en el repositorio del proyecto
