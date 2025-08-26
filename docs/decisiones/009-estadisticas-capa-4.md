# 009 - Estadísticas de Capa 4 (Transporte)

## Contexto
Para analizar el rendimiento de la red, es crucial medir métricas de transporte como el Throughput (Tasa de Transferencia) y el RTT (Round Trip Time).

## Decisión
Implementar cálculo de métricas en el cliente TCP y visualización en tiempo real.

### Estrategia
1.  **Backend (Python):**
    *   **Throughput:** Calcular `bytes_sent / time_elapsed` en intervalos regulares (ej: cada 1 segundo).
    *   **RTT (Estimación):** Dado que estamos sobre sockets de alto nivel, medir el RTT real (TCP Handshake) es difícil sin acceso raw.
        *   *Opción A:* Medir el tiempo de conexión (`connect()`).
        *   *Opción B:* Simular variaciones para fines educativos si el entorno es localhost (donde RTT es < 1ms).
        *   *Decisión:* Medir tiempo de `connect()` como RTT inicial y calcular Throughput real.

2.  **Eventos JSON:**
    *   Nuevo tipo de evento: `{"type": "STATS", "throughput": 102400, "rtt": 0.05, "progress": 45}`.

3.  **Frontend (React):**
    *   Componente `StatsPanel` con indicadores visuales (velocímetros o números grandes).

## Justificación
Provee feedback inmediato sobre la "salud" de la conexión y la velocidad real de transferencia, diferenciando entre velocidad teórica y real.
