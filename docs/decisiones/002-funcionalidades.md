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
Estas funcionalidades aprovechan la potencia de Python y el diseño de escritorio para destacar el proyecto.

### Nivel Redes y Transmisión (Avanzado)
1.  **Analizador de Tráfico (Packet Sniffer):**
    *   Integración con `scapy` para capturar y mostrar los paquetes en tiempo real.
    *   **Desglose de Cabeceras:** Visualización detallada de Flags (SYN, ACK, FIN), Números de Secuencia (Seq) y Confirmación (Ack).
2.  **Gráfico de Ventana Deslizante (Sliding Window Visualizer):**
    *   Representación gráfica en tiempo real de los bytes "en vuelo" (enviados vs confirmados).
    *   Ideal para visualizar el Control de Flujo de TCP.
3.  **Estadísticas de Capa 4 (Transporte):**
    *   Panel de métricas en vivo: **RTT** (Round Trip Time), **Jitter** (Variación del retardo), **Throughput** (Caudal efectivo) y conteo de **Retransmisiones**.
4.  **Simulación de "Man-in-the-Middle" (MITM):**
    *   Modo especial donde la app intercepta tráfico, permite modificar el payload al vuelo y retransmitirlo, demostrando la vulnerabilidad de protocolos no seguros y la importancia del checksum.
5.  **Auto-Descubrimiento (UDP Broadcast):**
    *   Funcionalidad "Escanear Red" que envía paquetes broadcast (`255.255.255.255`) para encontrar automáticamente otros nodos activos sin ingresar IPs manualmente.

### Nivel Aplicación / Seguridad
6.  **Cifrado E2E:**
    *   Encriptar el archivo con AES-256 antes de enviar y desencriptar al recibir.
7.  **Compresión al Vuelo:**
    *   Comprimir (gzip/lzma) el archivo antes de enviar.
