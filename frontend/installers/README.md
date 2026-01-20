# Npcap Installer

## Descarga Requerida

Para el bundle de Windows, necesitas descargar el instalador de Npcap y colocarlo en este directorio.

### Pasos para obtener Npcap

1. **Visita el sitio oficial de Npcap:**
   https://npcap.com/#download

2. **Descarga la versión más reciente:**
   - Haz clic en "Download" para obtener la última versión
   - El archivo se llamará algo como `npcap-1.79.exe`

3. **Guarda el instalador:**
   - Coloca el archivo descargado en este directorio (`frontend/installers/`)
   - Renómbralo a `npcap-installer.exe`

### Versión recomendada

- **Npcap 1.79** o superior
- Tamaño aproximado: ~5 MB

### Licencia

**IMPORTANTE:** Npcap tiene una licencia específica:
- **Uso gratuito** para uso personal y educacional
- **Licencia OEM** requerida para distribución comercial

Para este proyecto educacional (TPI), puedes usar la versión gratuita.

Si planeas distribuir comercialmente:
1. Visita: https://npcap.com/oem/
2. Contacta a Npcap para obtener licencia OEM
3. Obtén el instalador OEM para bundle

### Alternativa: Descarga automática

El código en `electron/npcap-installer.ts` intenta descargar Npcap automáticamente si no está bundled, pero es mejor incluirlo para instalación offline.

### Verificación

Antes de compilar, verifica:
```bash
ls -lh frontend/installers/npcap-installer.exe
```

Debe mostrar un archivo de ~5 MB.

## Instalación silenciosa

El instalador se ejecutará con estos parámetros:
- `/winpcap_mode=yes` - Compatibilidad con WinPcap
- `/loopback_support=yes` - Soporte para captura en loopback
- `/admin_only=no` - Permitir uso sin admin (limitado)
- `/S` - Instalación silenciosa

## Más información

- Documentación: https://npcap.com/guide/
- FAQ: https://npcap.com/faq.html
- GitHub: https://github.com/nmap/npcap
