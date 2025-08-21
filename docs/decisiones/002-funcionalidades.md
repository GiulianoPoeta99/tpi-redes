# 002 - Funcionalidades del Proyecto

## 1. Funcionalidades Obligatorias (Core - 100% TP)
Estas funcionalidades son requeridas para aprobar el Trabajo Práctico según la consigna.

### Modo Receptor (Rx)
*   [ ] **Configuración de Puerto:** Permitir al usuario elegir el puerto de escucha.
*   [ ] **Selección de Protocolo:** Escuchar en TCP o UDP.
*   [ ] **Recepción de Archivo:** Recibir el flujo de bytes y reconstruir el archivo en disco.
*   [ ] **Verificación de Integridad:**
    *   Recibir el Hash (Checksum) enviado por el emisor.
    *   Calcular el Hash del archivo recibido localmente.
    *   Comparar ambos y mostrar "Éxito" o "Error de Integridad".

### Modo Transmisor (Tx)
*   [ ] **Selección de Archivo:** Explorador de archivos nativo para elegir qué enviar.
*   [ ] **Configuración de Destino:** Ingreso de IP y Puerto del receptor.
*   [ ] **Selección de Protocolo:** TCP o UDP.
*   [ ] **Cálculo de Hash:**
    *   Generar SHA-256 del archivo antes de enviar.
    *   **Guardar Hash Local:** Crear un archivo `.sha256` en el disco junto al original (Requisito explícito).
*   [ ] **Envío:** Transmitir el archivo y su hash al destino.

### Interfaz de Usuario (General)
*   [ ] **Switch de Modo:** Alternar claramente entre Tx y Rx.
    *   **Nota:** En modo Rx, los inputs de Archivo e IP deben deshabilitarse (Requisito explícito).
*   [ ] **Logs de Actividad:** Mostrar en pantalla qué está pasando ("Conectando...", "Enviando chunk 1/100...", "Finalizado").

---

## 2. Funcionalidades Extra (Valor Agregado)
Estas funcionalidades están orientadas a demostrar un dominio profundo de conceptos de Redes (Capa 4, Protocolos, Seguridad).

### Nivel Redes y Transmisión (Advanced)
1.  **Analizador de Tráfico (Packet Sniffer):**
    *   Captura en tiempo real con desglose detallado de cabeceras (Flags TCP, Números de Secuencia/Ack, Window Size).
    *   Visualización hexadecimal del payload.
2.  **Visualizador de Ventana Deslizante (Sliding Window):**
    *   Gráfico en tiempo real que muestre los bytes en vuelo, la ventana de recepción y los ACKs.
    *   Fundamental para explicar el Control de Flujo en TCP.
3.  **Estadísticas de Capa 4 (Transporte):**
    *   Panel de métricas en vivo: RTT (Round Trip Time), Jitter, Throughput real vs teórico, y conteo de retransmisiones.
4.  **Simulación de "Man-in-the-Middle" (MITM):**
    *   Modo especial donde la app actúa como proxy, permitiendo interceptar y modificar paquetes al vuelo (ej: Bit Flipping) para probar la robustez del receptor.
5.  **Auto-Descubrimiento (UDP Broadcast):**
    *   Botón "Escanear Red" que envía un broadcast UDP para encontrar otros nodos activos sin necesidad de ingresar IPs manualmente.
6.  **Inspección de Flujo estilo Wireshark:**
    *   Interfaz dedicada para ver la secuencia completa de la conversación (Handshake SYN/ACK, Transferencia, FIN) de forma legible y estructurada.
