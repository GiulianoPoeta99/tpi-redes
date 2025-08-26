# 008 - Visualizador de Ventana Deslizante

## Contexto
Para explicar el control de flujo en TCP, es fundamental visualizar cómo funciona la "Ventana Deslizante" (Sliding Window). El usuario necesita ver qué paquetes están enviados, cuáles están "en vuelo" (sin ACK), y cuáles están ya confirmados.

## Decisión
Implementar un sistema de **Eventos JSON** desde el Backend hacia el Frontend.

### Estrategia
1.  **Backend (Python):**
    *   Modificar `TCPClient` para emitir logs estructurados en formato JSON cuando cambia el estado de la ventana.
    *   Formato: `{"type": "WINDOW_UPDATE", "base": 10, "next_seq": 15, "window_size": 20}`.
    *   Estos logs se imprimirán en `stdout` mezclados con los logs de texto normales.

2.  **Frontend (Electron/React):**
    *   Interceptar los logs en `main.ts`.
    *   Si el log es un JSON válido con `type: WINDOW_UPDATE`, enviarlo a un canal IPC específico (`window-update`).
    *   Crear un componente `SlidingWindow` que escuche estos eventos y dibuje la ventana usando CSS Grid o Canvas.

## Justificación
Esta separación permite que el backend siga siendo una CLI estándar (los logs JSON son ignorados por humanos si no se usan) mientras que el frontend puede "reaccionar" a cambios de estado internos del protocolo sin acoplamiento fuerte.
