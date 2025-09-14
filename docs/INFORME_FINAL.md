# Informe Final: TPI Redes - Aplicación de Transferencia de Archivos

## 1. Introducción
Este proyecto es una aplicación educativa diseñada para ilustrar conceptos fundamentales de redes de computadoras, específicamente en la Capa de Transporte (Capa 4). Permite la transferencia de archivos entre clientes y servidores utilizando diferentes protocolos, verificando la integridad de los datos y proporcionando herramientas avanzadas de análisis de tráfico.

## 2. Arquitectura del Sistema
La aplicación sigue una arquitectura híbrida moderna que combina la robustez del procesamiento en bajo nivel con una interfaz de usuario interactiva.

*   **Backend (Lógica de Negocio):** Desarrollado en **Python**, se encarga de todo el manejo de sockets, protocolos de red (TCP/UDP), captura de paquetes y operaciones de sistema de archivos. Actúa como el motor de la aplicación.
*   **Frontend (Interfaz de Usuario):** Construido con tecnologías web (**React, TypeScript, Electron**), proporciona una experiencia visual rica. Se comunica con el Backend mediante entrada/salida estándar (stdio), enviando comandos y recibiendo eventos en tiempo real (JSON).

## 3. Estructura del Proyecto
El proyecto se organiza conceptualmente en tres grandes áreas:

*   **Backend:** Contiene toda la lógica de redes.
    *   *Networking:* Módulos para TCP, UDP, Sniffer y Proxy.
    *   *CLI:* Interfaz de línea de comandos que orquesta los servicios.
*   **Frontend:** Contiene la interfaz gráfica.
    *   *Componentes:* Vistas reutilizables (Dashboard, Paneles de Estadísticas).
    *   *Electron:* Capa de integración con el sistema operativo.
*   **Documentación:** Registro de decisiones de diseño y guías de uso.

## 4. Funcionalidades Implementadas

### 4.1. Transferencia Dual (TCP/UDP)
*   **TCP:** Implementado para garantizar fiabilidad. Utiliza un mecanismo de control de flujo y retransmisión automática. Ideal para archivos donde la integridad es crítica.
*   **UDP:** Implementado como un protocolo "Best Effort". Es más rápido pero no garantiza la entrega ni el orden.

### 4.2. Verificación de Integridad
Para asegurar que el archivo recibido es idéntico al enviado, se implementó un sistema de Hashing (SHA-256). Antes de enviar, se calcula la "huella digital" del archivo. Al recibirlo, se recalcula y compara. Si difieren en un solo bit, se alerta al usuario.

### 4.3. Analizador de Paquetes (Sniffer)
Se integró una herramienta de captura de tráfico en tiempo real "estilo Wireshark".
*   Permite inspeccionar las cabeceras de los paquetes (Flags SYN/ACK, Números de Secuencia).
*   Ofrece una vista de tabla con código de colores para identificar visualmente el inicio (Verde), fin (Rojo) y datos (Azul) de una conexión.

### 4.4. Visualización de Ventana Deslizante
Para explicar didácticamente cómo funciona el control de flujo en TCP, se creó un componente visual que muestra en tiempo real el tamaño de la ventana de recepción y los bytes "en vuelo", facilitando la comprensión de conceptos abstractos.

### 4.5. Estadísticas de Capa 4
Un panel en tiempo real muestra métricas críticas para cualquier administrador de red:
*   **RTT (Round Trip Time):** Tiempo que tarda un paquete en ir y volver.
*   **Throughput:** Velocidad real de transferencia en MB/s.

### 4.6. Simulación "Man-in-the-Middle" (MITM)
Una funcionalidad avanzada para probar la robustez del sistema. La aplicación puede actuar como un Proxy que intercepta el tráfico entre cliente y servidor.
*   Permite configurar una "Tasa de Corrupción" para alterar bits aleatorios en los paquetes.
*   Sirve para validar que el sistema de Verificación de Integridad detecte correctamente los errores inducidos.

### 4.7. Auto-Descubrimiento (UDP Broadcast)
Para mejorar la usabilidad, se implementó un sistema de descubrimiento automático. Los nodos envían un mensaje de difusión (Broadcast) a toda la red local preguntando "¿Quién está activo?". Los servidores responden, permitiendo al cliente encontrarlos sin necesidad de conocer sus direcciones IP previamente.

## 5. Conclusión
El proyecto cumple con el objetivo de demostrar no solo la transmisión de datos, sino toda la complejidad subyacente de las redes modernas: desde el establecimiento de conexión hasta la seguridad e integridad de la información.
