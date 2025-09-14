# Guía de Pruebas Manuales (Manual Testing Guide)

Sigue estos pasos para verificar que todas las funcionalidades de la aplicación funcionan correctamente.

## 1. Preparación del Entorno
Asegúrate de haber instalado todas las dependencias:
```bash
just install
```

## 2. Pruebas de Backend (CLI)

### Test 1: Transferencia TCP (Fiable)
1.  **Iniciar Servidor:**
    ```bash
    just run-backend start-server --port 8080 --protocol tcp --save-dir received_files
    ```
2.  **Enviar Archivo (en otra terminal):**
    ```bash
    just run-backend send-file --file README.md --ip 127.0.0.1 --port 8080 --protocol tcp
    ```
3.  **Verificación:**
    *   Revisa que el servidor diga "File 'README.md' received successfully".
    *   Verifica que el archivo exista en `backend/received_files/README.md`.

### Test 2: Transferencia UDP (Rápida)
1.  **Iniciar Servidor:**
    ```bash
    just run-backend start-server --port 8080 --protocol udp --save-dir received_files
    ```
2.  **Enviar Archivo (en otra terminal):**
    ```bash
    just run-backend send-file --file README.md --ip 127.0.0.1 --port 8080 --protocol udp
    ```
3.  **Verificación:**
    *   Revisa los logs del servidor para confirmar la recepción ("Transfer complete").

### Test 3: Auto-Descubrimiento (Discovery)
1.  **Mantén el servidor corriendo** (TCP o UDP).
2.  **Ejecutar Escaneo:**
    ```bash
    just run-backend scan-network
    ```
3.  **Verificación:**
    *   Deberías ver una tabla con tu `Hostname`, `IP` y `Port 8080`.

### Test 4: Proxy MITM (Ataque)
1.  **Iniciar Proxy:**
    ```bash
    just run-backend start-proxy --listen-port 8081 --target-port 8080 --corruption-rate 0.1
    ```
2.  **Iniciar Servidor TCP** (Puerto 8080).
3.  **Enviar Archivo al Proxy (8081):**
    ```bash
    just run-backend send-file --file README.md --ip 127.0.0.1 --port 8081 --protocol tcp
    ```
4.  **Verificación:**
    *   El servidor recibirá el archivo pero debería mostrar un **ERROR DE INTEGRIDAD** (Hash Mismatch) debido a la corrupción de datos.

---

## 3. Pruebas de Frontend (Interfaz Gráfica)

### Inicio
Ejecuta la aplicación completa:
```bash
just run
```

### Test 5: Interfaz de Usuario & Transferencia
1.  Ve a la pestaña **Transfer**.
2.  Selecciona **Mode: Server**, Protocolo **TCP**, Puerto **8080**. Click en "Start Server".
3.  Abre otra instancia de la app (o usa la CLI) para enviar un archivo.
4.  Verifica que la barra de progreso avance y el log muestre "Transfer Complete".

### Test 6: Visualizador de Ventana Deslizante
1.  Durante una transferencia TCP, observa el gráfico en la derecha ("Sliding Window").
2.  Deberías ver barras que representan los paquetes en vuelo y cómo se mueve la ventana.

### Test 7: Packet Sniffer (Wireshark-style)
1.  En la pestaña **Transfer**, activa el switch **"Packet Sniffer"**.
2.  Realiza una transferencia.
3.  Ve a la pestaña **Packet Sniffer**.
4.  Cambia la vista a **"Table"**.
5.  Verifica que aparezcan filas de colores (Verde=Inicio, Rojo=Fin, Azul=Datos).

### Test 8: Auto-Descubrimiento (Botón UI)
1.  En **Transfer** (Modo Cliente), haz clic en el botón de la **Lupa** (Scan).
2.  Debería aparecer un dropdown con los servidores detectados en tu red local.
