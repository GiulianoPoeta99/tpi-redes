# Npcap Installer

## ✅ Instalador Incluido

El instalador de Npcap (`npcap-installer.exe`) ya está incluido en este directorio para tu conveniencia.

### Información del Instalador

- **Archivo:** `npcap-installer.exe`
- **Versión:** Npcap 1.79
- **Tamaño:** ~1.2 MB
- **Fuente:** https://npcap.com/

### Si Necesitas Actualizar

Para actualizar a una versión más reciente:

1. **Visita el sitio oficial de Npcap:**
   https://npcap.com/#download

2. **Descarga la versión más reciente:**
   - Haz clic en "Download" para obtener la última versión
   - El archivo se llamará algo como `npcap-1.XX.exe`

3. **Reemplaza el instalador:**
   - Elimina el `npcap-installer.exe` actual de este directorio
   - Coloca el nuevo archivo descargado aquí
   - Renómbralo a `npcap-installer.exe`

### Versión recomendada

- **Npcap 1.79** o superior
- Tamaño aproximado: ~5 MB

### Licencia y Uso Legal

**IMPORTANTE:** Npcap tiene una licencia específica:

✅ **Uso PERMITIDO (sin costo):**
- Uso personal y privado
- Uso educacional (como este TPI)
- Investigación académica
- Evaluación y testing

❌ **Uso REQUIERE licencia OEM:**
- Distribución comercial
- Incluir en productos de software comercial
- Redistribución masiva

**Para este proyecto educacional (TPI):**
- ✅ El uso está permitido bajo la licencia gratuita
- ✅ Incluir el instalador en el repositorio para propósitos educacionales está permitido
- ✅ Distribuir el .exe entre compañeros/profesores para evaluación está permitido

**Si planeas distribuir comercialmente:**
1. Visita: https://npcap.com/oem/
2. Contacta a Npcap para obtener licencia OEM
3. Obtén el instalador OEM para bundle

**Referencias:**
- Licencia Npcap: https://github.com/nmap/npcap/blob/master/LICENSE
- OEM License: https://npcap.com/oem/

### Alternativa: Descarga automática

El código en `electron/npcap-installer.ts` intenta descargar Npcap automáticamente si no está bundled, pero es mejor incluirlo para instalación offline.

### Verificación

Antes de compilar, verifica:
```bash
ls -lh frontend/installers/npcap-installer.exe
```

Debe mostrar un archivo de ~5 MB.

## Instalación Interactiva

La aplicación lanzará el instalador de Npcap con su interfaz gráfica normal.

**Nota:** La instalación silenciosa (`/S`) solo está disponible en la versión OEM (comercial) de Npcap. Como usamos la versión gratuita, el usuario verá el asistente de instalación.

**Opciones recomendadas durante la instalación:**
- ✅ "Install Npcap in WinPcap API-compatible mode" - Para compatibilidad
- ✅ "Support loopback traffic capture" - Para captura en localhost
- ❌ "Restrict Npcap driver's access to Administrators only" - Dejar sin marcar para mejor compatibilidad

## Más información

- Documentación: https://npcap.com/guide/
- FAQ: https://npcap.com/faq.html
- GitHub: https://github.com/nmap/npcap
