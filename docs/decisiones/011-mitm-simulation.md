# 011 - Simulación de Man-in-the-Middle (MITM)

## Contexto
Para probar la robustez del protocolo (especialmente la verificación de integridad y el manejo de errores), necesitamos simular una red hostil donde los paquetes pueden corromperse o perderse.

## Decisión
Implementar un **Proxy MITM** que intercepte el tráfico TCP entre Cliente y Servidor.

### Estrategia
1.  **Arquitectura:**
    *   **Cliente:** Se conecta al Proxy (ej: puerto 8081).
    *   **Proxy:** Se conecta al Servidor Real (ej: puerto 8080).
    *   **Servidor:** Recibe datos del Proxy creyendo que es el Cliente.

2.  **Funcionalidad de Ataque:**
    *   **Bit Flipping:** Con una probabilidad `P` (ej: 1%), alterar un byte aleatorio en el payload.
    *   **Packet Drop:** Con una probabilidad `Q`, descartar el paquete (solo para UDP o para forzar retransmisión TCP si implementáramos TCP raw, pero con sockets de alto nivel TCP esto colgaría la conexión, así que nos enfocaremos en **Corrupción de Datos**).

3.  **Integración:**
    *   Nuevo comando CLI: `start-proxy --target-ip <IP> --target-port <PORT> --listen-port <PORT> --corruption-rate <0.0-1.0>`.
    *   Frontend: Nueva pestaña "MITM Attack" para configurar y lanzar el proxy.

## Justificación
Permite demostrar visualmente cómo el checksum detecta errores y cómo la aplicación maneja archivos corruptos sin necesidad de herramientas externas complejas.
