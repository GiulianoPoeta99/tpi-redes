# Guía de Desarrollo en Windows

## Requisitos de Permisos en Windows

Para usar las funcionalidades de captura de paquetes en Windows, la aplicación necesita **privilegios de administrador**.

### ¿Por qué se necesitan privilegios de administrador?

- La captura de paquetes con Npcap/WinPcap requiere acceso de bajo nivel al adaptador de red
- Windows restringe este acceso solo a procesos con privilegios elevados
- Sin privilegios de administrador, el sniffer de paquetes estará deshabilitado

## Modo Desarrollo

### Opción 1: Ejecutar como Administrador (Recomendado)

Para habilitar todas las funcionalidades incluyendo captura de paquetes:

```powershell
# 1. Abre PowerShell como Administrador
# (Clic derecho en el icono de PowerShell → "Ejecutar como administrador")

# 2. Navega al directorio del proyecto
cd C:\ruta\a\tpi-redes

# 3. Instala dependencias (solo primera vez)
cd backend
pip install uv
uv sync
cd ../frontend
npm install

# 4. Ejecuta la aplicación
cd frontend
npm run dev:electron
```

### Opción 2: Ejecutar sin Privilegios (Funcionalidad Limitada)

Si no necesitas captura de paquetes, puedes ejecutar sin administrador:

```powershell
# Ejecutar normalmente
cd frontend
npm run dev:electron
```

**Limitaciones sin privilegios de administrador:**
- ❌ Packet Sniffer deshabilitado
- ❌ Visualización de paquetes en tiempo real no disponible
- ✅ Transferencia de archivos TCP/UDP funciona
- ✅ Verificación de integridad SHA-256 funciona
- ✅ Descubrimiento de red funciona
- ✅ Proxy MITM funciona (sin inspección de paquetes)

## Modo Producción (.exe)

Cuando compiles el ejecutable con `npm run build:win`, el archivo `.exe` resultante:

1. **Solicita automáticamente privilegios UAC al iniciar**
2. Windows mostrará diálogo: "¿Desea permitir que esta aplicación realice cambios?"
3. Si el usuario **acepta** → La app inicia con todos los privilegios necesarios
4. Si el usuario **rechaza** → La app no inicia

Esto está configurado en `package.json`:
```json
{
  "build": {
    "win": {
      "requestedExecutionLevel": "requireAdministrator"
    }
  }
}
```

## Verificar Privilegios de Administrador

Puedes verificar si tienes privilegios desde PowerShell:

```powershell
# Ejecutar este comando
([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

# Si retorna "True" → Tienes privilegios de admin
# Si retorna "False" → No tienes privilegios de admin
```

## Alternativa: Usar Acceso Directo con Privilegios Elevados

Para no tener que ejecutar manualmente como administrador cada vez:

### Crear un script de inicio:

1. Crea un archivo `start-dev-admin.bat`:
```batch
@echo off
cd /d "%~dp0"
cd frontend
npm run dev:electron
pause
```

2. Clic derecho en `start-dev-admin.bat` → **Crear acceso directo**

3. Clic derecho en el acceso directo → **Propiedades**

4. Clic en botón **Avanzadas...**

5. Marca la casilla **"Ejecutar como administrador"**

6. Ahora puedes hacer doble clic en el acceso directo y siempre pedirá UAC

## Instalación de Npcap

Si no tienes Npcap instalado:

1. La aplicación detectará automáticamente su ausencia
2. Te mostrará un diálogo ofreciendo instalarlo
3. Alternativamente, descárgalo de: https://npcap.com/

**Nota:** Npcap es gratuito para uso educacional.

## Problemas Comunes

### "Administrator privileges required for packet capture"

**Problema:** El sniffer muestra este error.

**Solución:** 
- Cierra la aplicación
- Ejecuta PowerShell como Administrador
- Vuelve a ejecutar `npm run dev:electron`

### "Npcap is not installed"

**Problema:** El sniffer no puede capturar paquetes.

**Solución:**
1. Instala Npcap desde https://npcap.com/
2. Durante la instalación, marca:
   - ✅ "Install Npcap in WinPcap API-compatible mode"
   - ✅ "Support loopback traffic"
3. Reinicia la aplicación

### "Port 8080 is already in use"

**Problema:** Otro proceso está usando el puerto.

**Solución:**
```powershell
# Ver qué proceso usa el puerto
netstat -ano | findstr :8080

# Matar el proceso (reemplaza PID con el ID del proceso)
taskkill /PID <PID> /F
```

### La app se cierra inmediatamente

**Problema:** Error durante el inicio.

**Solución:**
1. Ejecuta desde terminal para ver errores:
```powershell
cd frontend
npm run dev:electron
```
2. Lee los mensajes de error en la consola
3. Verifica que las dependencias estén instaladas

## Comparación: Desarrollo vs Producción

| Aspecto | Desarrollo | Producción (.exe) |
|---------|-----------|-------------------|
| **Solicitar permisos** | Manual (ejecutar como admin) | Automático (UAC al inicio) |
| **Npcap** | Debe estar instalado previamente | Puede instalarse desde la app |
| **Hot reload** | ✅ Sí (Vite) | ❌ No |
| **Tamaño** | ~50MB (node_modules) | ~150MB (Python embebido) |
| **Portabilidad** | Requiere Node.js y Python | Standalone (incluye todo) |

## Recursos Adicionales

- [Guía de compilación para Windows](WINDOWS_BUILD.md)
- [Documentación de Npcap](https://npcap.com/guide/)
- [UAC en Windows](https://learn.microsoft.com/en-us/windows/security/application-security/application-control/user-account-control/)
