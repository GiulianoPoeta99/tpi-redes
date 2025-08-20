# Requirements Document

## Introduction

Este documento define los requisitos para refactorizar la aplicación existente de transferencia de archivos hacia una implementación simple que cumple exactamente con la consigna universitaria. El proyecto actual tiene una implementación compleja con protocolos custom - necesitamos simplificarla para usar las capacidades nativas de TCP y UDP sin reimplementar funcionalidades que ya proporcionan estos protocolos, manteniendo la interfaz web existente pero simplificando el backend.

## Requirements

### Requirement 1

**User Story:** Como usuario, quiero una interfaz simple para seleccionar el modo de operación (Transmisor o Receptor), para poder enviar o recibir archivos según mi necesidad.

#### Acceptance Criteria

1. WHEN la aplicación inicia THEN el sistema SHALL mostrar una interfaz con opciones claras para Transmisor (Tx) y Receptor (Rx)
2. WHEN selecciono modo Transmisor THEN el sistema SHALL habilitar campos para IP remota, selección de archivo y configuración de protocolo
3. WHEN selecciono modo Receptor THEN el sistema SHALL deshabilitar campos de IP remota y selección de archivo, habilitando solo puerto y protocolo
4. WHEN cambio entre modos THEN el sistema SHALL limpiar configuraciones previas y resetear la interfaz

### Requirement 2

**User Story:** Como usuario, quiero configurar la dirección IP del nodo remoto y el puerto, para establecer comunicación con la máquina destino.

#### Acceptance Criteria

1. WHEN estoy en modo Transmisor THEN el sistema SHALL proporcionar un campo de entrada para la dirección IP del receptor
2. WHEN estoy en modo Transmisor THEN el sistema SHALL proporcionar un campo de entrada para el puerto del receptor
3. WHEN estoy en modo Receptor THEN el sistema SHALL proporcionar un campo de entrada para el puerto de escucha local
4. IF ingreso una IP inválida THEN el sistema SHALL mostrar error de validación y prevenir la transferencia
5. IF ingreso un puerto inválido (fuera del rango 1024-65535) THEN el sistema SHALL mostrar error de validación

### Requirement 3

**User Story:** Como usuario, quiero seleccionar un archivo local para transferir, para poder enviar el archivo deseado al nodo remoto.

#### Acceptance Criteria

1. WHEN estoy en modo Transmisor THEN el sistema SHALL mostrar un botón o área para seleccionar archivo
2. WHEN hago clic en seleccionar archivo THEN el sistema SHALL abrir un diálogo nativo del sistema operativo
3. WHEN selecciono un archivo THEN el sistema SHALL mostrar el nombre, tamaño y ruta del archivo seleccionado
4. IF el archivo no existe o no es accesible THEN el sistema SHALL mostrar mensaje de error
5. WHEN un archivo está seleccionado THEN el sistema SHALL habilitar el botón de iniciar transferencia

### Requirement 4

**User Story:** Como usuario, quiero elegir entre socket Stream (TCP) y Datagram (UDP), para usar el protocolo más apropiado según mis necesidades.

#### Acceptance Criteria

1. WHEN configuro la transferencia THEN el sistema SHALL proporcionar opciones claras para TCP y UDP
2. WHEN selecciono TCP THEN el sistema SHALL usar TcpStream/TcpListener de la librería estándar
3. WHEN selecciono UDP THEN el sistema SHALL usar UdpSocket de la librería estándar
4. WHEN uso TCP THEN el sistema SHALL aprovechar las garantías nativas de TCP (confiabilidad, orden, control de flujo)
5. WHEN uso UDP THEN el sistema SHALL implementar comportamiento fire-and-forget sin acknowledgments
6. WHEN la transferencia completa THEN el sistema SHALL mostrar estadísticas específicas del protocolo usado

### Requirement 5

**User Story:** Como usuario, quiero que el sistema calcule y verifique checksums automáticamente según la consigna, para asegurar la integridad de los archivos transferidos.

#### Acceptance Criteria

1. WHEN inicio una transferencia THEN el sistema SHALL calcular el hash SHA-256 del archivo original automáticamente
2. WHEN envío un archivo THEN el sistema SHALL guardar el checksum localmente como especifica la consigna
3. WHEN envío un archivo THEN el sistema SHALL enviar el checksum al receptor junto con el archivo original
4. WHEN el receptor recibe un archivo THEN el sistema SHALL calcular el hash del archivo recibido
5. WHEN el receptor tiene ambos checksums THEN el sistema SHALL compararlos automáticamente
6. WHEN los checksums coinciden THEN el sistema SHALL mostrar en pantalla "Transferencia exitosa" con verificación de integridad
7. WHEN los checksums no coinciden THEN el sistema SHALL mostrar en pantalla "Error de integridad" con ambos checksums
8. WHEN uso UDP THEN el sistema SHALL calcular checksums pero mostrar advertencia sobre posible pérdida de paquetes

### Requirement 6

**User Story:** Como usuario, quiero ver el progreso de la transferencia en tiempo real, para monitorear el estado y rendimiento de la operación.

#### Acceptance Criteria

1. WHEN una transferencia está activa THEN el sistema SHALL mostrar una barra de progreso con porcentaje completado
2. WHEN la transferencia progresa THEN el sistema SHALL mostrar velocidad actual en KB/s o MB/s
3. WHEN la transferencia progresa THEN el sistema SHALL mostrar tiempo estimado restante
4. WHEN la transferencia progresa THEN el sistema SHALL mostrar bytes transferidos vs total
5. WHEN la transferencia completa THEN el sistema SHALL mostrar resumen final con tiempo total y velocidad promedio
6. IF la transferencia falla THEN el sistema SHALL mostrar mensaje de error específico

### Requirement 7

**User Story:** Como usuario, quiero que el sistema funcione entre dos máquinas distintas en una red IP, para realizar transferencias reales entre computadoras diferentes.

#### Acceptance Criteria

1. WHEN configuro IP remota THEN el sistema SHALL validar que la IP sea alcanzable en la red
2. WHEN inicio transferencia TCP THEN el sistema SHALL establecer conexión con la máquina remota
3. WHEN inicio transferencia UDP THEN el sistema SHALL enviar paquetes a la máquina remota sin establecer conexión
4. IF la máquina remota no está disponible THEN TCP SHALL fallar con error de conexión
5. IF la máquina remota no está disponible THEN UDP SHALL completar normalmente (fire-and-forget)
6. WHEN la transferencia ocurre entre máquinas THEN el sistema SHALL mantener la funcionalidad completa

### Requirement 8

**User Story:** Como usuario, quiero una interfaz web simple y funcional según especifica la consigna, para poder usar la aplicación sin complejidad innecesaria.

#### Acceptance Criteria

1. WHEN accedo a la aplicación THEN el sistema SHALL mostrar una interfaz web simple y funcional (HTML/CSS/JS como especifica la consigna)
2. WHEN la interfaz carga THEN el sistema SHALL mostrar todos los controles requeridos por la consigna en una pantalla
3. WHEN selecciono modo Receptor (Rx) THEN el sistema SHALL deshabilitar controles de selección de archivo y dirección IP como especifica la consigna
4. WHEN selecciono modo Transmisor (Tx) THEN el sistema SHALL habilitar todos los controles necesarios
5. WHEN configuro parámetros THEN el sistema SHALL validar entradas en tiempo real
6. WHEN la transferencia completa THEN el sistema SHALL mostrar en pantalla el resultado de la verificación de integridad
7. IF hay errores de configuración THEN el sistema SHALL mostrar mensajes claros y específicos

### Requirement 9

**User Story:** Como desarrollador, quiero usar sockets nativos del lenguaje como especifica la consigna, eliminando implementaciones custom que están por encima de TCP/UDP base.

#### Acceptance Criteria

1. WHEN implemento sockets THEN el sistema SHALL usar sockets nativos de Rust (TcpStream, TcpListener, UdpSocket) como especifica la consigna
2. WHEN uso TCP THEN el sistema SHALL confiar completamente en las garantías nativas de TCP sin agregar handshakes custom
3. WHEN uso UDP THEN el sistema SHALL implementar verdadero fire-and-forget sin acknowledgments, sequence numbers o retransmisiones manuales
4. WHEN elimino protocolo custom THEN el sistema SHALL remover completamente los módulos de protocol_messages, ack_status, y handshakes complejos
5. WHEN simplifico TCP THEN el sistema SHALL usar directamente TcpStream::write_all() y read_exact() sin wrappers de protocolo
6. WHEN simplifico UDP THEN el sistema SHALL usar directamente UdpSocket::send_to() sin esperar confirmaciones
7. WHEN transfiero metadata THEN el sistema SHALL enviar solo información básica (filename, size, checksum) como primer mensaje simple
8. WHEN manejo errores de red THEN el sistema SHALL confiar en los errores nativos de TCP/UDP sin detectores custom de errores de red

### Requirement 10

**User Story:** Como desarrollador, quiero identificar y eliminar específicamente los módulos que implementan funcionalidades que ya proporcionan TCP/UDP nativamente, para simplificar la implementación.

#### Acceptance Criteria

1. WHEN elimino complejidad innecesaria THEN el sistema SHALL remover los módulos: protocol_messages.rs, ack_status.rs, y handshakes custom
2. WHEN elimino acknowledgments manuales THEN el sistema SHALL remover toda lógica de confirmación manual en UDP (confiar en fire-and-forget)
3. WHEN elimino sequence numbers THEN el sistema SHALL remover numeración manual de paquetes (TCP ya garantiza orden)
4. WHEN elimino control de flujo custom THEN el sistema SHALL confiar en el control de flujo nativo de TCP
5. WHEN elimino detección de errores custom THEN el sistema SHALL usar únicamente los errores que reportan TcpStream y UdpSocket
6. WHEN elimino retransmisiones manuales THEN el sistema SHALL confiar en las retransmisiones automáticas de TCP
7. WHEN elimino timeouts complejos THEN el sistema SHALL usar timeouts simples solo para operaciones de socket
8. WHEN elimino serialización compleja THEN el sistema SHALL usar JSON simple para metadata inicial únicamente

### Requirement 11

**User Story:** Como desarrollador, quiero mantener la arquitectura y funcionalidades existentes que ya funcionan bien, para no perder el trabajo ya realizado.

#### Acceptance Criteria

1. WHEN refactorizo THEN el sistema SHALL mantener la arquitectura Rust backend + Svelte/Tauri frontend
2. WHEN refactorizo THEN el sistema SHALL mantener la interfaz web existente con sus componentes
3. WHEN refactorizo THEN el sistema SHALL mantener el sistema de configuración y validación existente
4. WHEN refactorizo THEN el sistema SHALL mantener los tests unitarios adaptándolos a la nueva implementación
5. WHEN refactorizo THEN el sistema SHALL mantener el Docker lab para testing entre máquinas
6. WHEN refactorizo THEN el sistema SHALL mantener la CLI existente como interfaz alternativa
7. WHEN refactorizo THEN el sistema SHALL mantener el sistema de logging y eventos existente
8. WHEN refactorizo THEN el sistema SHALL mantener la estructura modular del código

### Requirement 12

**User Story:** Como desarrollador, quiero implementar la estructura general del sistema según especifica la consigna, para cumplir con los requisitos académicos.

#### Acceptance Criteria

1. WHEN implemento el módulo transmisor THEN el sistema SHALL conectarse a una IP remota, transmitir el archivo y su checksum
2. WHEN implemento el módulo receptor THEN el sistema SHALL escuchar en un puerto configurado, recibir el archivo, reconstruir el contenido, generar su propio checksum, comparar y validar
3. WHEN la aplicación ejecuta en modo Tx THEN el sistema SHALL habilitar funcionalidades de transmisor
4. WHEN la aplicación ejecuta en modo Rx THEN el sistema SHALL habilitar funcionalidades de receptor y deshabilitar controles de archivo y dirección IP
5. WHEN el sistema opera THEN el sistema SHALL poder ejecutarse entre dos máquinas distintas conectadas a una red IP como especifica la consigna
6. WHEN el receptor recibe un archivo THEN el sistema SHALL reconstruir el contenido, generar checksum propio, comparar con el recibido y mostrar resultado en pantalla
7. WHEN el sistema completa una transferencia THEN el sistema SHALL mostrar claramente si fue exitosa o si hubo errores de integridad

### Requirement 13

**User Story:** Como usuario, quiero funciones opcionales mencionadas en la consigna para mejorar la experiencia de uso, incluyendo barras de progreso, logs de actividad y soporte para múltiples archivos.

#### Acceptance Criteria

1. WHEN una transferencia está en progreso THEN el sistema SHALL mostrar barras de progreso de envío como función opcional de la consigna
2. WHEN el sistema opera THEN el sistema SHALL generar logs de actividad como función opcional de la consigna
3. WHEN selecciono archivos THEN el sistema SHOULD soportar transferencia de múltiples archivos como función opcional de la consigna
4. WHEN ocurren eventos importantes THEN el sistema SHALL registrar la actividad en logs visibles para el usuario
5. WHEN la transferencia progresa THEN el sistema SHALL actualizar la barra de progreso en tiempo real
6. WHEN hay errores o eventos THEN el sistema SHALL mostrar información relevante en los logs
7. WHEN el usuario necesita información THEN el sistema SHALL proporcionar logs claros de lo que está ocurriendo
8. WHEN transfiero múltiples archivos THEN el sistema SHOULD calcular checksums individuales para cada archivo

### Requirement 14

**User Story:** Como desarrollador, quiero que el código tenga documentación clara como especifica la consigna, para cumplir con los requisitos técnicos académicos.

#### Acceptance Criteria

1. WHEN escribo código THEN el sistema SHALL incluir documentación clara del código como requisito técnico de la consigna
2. WHEN implemento funciones THEN el sistema SHALL tener comentarios explicativos de las decisiones tomadas
3. WHEN refactorizo módulos THEN el sistema SHALL mantener documentación actualizada
4. WHEN completo la implementación THEN el sistema SHALL tener documentación que explique el diseño y funcionamiento
5. WHEN entrego el proyecto THEN el sistema SHALL incluir descripción de las decisiones tomadas como especifica la consigna

### Requirement 15

**User Story:** Como usuario, quiero entender claramente las diferencias entre TCP y UDP, para aprender sobre el comportamiento de cada protocolo.

#### Acceptance Criteria

1. WHEN uso TCP THEN el sistema SHALL mostrar "Estableciendo conexión..." antes de transferir
2. WHEN uso UDP THEN el sistema SHALL mostrar "Enviando paquetes..." inmediatamente
3. WHEN TCP falla por conexión THEN el sistema SHALL mostrar "Receptor no disponible"
4. WHEN UDP "falla" por receptor no disponible THEN el sistema SHALL mostrar "Paquetes enviados (sin garantía de entrega)"
5. WHEN TCP completa THEN el sistema SHALL mostrar "Transferencia confiable completada"
6. WHEN UDP completa THEN el sistema SHALL mostrar "Transferencia fire-and-forget completada"
7. WHEN comparo protocolos THEN el sistema SHALL mostrar estadísticas que demuestren las diferencias (tiempo de conexión, garantías, etc.)