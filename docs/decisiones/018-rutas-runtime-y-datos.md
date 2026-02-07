# 018 - Rutas de Runtime y Datos en HOME del Usuario

## Estado
Aceptado

## Contexto
Las rutas relativas y ejecución directa desde recursos empaquetados generan problemas en despliegues desktop (permisos, mount FUSE, portabilidad).

## Decisión
Usar rutas absolutas en HOME del usuario para datos y runtime:
- `~/.tpi-redes/received_files` para archivos recibidos.
- `~/.tpi-redes/backend-runtime` para backend ejecutable en producción.

## Implementación
- Backend: default `save-dir` configurable vía `TPI_REDES_HOME`/`TPI_REDES_SAVE_DIR`.
- Electron: copia backend desde `resources/backend` a runtime writable y ejecuta desde allí.
- UI de receptor: deja de enviar rutas relativas.

## Justificación
- Evita problemas de permisos y paths inconsistentes.
- Mantiene persistencia de datos en ubicación estable por usuario.

## Consecuencias
### Positivas
- Comportamiento consistente entre runs y equipos.
- Mejor compatibilidad en AppImage.

### Negativas
- Cambia la ubicación esperada para usuarios que buscaban archivos en directorio de ejecución.
