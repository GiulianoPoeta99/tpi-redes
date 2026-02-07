# 009 - Estadísticas de Capa 4 (Transporte)

## Estado
Aceptado

## Contexto
Se requieren métricas para observar rendimiento de envío/recepción y comportamiento de sesión.

## Decisión
Se priorizan métricas operativas y de sesión sobre estimaciones de RTT en tiempo real.

## Implementación actual
1.  **Dashboard lateral** con contadores globales:
    - paquetes enviados/recibidos,
    - bytes enviados/recibidos.
2.  **Stats modal de sesión** con:
    - throughput por archivo,
    - total de bytes,
    - duración agregada,
    - promedio y máximo por historial.
3.  Las métricas se actualizan por eventos de transferencia y estado UI.

## Justificación
- Son métricas robustas con bajo costo de instrumentación.
- Permiten comparar rendimiento entre transferencias reales.

## Consecuencias
### Positivas
- Datos consistentes para monitoreo de sesión.
- Integración simple con frontend y almacenamiento local.

### Negativas
- RTT no se reporta como métrica operativa continua.
- Throughput depende del timing de eventos a nivel aplicación.
