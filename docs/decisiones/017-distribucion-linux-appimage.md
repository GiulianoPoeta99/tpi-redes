# 017 - Distribución Linux con AppImage

## Estado
Aceptado

## Contexto
Se requiere entregar la app sin instalación compleja para pruebas en múltiples PCs Linux.

## Decisión
Distribuir un artefacto **AppImage** para la arquitectura local de build (`x64` o `arm64`) incluyendo backend embebido.

## Implementación
- Build de backend standalone con PyInstaller (`onedir`).
- Empaquetado de Electron con `electron-builder` target `AppImage`.
- Inclusión del backend en `resources/backend` (`extraResources`).
- Script dedicado de build local por arquitectura.

## Justificación
- Un solo archivo ejecutable por plataforma objetivo.
- Reduce fricción de instalación para presentaciones/pruebas.

## Consecuencias
### Positivas
- Distribución simple en Linux.
- Mismo binario de app para pruebas repetidas.

### Negativas
- Artefacto pesado.
- Dependencias de host para funciones privilegiadas (sniffer/polkit/libpcap).
