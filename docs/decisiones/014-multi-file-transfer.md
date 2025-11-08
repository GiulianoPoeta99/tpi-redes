# 014 - Estrategia de Transferencia Múltiple de Archivos

## Contexto
El requerimiento original contemplaba la transferencia de un único archivo. Sin embargo, para mejorar la utilidad de la aplicación, se decidió implementar la capacidad de seleccionar y enviar múltiples archivos en una sola sesión (Batch Transfer).

## Desafío
Implementar una transferencia secuencial o paralela de múltiples archivos manteniendo la estabilidad del protocolo y proporcionando feedback claro al usuario.

## Alternativas Consideradas

### 1. Conexiones Paralelas
- **Descripción**: Abrir un socket/hilo por cada archivo.
- **Pros**: Mayor velocidad teórica si el ancho de banda lo permite.
- **Contras**: Mayor complejidad de gestión de puertos, mayor carga en el SO, difícil de visualizar progreso unificado.

### 2. Concatenación de Archivos (Tar/Zip)
- **Descripción**: Empaquetar todo en un solo archivo temporal y enviarlo.
- **Pros**: Reutiliza la lógica de "un solo archivo".
- **Contras**: Overhead de compresión/descompresión, latencia inicial alta para grandes volúmenes, difícil reanudar parcialmente.

### 3. Transferencia Secuencial (Loop)
- **Descripción**: Enviar archivos uno tras otro reutilizando la misma lógica de conexión (TCP persistente o UDP loop).
- **Pros**: Feedback granular por archivo, menor sobrecarga de recursos, implementación robusta sobre protocolos existentes.
- **Contras**: Ligeramente más lento que paralelo por el handshake/overhead entre archivos (aunque mitigado con conexiones persistentes).

## Decisión
Se optó por la **Opción 3: Transferencia Secuencial**.

## Implementación
1.  **Backend**:
    -   TCP: Se modificó `TCPClient` y `TCPServer` para mantener el `socket` abierto y permitir múltiples ciclos de "Header -> Metadata -> Content".
    -   UDP: Se utiliza un bucle en el cliente que envía los archivos secuencialmente.
2.  **Frontend**:
    -   Se implementó una "Cola de Archivos" (`files[]`).
    -   UI con doble barra de progreso: **Progreso del Archivo Actual** (Círculo Interno) y **Progreso del Lote** (Círculo Externo).
    -   Manejo de Drag & Drop para agregar múltiples archivos.
3.  **Configuración**:
    -   Se agregó un selector de `Chunk Size` (Tamaño de Buffer) configurable (1KB - 64KB) para optimizar el rendimiento según la red.

## Beneficios
-   UX superior: El usuario ve qué archivo se está enviando y cuánto falta para terminar el lote.
-   Robustez: Si un archivo falla, se puede manejar el error específicamente.
-   Flexibilidad: Permite futuras mejoras como pausar/reaudar entre archivos.
