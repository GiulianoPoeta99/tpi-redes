# 015 - Gestión Centralizada de Configuración

## Estado
Aceptado

## Contexto
El proyecto tenía valores hardcodeados dispersos (host, puertos, buffers, rutas), dificultando mantenimiento y despliegue.

## Decisión
Centralizar configuración en módulos dedicados con soporte de variables de entorno.

### Backend
`backend/src/tpi_redes/config.py` define defaults para:
- host y puertos,
- tamaños de chunk/buffer,
- rutas de datos y recepción.

Variables destacadas:
- `TPI_REDES_HOST`
- `TPI_REDES_PORT`
- `TPI_REDES_PROXY_PORT`
- `TPI_REDES_HOME`
- `TPI_REDES_SAVE_DIR`

### Frontend
`frontend/src/config/constants.ts` centraliza valores por defecto usados por UI.

## Justificación
- Evita números/rutas mágicas repetidas.
- Permite adaptar entornos sin tocar código.
- Mejora consistencia entre backend y frontend.

## Consecuencias
### Positivas
- Cambios globales de configuración en un solo lugar.
- Mejor trazabilidad de defaults.
- Facilita empaquetado y ejecución cross-host.

### Negativas
- Hay que mantener sincronía semántica entre constantes de frontend y backend.
