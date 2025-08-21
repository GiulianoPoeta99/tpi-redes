# 004 - Protocolo de Comunicación (Capa de Aplicación)

## Contexto
TCP garantiza la entrega ordenada de bytes, pero no define "mensajes". Para cumplir con la consigna de enviar **Archivo + Checksum** y permitir funcionalidades como la barra de progreso, necesitamos definir un protocolo propio por encima de TCP.

## Decisión
Implementar un protocolo binario con **Encabezado de Longitud Fija**.

### Estructura del Paquete
Cada transferencia comenzará con un encabezado binario de **tamaño fijo** seguido de los datos variables.

| Campo | Tamaño (Bytes) | Tipo | Descripción |
| :--- | :--- | :--- | :--- |
| **OpCode** | 1 | `char` | Tipo de operación (ej: 'F' para File, 'M' para Message). |
| **NameLen** | 2 | `unsigned short` | Longitud del nombre del archivo. |
| **FileSize** | 8 | `unsigned long long` | Tamaño total del archivo en bytes (soporta archivos > 4GB). |
| **HashLen** | 2 | `unsigned short` | Longitud del hash (ej: 64 bytes para SHA-256 hex). |
| **Reserved** | 3 | `bytes` | Relleno para alineación futura (padding). |

**Total Header Size:** 16 Bytes (Compacto y eficiente).

### Payload (Datos Variables)
Inmediatamente después de los 16 bytes del encabezado, se envían en orden:
1.  **Filename:** `NameLen` bytes (UTF-8).
2.  **Hash:** `HashLen` bytes (ASCII/UTF-8).
3.  **Content:** `FileSize` bytes (El contenido del archivo).

## Justificación
1.  **Cumplimiento de Consigna:** Permite separar limpiamente el Hash del Archivo, requisito obligatorio para la verificación de integridad.
2.  **Eficiencia:** Al usar `struct` de Python, el overhead es mínimo (16 bytes) comparado con enviar JSON o XML.
3.  **Robustez:** El receptor lee primero 16 bytes. Con eso sabe *exactamente* cuánto leer después, evitando problemas de buffer o "pegado" de paquetes.
