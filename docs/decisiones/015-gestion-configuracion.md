# 15. Gestión Centralizada de Configuración

Fecha: 2025-12-31

## Estado

Aceptado

## Contexto

El proyecto tenía valores de configuración hardcodeados (puertos, direcciones IP, tamaños de buffer, intervalos de reporte) dispersos en múltiples archivos tanto en el backend como en el frontend. Esto dificultaba:
1.  La mantenibilidad del código (DRY violations).
2.  La configuración de entornos (e.g., cambiar puertos para tests o despliegue).
3.  La consistencia entre frontend y backend.

## Decisión

Se decidió centralizar toda la configuración "mágica" y constantes en módulos dedicados:

### Backend
Crear un módulo `config.py` en `backend/src/tpi_redes/config.py` que exponga constantes.
Estas constantes priorizan las variables de entorno, permitiendo la configuración externa.

```python
# Ejemplo
DEFAULT_HOST = os.getenv("TPI_REDES_HOST", "127.0.0.1")
DEFAULT_SERVER_PORT = int(os.getenv("TPI_REDES_PORT", "8080"))
CHUNK_SIZE = 4096
```

### Frontend
Crear un archivo `constants.ts` en `frontend/src/config/constants.ts` para compartir valores por defecto y constantes de UI.

```typescript
// Ejemplo
export const DEFAULT_HOST = '127.0.0.1';
export const DEFAULT_SERVER_PORT = 8080;
export const CHUNK_SIZE = 4096;
```

## Consecuencias

### Positivas
*   **Mantenibilidad**: Cambiar un valor por defecto (e.g., puerto del servidor) ahora requiere cambiar una sola línea.
*   **Flexibilidad**: El backend ahora puede ser configurado vía variables de entorno sin tocar el código (`TPI_REDES_PORT=9090`).
*   **Legibilidad**: El código cliente (CLI, servicios, componentes UI) es más limpio al usar constantes semánticas en lugar de literales numéricos.

### Negativas
*   Requiere importar constantes adicionales en los archivos.
*   Se necesita disiplina para no reintroducir "números mágicos" en el futuro.
