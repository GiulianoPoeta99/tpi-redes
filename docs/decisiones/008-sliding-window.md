# 008 - Visualización de Flujo y Ventana

## Estado
Aceptado (ajustado en alcance)

## Contexto
Se buscó una visualización didáctica del control de flujo TCP tipo "sliding window".

## Decisión
Se conserva una arquitectura de eventos para visualización en frontend, con foco operativo en inspección de paquetes.

## Estado de implementación actual
- El frontend mantiene soporte para eventos `WINDOW_UPDATE`.
- La observabilidad activa se basa principalmente en `PACKET_CAPTURE` y logs de transferencia.
- La visualización de ventana queda como extensión compatible, no como fuente principal de telemetría.

## Justificación
- La tabla/inspección de paquetes aporta mayor valor práctico para depuración real.
- Mantener compatibilidad con `WINDOW_UPDATE` evita romper la UI existente.

## Consecuencias
### Positivas
- Menos complejidad en backend durante transferencias.
- Se prioriza información directamente observable en tráfico.

### Negativas
- La explicación formal de ventana TCP no está completamente automatizada en métricas dedicadas.
