# 🚀 File Transfer CLI - Sistema Completo

Un sistema robusto de transferencia de archivos punto a punto con soporte para TCP y UDP, incluyendo un laboratorio de pruebas completamente automatizado y libre de fallas.

## 📋 Tabla de Contenidos

- [🚀 Inicio Rápido](#-inicio-rápido)
- [🧪 Laboratorio de Pruebas](#-laboratorio-de-pruebas)
- [🌐 Uso del CLI](#-uso-del-cli)
- [🐳 Docker y Contenedores](#-docker-y-contenedores)
- [🧪 Testing y Validación](#-testing-y-validación)
- [🏗️ Arquitectura Técnica](#️-arquitectura-técnica)
- [🔧 Solución de Problemas](#-solución-de-problemas)
- [📚 Documentación Técnica](#-documentación-técnica)

## 🚀 Inicio Rápido

### Opción 1: Laboratorio Automatizado (Recomendado)
```bash
# Setup completo del laboratorio
cd backend
just lab-setup

# Ejecutar todas las pruebas
just lab-test

# Validación completa
just lab-validate
```

### Opción 2: Compilación Local
```bash
# Compilar en modo release
just build

# Prueba rápida local
# Terminal 1: Receptor
just run-receiver 8080

# Terminal 2: Emisor
echo "¡Hola mundo!" > test.txt
just run-sender test.txt 127.0.0.1:8080
```

## 🧪 Laboratorio de Pruebas

### 🎯 Características del Laboratorio Robusto

El laboratorio proporciona un entorno completamente aislado y libre de fallas para probar transferencias de archivos:

- **🛡️ Resistente a Fallas**: Health checks automáticos y retry logic
- **⚡ Setup Automático**: Configuración completa en un comando
- **🔍 Validación Automática**: Verificación de todos los componentes
- **📊 Monitoreo Detallado**: Estado y métricas en tiempo real
- **🔧 Troubleshooting Integrado**: Guías y herramientas de diagnóstico

### 🌐 Arquitectura de Red del Laboratorio
```
┌─────────────────┐    ┌──────────┐    ┌─────────────────┐
│   Machine A     │    │  Router  │    │   Machine B     │
│  172.20.0.10    │◄──►│172.20.0.2│◄──►│  172.21.0.10    │
│   Network A     │    │172.21.0.2│    │   Network B     │
│ 172.20.0.0/24   │    │          │    │ 172.21.0.0/24   │
└─────────────────┘    └──────────┘    └─────────────────┘
```

### 🔧 Comandos del Laboratorio

#### Setup y Gestión
```bash
just lab-setup              # Setup completo con validación
just lab-validate           # Validación comprehensiva
just lab-validate-quick     # Validación rápida
just lab-status             # Estado detallado
just lab-reset              # Reinicio completo
just lab-down               # Detener laboratorio
```

#### Testing Robusto
```bash
just lab-test               # Tests automáticos completos
just lab-health             # Verificación de salud rápida
```

#### Acceso y Monitoreo
```bash
just lab-shell-a            # Acceso a Machine A
just lab-shell-b            # Acceso a Machine B
just lab-logs               # Logs en tiempo real
just lab-logs-filtered      # Logs filtrados
just lab-interactive        # Sesión interactiva
```

#### Troubleshooting
```bash
just lab-troubleshoot       # Guía de solución de problemas
```

### 📋 Escenarios de Prueba en el Laboratorio

#### 🔄 TCP Confiable
```bash
# En Machine B (receptor)
ft-cli receive --port 8080 --protocol tcp --output /app/downloads

# En Machine A (emisor)  
ft-cli send --target 172.21.0.10 --port 8080 --protocol tcp /app/files/hello.txt
```

#### 🚀 UDP Fire-and-Forget
```bash
# En Machine A (receptor)
ft-cli receive --port 8081 --protocol udp --output /app/downloads --timeout 30

# En Machine B (emisor)
ft-cli send --target 172.20.0.10 --port 8081 --protocol udp /app/files/config.json
```

#### 🔄 Transferencia Bidireccional
```bash
# A → B: En B receptor, en A emisor
# B → A: En A receptor, en B emisor
```

### 📁 Archivos de Prueba Disponibles

- `hello.txt` - Archivo pequeño de texto (27 bytes)
- `config.json` - Archivo JSON de configuración (63 bytes)
- `medium-test.txt` - Archivo mediano estructurado (2.3KB)
- `large-test.bin` - Archivo binario para pruebas de rendimiento (50KB)

### 🔍 Validaciones Automáticas del Laboratorio

- ✅ Conectividad de red entre máquinas
- ✅ Disponibilidad del CLI en ambas máquinas
- ✅ Estado de contenedores Docker
- ✅ Configuración de rutas de red
- ✅ Funcionalidad del router
- ✅ Transferencia TCP básica
- ✅ Transferencia UDP fire-and-forget
- ✅ Transferencia bidireccional
- ✅ Manejo de errores
- ✅ Validación de integridad de archivos

## 📋 Comandos de Desarrollo

### Compilación y Testing
```bash
just build                  # Compilar release
just build-debug           # Compilar debug
just test-all              # Ejecutar todos los tests
just test-real             # Pruebas reales de transferencia
just test-udp              # Pruebas específicas UDP
just test-performance      # Tests de rendimiento
```

### Desarrollo Local
```bash
just dev                    # Mostrar ayuda del CLI
just run-receiver [puerto]  # Iniciar receptor
just run-sender <archivo> <destino>  # Enviar archivo
```

### Utilidades
```bash
just create-test-files     # Crear archivos de prueba
just clean-all             # Limpiar todo
just docs                  # Generar documentación
```

## 🌐 Uso del CLI

### 📖 Comandos Básicos

#### Información y Ayuda
```bash
# Mostrar ayuda general
./target/release/file-transfer-cli --help

# Mostrar versión
./target/release/file-transfer-cli --version

# Ayuda para comandos específicos
./target/release/file-transfer-cli send --help
./target/release/file-transfer-cli receive --help
```

#### Enviar Archivos

##### TCP (Confiable, por defecto)
```bash
# Envío básico TCP
./target/release/file-transfer-cli send --target 192.168.1.100 --port 8080 archivo.txt

# TCP con configuración personalizada
./target/release/file-transfer-cli send \
  --target 192.168.1.100 \
  --port 8080 \
  --protocol tcp \
  --chunk-size 16384 \
  --timeout 60 \
  archivo.txt
```

##### UDP (Fire-and-Forget)
```bash
# Envío básico UDP
./target/release/file-transfer-cli send --target 192.168.1.100 --port 8080 --protocol udp archivo.txt

# UDP con configuración personalizada
./target/release/file-transfer-cli send \
  --target 192.168.1.100 \
  --port 8080 \
  --protocol udp \
  --chunk-size 1024 \
  --timeout 30 \
  archivo.txt
```

#### Recibir Archivos

##### TCP (Confiable)
```bash
# Receptor TCP básico
./target/release/file-transfer-cli receive --port 8080 --output ./downloads/

# TCP con configuración personalizada
./target/release/file-transfer-cli receive \
  --protocol tcp \
  --port 8080 \
  --output ./downloads/ \
  --timeout 120
```

##### UDP (Fire-and-Forget)
```bash
# Receptor UDP básico
./target/release/file-transfer-cli receive --protocol udp --port 8080 --output ./downloads/

# UDP con timeout personalizado
./target/release/file-transfer-cli receive \
  --protocol udp \
  --port 8080 \
  --output ./downloads/ \
  --timeout 60
```

### 🔧 Opciones Avanzadas

#### Logging Detallado
```bash
# Verbose (información detallada)
./target/release/file-transfer-cli --verbose send --target 192.168.1.100 archivo.txt

# Debug (información completa de debugging)
./target/release/file-transfer-cli --debug send --target 192.168.1.100 archivo.txt
```

#### Gestión de Transferencias
```bash
# Ver transferencias activas
./target/release/file-transfer-cli list

# Cancelar transferencia específica
./target/release/file-transfer-cli cancel <transfer-id>

# Ejemplo con ID real
./target/release/file-transfer-cli cancel 550e8400-e29b-41d4-a716-446655440000
```

### 📊 Diferencias entre Protocolos

#### TCP (Transmission Control Protocol)
- **Conexión**: Establece conexión antes de transferir
- **Confiabilidad**: Acknowledgments y retransmisión automática
- **Chunk Size**: 8KB por defecto (configurable)
- **Detección de Errores**: Basada en conexión
- **Uso**: Archivos importantes donde la integridad es crítica

#### UDP (User Datagram Protocol - Fire-and-Forget)
- **Conexión**: Sin establecimiento de conexión
- **Confiabilidad**: Sin acknowledgments ni retransmisión
- **Chunk Size**: 1KB por defecto (optimizado para paquetes)
- **Detección de Errores**: Sin detección - paquetes pueden perderse
- **Uso**: Transferencias rápidas donde cierta pérdida es aceptable

### 🎯 Ejemplos de Flujo Completo

#### Ejemplo 1: Transferencia TCP Simple

**En la máquina receptora (192.168.1.100):**
```bash
./target/release/file-transfer-cli receive --port 8080 --output ./downloads/
```

**En la máquina emisora:**
```bash
./target/release/file-transfer-cli send --target 192.168.1.100 --port 8080 ./documento.pdf
```

#### Ejemplo 2: Transferencia UDP con Configuración Personalizada

**En la máquina receptora:**
```bash
./target/release/file-transfer-cli --verbose receive \
  --protocol udp \
  --port 9090 \
  --output ./received-files/ \
  --timeout 60
```

**En la máquina emisora:**
```bash
./target/release/file-transfer-cli --debug send \
  --target 192.168.1.100 \
  --port 9090 \
  --protocol udp \
  --chunk-size 1024 \
  --timeout 30 \
  ./video-grande.mp4
```

#### Ejemplo 3: Monitoreo y Gestión de Transferencias

**Terminal 1 - Iniciar transferencia larga:**
```bash
./target/release/file-transfer-cli --verbose send \
  --target 192.168.1.100 \
  --port 8080 \
  ./archivo-muy-grande.bin
```

**Terminal 2 - Monitorear y gestionar:**
```bash
# Verificar transferencias activas
./target/release/file-transfer-cli list

# Si es necesario, cancelar la transferencia
./target/release/file-transfer-cli cancel <transfer-id-from-list>
```

### 🚨 Códigos de Salida

El CLI usa códigos de salida específicos para diferentes tipos de errores:

- `0`: Éxito
- `1`: Fallo en operación de transferencia
- `2`: Error del sistema de archivos
- `3`: Argumento de comando inválido
- `4`: Error de configuración
- `5`: Fallo en inicialización de aplicación
- `6`: Fallo en operación IO
- `7`: Error de serialización JSON
- `8`: Error de runtime de aplicación

### ⚡ Consejos de Rendimiento

#### Para Archivos Grandes
```bash
# Usar chunks más grandes para mejor throughput
./target/release/file-transfer-cli send \
  --target 192.168.1.100 \
  --protocol tcp \
  --chunk-size 32768 \
  ./archivo-grande.bin
```

#### Para Redes Rápidas
```bash
# TCP con chunks grandes para transferencia confiable de alta velocidad
./target/release/file-transfer-cli send \
  --target 192.168.1.100 \
  --protocol tcp \
  --chunk-size 65536 \
  --timeout 120 \
  ./transferencia-alta-velocidad.bin
```

#### Para Redes No Confiables
```bash
# Usar chunks más pequeños y timeouts más largos
./target/release/file-transfer-cli send \
  --target 192.168.1.100 \
  --protocol tcp \
  --chunk-size 4096 \
  --timeout 60 \
  ./archivo-red-sensible.bin
```

## 🐳 Docker y Contenedores

### 🎯 Laboratorio Docker (Recomendado)

El laboratorio Docker proporciona un entorno completamente aislado con dos redes separadas:

```bash
# Setup completo del laboratorio (incluye Docker)
just lab-setup

# Ejecutar todas las pruebas del laboratorio
just lab-test

# Acceder a las máquinas del laboratorio
just lab-shell-a    # Machine A (172.20.0.10)
just lab-shell-b    # Machine B (172.21.0.10)
```

### 🔧 Docker Tradicional (Desarrollo)

#### Configuración Rápida
```bash
# Configuración automática completa
just docker-setup

# Ejecutar pruebas
just docker-test
```

#### Uso Manual
```bash
# Construir imagen
just docker-build

# Iniciar servicios (receptor TCP en 8080, UDP en 8081)
just docker-up

# Enviar archivo usando Docker
docker compose exec sender ft-cli send --target receiver --port 8080 /app/files/hello.txt

# Ver archivos recibidos
ls -la docker/volumes/tcp/
ls -la docker/volumes/udp/

# Detener servicios
just docker-down
```

### 📁 Estructura Docker

#### Laboratorio (Recomendado)
```
backend/
├── docker/
│   ├── compose-lab.yaml    # Laboratorio con redes aisladas
│   ├── Dockerfile.lab      # Imagen del laboratorio
│   └── volumes/lab/        # Volúmenes del laboratorio
│       ├── machine-a/      # Archivos de Machine A
│       └── machine-b/      # Archivos de Machine B
```

#### Docker Tradicional
```
backend/
├── compose.yaml            # Docker Compose tradicional
├── .dockerignore          # Docker ignore
└── docker/
    ├── Dockerfile         # Imagen del CLI
    └── volumes/           # Volúmenes generados
        ├── tcp/           # Descargas TCP
        └── udp/           # Descargas UDP
```

### 🌐 Arquitectura del Laboratorio Docker

El laboratorio crea un entorno de red realista:

```
Docker Host
├── Network A (172.20.0.0/24)
│   └── Machine A (172.20.0.10)
├── Network B (172.21.0.0/24)
│   └── Machine B (172.21.0.10)
└── Router (172.20.0.2 ↔ 172.21.0.2)
```

### 🔍 Comandos Docker Útiles

#### Monitoreo del Laboratorio
```bash
# Estado de contenedores del laboratorio
just lab-status

# Logs del laboratorio
just lab-logs

# Logs filtrados
just lab-logs-filtered
```

#### Debugging Docker
```bash
# Ver contenedores activos
docker ps

# Logs de un contenedor específico
docker logs ft-machine-a
docker logs ft-machine-b
docker logs ft-router

# Inspeccionar redes
docker network ls
docker network inspect docker_network-a
docker network inspect docker_network-b
```

#### Limpieza Docker
```bash
# Limpiar laboratorio
just lab-down

# Limpiar Docker tradicional
just docker-down

# Limpieza completa
just clean-all
```

## 🧪 Testing y Validación

### 🎯 Testing del Laboratorio (Recomendado)

El laboratorio incluye un sistema completo de testing automatizado:

```bash
# Validación completa del laboratorio
just lab-validate

# Tests automáticos completos
just lab-test

# Validación rápida (sin tests funcionales)
just lab-validate-quick

# Health check rápido
just lab-health
```

#### Tests Incluidos en el Laboratorio
- ✅ **TCP File Transfer**: Transferencia TCP básica
- ✅ **UDP Fire-and-Forget**: Transferencia UDP sin acknowledgments
- ✅ **Bidirectional Transfer**: Transferencias en ambas direcciones
- ✅ **Error Handling**: Manejo correcto de errores
- ✅ **Network Connectivity**: Conectividad entre redes aisladas
- ✅ **CLI Availability**: Disponibilidad del CLI en ambas máquinas

### 🔧 Tests de Desarrollo

#### Tests Automatizados
```bash
# Tests unitarios e integración
just test-all

# Tests reales con transferencias
just test-real

# Tests específicos UDP
just test-udp

# Tests de rendimiento
just test-performance
```

#### Estructura de Tests
```
tests/
├── integration_tests.rs              # Tests de integración
├── cli_integration_tests.rs          # Tests del CLI
├── test_error_handling.rs            # Tests de manejo de errores
├── tcp_integration_test.rs           # Tests TCP específicos
├── udp_fire_and_forget_test.rs       # Tests UDP específicos
├── communication_flow_e2e_test.rs    # Tests end-to-end
└── test_types.rs                     # Tests de tipos
```

### 🌐 Tests Manuales

#### Encontrar tu IP
```bash
# Linux/macOS
ip addr show | grep "inet " | grep -v 127.0.0.1
# Resultado ejemplo: 192.168.1.105

# Windows
ipconfig | findstr "IPv4"
```

#### Prueba entre Máquinas Reales

**Máquina A (Receptor):**
```bash
./target/release/file-transfer-cli receive --port 8080 --output ./downloads/
```

**Máquina B (Emisor):**
```bash
./target/release/file-transfer-cli send --target 192.168.1.105 --port 8080 archivo.txt
```

#### Casos de Prueba Progresivos

##### 1. Archivo Pequeño (< 1KB)
```bash
echo "Test pequeño" > small.txt
just run-sender small.txt 127.0.0.1:8080
```

##### 2. Archivo Mediano (100KB)
```bash
dd if=/dev/zero of=medium.txt bs=1024 count=100
just run-sender medium.txt 127.0.0.1:8080
```

##### 3. Archivo Grande (10MB) - Performance
```bash
dd if=/dev/zero of=large.txt bs=1024 count=10240
just run-sender large.txt 127.0.0.1:8080
```

##### 4. Archivo Binario Real
```bash
# Usar un archivo existente del sistema
just run-sender /bin/ls 127.0.0.1:8080
```

### 📊 Tests de Rendimiento

#### Configuraciones de Rendimiento
```bash
# Red local rápida
--protocol tcp --chunk-size 65536 --timeout 300

# Red no confiable
--protocol udp --chunk-size 4096 --timeout 60

# Transferencia local
--protocol tcp --chunk-size 32768
```

#### Medición de Rendimiento
```bash
# Test de throughput TCP vs UDP
just test-performance

# Medición manual con time
time ./target/release/file-transfer-cli send --target IP archivo-grande.bin
```

### 🔍 Validación de Integridad

#### Verificación de Checksums
```bash
# Generar checksum del archivo original
sha256sum archivo-original.txt

# Generar checksum del archivo recibido
sha256sum downloads/archivo-original.txt

# Deben ser idénticos para TCP
# Pueden diferir para UDP (fire-and-forget)
```

#### Comparación de Archivos
```bash
# Comparación binaria exacta
diff archivo-original.txt downloads/archivo-original.txt

# Comparación con detalles
cmp -l archivo-original.txt downloads/archivo-original.txt
```

### 🚨 Tests de Manejo de Errores

#### Escenarios de Error Comunes
```bash
# 1. Archivo no existe
./target/release/file-transfer-cli send --target IP /archivo/inexistente.txt

# 2. Receptor no disponible (TCP debería fallar)
./target/release/file-transfer-cli send --target IP --port 9999 archivo.txt

# 3. UDP fire-and-forget (debería funcionar sin receptor)
./target/release/file-transfer-cli send --target IP --port 9999 --protocol udp archivo.txt

# 4. Timeout de red
./target/release/file-transfer-cli send --target IP --timeout 1 archivo.txt
```

### 📋 Checklist de Testing

#### Antes de Release
- [ ] `just test-all` pasa todos los tests
- [ ] `just lab-validate` pasa validación completa
- [ ] Tests manuales TCP funcionan
- [ ] Tests manuales UDP funcionan
- [ ] Tests de error handling funcionan
- [ ] Tests de rendimiento son aceptables
- [ ] Documentación actualizada

#### Testing Continuo
```bash
# Desarrollo continuo con auto-testing
cargo watch -x check -x test -x run

# Testing específico durante desarrollo
cargo test --test integration_tests
cargo test --test udp_fire_and_forget_test
```

## 🔧 Solución de Problemas

### 🚨 Problemas del Laboratorio

#### 1. "Docker not available"
```bash
# Verificar Docker
docker --version
docker info

# Si no está instalado
# Ubuntu/Debian: sudo apt install docker.io
# macOS: brew install docker
# Windows: Descargar Docker Desktop
```

#### 2. "Containers not starting"
```bash
# Reinicio completo del laboratorio
just lab-down
just lab-setup

# Ver logs detallados
just lab-logs-filtered

# Verificar estado
just lab-status
```

#### 3. "Network connectivity failed"
```bash
# Verificar estado del laboratorio
just lab-status

# Validación completa
just lab-validate

# Reinicio de red
just lab-reset
```

#### 4. "Lab validation failed"
```bash
# Troubleshooting automático
just lab-troubleshoot

# Validación paso a paso
just lab-validate-quick  # Sin tests funcionales
just lab-health         # Solo health checks
```

### 🌐 Problemas de Red y Conectividad

#### "Connection refused" (TCP)
```bash
# Verificar que el receptor esté corriendo
netstat -tulpn | grep 8080

# Verificar IP y puerto correctos
ping 192.168.1.100

# Revisar firewall
# Linux: sudo ufw allow 8080
# Windows: Configurar Windows Firewall
# macOS: Configurar Firewall en Preferencias del Sistema
```

#### "UDP transfer appears incomplete"
```bash
# Esto es normal para UDP (fire-and-forget)
# UDP no garantiza entrega
# Para transferencias confiables, usar TCP

# Verificar si se recibió algo
ls -la downloads/

# UDP debería crear archivos con timestamp
# Ejemplo: received_file_20250905_180045.bin
```

#### Problemas de Conectividad de Red
```bash
# Verificar conectividad básica
ping <target-ip>

# Verificar puerto específico
telnet <target-ip> 8080

# Verificar rutas de red
traceroute <target-ip>

# Verificar DNS (si usas nombres)
nslookup <hostname>
```

### 📁 Problemas de Archivos y Permisos

#### "File does not exist"
```bash
# Verificar archivo existe
ls -la archivo.txt

# Verificar permisos de lectura
ls -la archivo.txt
# Debe mostrar permisos de lectura (r)

# Usar ruta absoluta
./target/release/file-transfer-cli send --target IP /ruta/completa/archivo.txt

# Verificar directorio actual
pwd
```

#### "Permission denied" (Receptor)
```bash
# Crear directorio con permisos correctos
mkdir -p downloads
chmod 755 downloads

# Verificar permisos del directorio padre
ls -la ./

# Verificar espacio en disco
df -h ./downloads/
```

#### "Output directory not writable"
```bash
# Verificar permisos del directorio de salida
ls -ld downloads/

# Cambiar permisos si es necesario
chmod 755 downloads/

# Crear directorio si no existe
mkdir -p downloads/
```

### 🔧 Problemas de Compilación y Desarrollo

#### Errores de Compilación
```bash
# Limpiar y recompilar
cargo clean
cargo build --release

# Verificar versión de Rust
rustc --version
# Requiere Rust 1.70+

# Actualizar Rust si es necesario
rustup update
```

#### Dependencias Faltantes
```bash
# Actualizar dependencias
cargo update

# Verificar Cargo.toml
cat Cargo.toml

# Reinstalar dependencias
rm Cargo.lock
cargo build
```

### 🐛 Debugging Avanzado

#### Logging Detallado
```bash
# Verbose (información detallada)
./target/release/file-transfer-cli --verbose send --target IP archivo.txt

# Debug (información completa)
./target/release/file-transfer-cli --debug send --target IP archivo.txt

# Logs del sistema (Linux)
journalctl -f | grep file-transfer
```

#### Monitoreo de Red
```bash
# Monitorear conexiones activas
netstat -an | grep 8080

# Monitorear tráfico de red (requiere permisos)
sudo tcpdump -i any port 8080

# Ver transferencias activas del CLI
./target/release/file-transfer-cli list
```

#### Análisis de Rendimiento
```bash
# Medir tiempo de transferencia
time ./target/release/file-transfer-cli send --target IP archivo.txt

# Monitorear uso de CPU y memoria
top -p $(pgrep file-transfer-cli)

# Análisis de red con iftop (Linux)
sudo iftop -i eth0
```

### 🔍 Diagnóstico Paso a Paso

#### Para Problemas TCP
1. **Verificar conectividad básica**: `ping <target>`
2. **Verificar puerto**: `telnet <target> <port>`
3. **Iniciar receptor**: `ft-cli receive --port 8080`
4. **Verificar receptor activo**: `netstat -tulpn | grep 8080`
5. **Enviar archivo**: `ft-cli send --target <ip> --port 8080 archivo.txt`
6. **Verificar logs**: `--debug` en ambos lados

#### Para Problemas UDP
1. **Recordar que UDP es fire-and-forget**
2. **Iniciar receptor UDP**: `ft-cli receive --protocol udp --port 8080`
3. **Enviar con UDP**: `ft-cli send --protocol udp --target <ip> archivo.txt`
4. **Verificar archivos recibidos**: `ls downloads/`
5. **UDP puede funcionar sin receptor activo**

### 📋 Checklist de Troubleshooting

#### Antes de Reportar un Bug
- [ ] Probé con el laboratorio (`just lab-test`)
- [ ] Verifiqué conectividad de red básica
- [ ] Probé con archivos diferentes (pequeño/grande)
- [ ] Probé ambos protocolos (TCP/UDP)
- [ ] Revisé logs con `--debug`
- [ ] Verifiqué permisos de archivos y directorios
- [ ] Probé en red local antes que remota

#### Información para Reportes
```bash
# Información del sistema
uname -a
./target/release/file-transfer-cli --version

# Información de red
ip addr show
netstat -rn

# Logs con debug
./target/release/file-transfer-cli --debug send ... > debug.log 2>&1
```

### 🆘 Comandos de Emergencia

#### Reset Completo
```bash
# Limpiar todo y empezar de nuevo
just clean-all
just lab-down
docker system prune -f
just lab-setup
```

#### Verificación Rápida
```bash
# Verificar que todo funciona
just lab-validate-quick
```

#### Acceso Directo al Laboratorio
```bash
# Si el CLI no funciona, acceder directamente
just lab-shell-a
just lab-shell-b
```

## 🏗️ Arquitectura Técnica

### 🌐 Protocolos Soportados

#### TCP (Transmission Control Protocol)
- **Tipo**: Protocolo confiable orientado a conexión
- **Características**:
  - Establecimiento de conexión (3-way handshake)
  - Acknowledgments automáticos
  - Retransmisión de paquetes perdidos
  - Control de flujo integrado
  - Detección y corrección de errores
- **Chunk Size**: 8KB por defecto (configurable)
- **Uso Recomendado**: Archivos importantes donde la integridad es crítica
- **Overhead**: Menor para archivos grandes debido a la eficiencia del protocolo

#### UDP (User Datagram Protocol - Fire-and-Forget)
- **Tipo**: Protocolo no confiable sin conexión
- **Características**:
  - Sin establecimiento de conexión
  - Sin acknowledgments
  - Sin retransmisión automática
  - Sin control de flujo
  - Fire-and-forget (enviar y olvidar)
- **Chunk Size**: 1KB por defecto (optimizado para evitar fragmentación)
- **Uso Recomendado**: Transferencias rápidas donde cierta pérdida es aceptable
- **Overhead**: Mínimo, ideal para transferencias de alta velocidad

### 🔧 Estructura del Código

```
src/
├── main.rs                          # Punto de entrada del CLI
├── lib.rs                           # Biblioteca principal
├── cli/                             # Interfaz de línea de comandos
│   ├── mod.rs
│   ├── args.rs                      # Parsing de argumentos
│   └── commands.rs                  # Implementación de comandos
├── config/                          # Configuración del sistema
│   ├── mod.rs
│   └── settings.rs                  # Configuraciones globales
├── core/                            # Lógica central del negocio
│   ├── mod.rs
│   └── transfer/                    # Gestión de transferencias
│       ├── mod.rs
│       ├── transfer_executor.rs     # Ejecutor principal
│       ├── communication_manager.rs # Gestión de comunicación
│       └── progress_tracker.rs      # Seguimiento de progreso
├── network/                         # Implementaciones de red
│   ├── mod.rs
│   ├── tcp/                         # Implementación TCP
│   │   ├── mod.rs
│   │   ├── tcp_connection.rs        # Conexiones TCP
│   │   └── tcp_transfer.rs          # Transferencias TCP
│   └── udp/                         # Implementación UDP
│       ├── mod.rs
│       ├── udp_connection.rs        # Conexiones UDP
│       └── udp_transfer.rs          # Transferencias UDP (Fire-and-Forget)
├── protocol/                        # Definiciones de protocolo
│   ├── mod.rs
│   ├── messages.rs                  # Mensajes del protocolo
│   └── serialization.rs             # Serialización de datos
├── error/                           # Manejo de errores
│   ├── mod.rs
│   └── types.rs                     # Tipos de error personalizados
└── utils/                           # Utilidades generales
    ├── mod.rs
    ├── crypto.rs                    # Funciones criptográficas
    ├── file_utils.rs                # Utilidades de archivos
    └── network_utils.rs             # Utilidades de red
```

### 🔄 Flujo de Transferencia

#### Flujo TCP (Confiable)
```
1. Sender: Establecer conexión TCP
2. Sender: Enviar metadata (nombre, tamaño, checksum)
3. Receiver: Confirmar metadata
4. Sender: Enviar chunks con sequence numbers
5. Receiver: Confirmar cada chunk
6. Sender: Retransmitir chunks perdidos si es necesario
7. Sender: Enviar checksum final
8. Receiver: Validar integridad completa
9. Ambos: Cerrar conexión
```

#### Flujo UDP (Fire-and-Forget)
```
1. Sender: Bind UDP socket (sin conexión)
2. Receiver: Bind UDP socket y esperar
3. Sender: Enviar chunks continuamente (1KB cada uno)
4. Sender: Enviar múltiples FIN markers (paquetes vacíos)
5. Receiver: Detectar finalización por timeout
6. Receiver: Guardar archivo con timestamp
7. Ambos: Cerrar sockets
```

### 📊 Comparación Técnica Detallada

| Aspecto | TCP | UDP Fire-and-Forget |
|---------|-----|---------------------|
| **Conexión** | 3-way handshake | Sin conexión |
| **Chunk Size** | 8KB (configurable) | 1KB (fijo) |
| **Acknowledgments** | Sí, por cada chunk | No |
| **Metadata** | Nombre, tamaño, checksum | Solo datos |
| **Sequence Tracking** | Sí | No |
| **Retransmisión** | Automática | No |
| **Flow Control** | Sí | No |
| **Detección de Fin** | Checksum final + ACK | Timeout después de FIN markers |
| **Confiabilidad** | Garantizada | Fire-and-forget |
| **Velocidad** | Moderada (overhead) | Muy rápida |
| **Uso de CPU** | Moderado | Bajo |
| **Uso de Red** | Eficiente para archivos grandes | Eficiente para transferencias rápidas |

### 🔐 Seguridad y Validación

#### Validaciones Implementadas
- **Integridad de Archivos**: Checksums SHA-256 (TCP)
- **Validación de Entrada**: Verificación de argumentos CLI
- **Timeouts Configurables**: Prevención de colgados
- **Manejo Seguro de Errores**: Sin exposición de información sensible
- **Validación de Rutas**: Prevención de path traversal

#### Características de Seguridad
- Sin almacenamiento de credenciales
- Sin logs de datos sensibles
- Validación de permisos de archivos
- Manejo seguro de memoria (Rust)
- Prevención de buffer overflows

### ⚡ Optimizaciones de Rendimiento

#### TCP Optimizations
- Chunk size adaptativo basado en tamaño de archivo
- Pipelining de chunks para reducir latencia
- Buffer management eficiente
- Reuso de conexiones cuando es posible

#### UDP Optimizations
- Chunk size optimizado para evitar fragmentación IP
- Envío continuo sin esperas innecesarias
- Minimal overhead en headers
- Batch sending para mejorar throughput

### 🔧 Configuración Avanzada

#### Variables de Entorno
```bash
export FT_DEFAULT_CHUNK_SIZE=8192      # Chunk size por defecto
export FT_DEFAULT_TIMEOUT=30           # Timeout por defecto
export FT_LOG_LEVEL=info               # Nivel de logging
export FT_MAX_RETRIES=3                # Máximo reintentos
```

#### Configuración por Protocolo
```bash
# TCP para archivos críticos
--protocol tcp --chunk-size 32768 --timeout 300

# UDP para transferencias rápidas
--protocol udp --chunk-size 1024 --timeout 30
```

## 📚 Documentación Técnica

### 📊 Implementación UDP Fire-and-Forget

El sistema implementa UDP siguiendo el patrón "fire-and-forget" teórico:

#### Características UDP Implementadas
- **Sin Conexión**: No hay establecimiento de conexión
- **Sin Acknowledgments**: No se esperan confirmaciones
- **Sin Retransmisión**: Los paquetes se envían una sola vez
- **Chunks de 1KB**: Tamaño optimizado para evitar fragmentación
- **FIN Markers**: Múltiples paquetes vacíos para señalar finalización
- **Timeout Detection**: El receptor usa timeout para detectar finalización

#### Flujo UDP Detallado
```
1. Sender: Bind UDP socket (sin conexión)
2. Receiver: Bind UDP socket y esperar con timeout
3. Sender: Enviar chunks de 1KB continuamente
4. Sender: Enviar 5 FIN markers (paquetes vacíos)
5. Receiver: Detectar finalización por timeout (30s por defecto)
6. Receiver: Guardar archivo con timestamp único
7. Ambos: Cerrar sockets
```

#### Comparación TCP vs UDP
| Característica | TCP | UDP Fire-and-Forget |
|---------------|-----|---------------------|
| Conexión | SYN → SYN-ACK → ACK | Ninguna |
| Chunk Size | 8KB | 1KB |
| Acknowledgments | Requerido para cada chunk | Ninguno |
| Intercambio de Metadata | Sí (nombre, tamaño, checksum) | Ninguno |
| Seguimiento de Secuencia | Sí | No |
| Retransmisión | Sí | No |
| Control de Flujo | Sí | No |
| Detección de Finalización | Checksum final + ACK | Timeout después de FIN markers |
| Confiabilidad | Entrega garantizada | Fire-and-forget |

### 📊 Configuraciones de Rendimiento

#### Red Local Rápida (Gigabit+)
```bash
# TCP optimizado para alta velocidad
--protocol tcp --chunk-size 65536 --timeout 300

# UDP para máxima velocidad
--protocol udp --chunk-size 1024 --timeout 60
```

#### Red No Confiable (WiFi, Móvil)
```bash
# TCP con chunks pequeños y timeout largo
--protocol tcp --chunk-size 4096 --timeout 120

# UDP (siempre fire-and-forget)
--protocol udp --chunk-size 1024 --timeout 30
```

#### Transferencia Local (localhost)
```bash
# TCP optimizado para localhost
--protocol tcp --chunk-size 32768 --timeout 60
```

### 🔒 Seguridad y Validación

#### Características de Seguridad
- **Validación de Integridad**: Checksums SHA-256 para TCP
- **Timeouts Configurables**: Prevención de colgados
- **Manejo Seguro de Errores**: Sin exposición de información sensible
- **Sin Almacenamiento de Credenciales**: No se guardan datos sensibles
- **Validación de Entrada**: Verificación de argumentos CLI
- **Prevención de Path Traversal**: Validación de rutas de archivos

#### Limitaciones de Seguridad UDP
- **Sin Validación de Integridad**: UDP no verifica checksums
- **Sin Autenticación**: No hay verificación de identidad
- **Fire-and-Forget**: No hay garantía de entrega

### 📦 Distribución y Deployment

#### Compilación para Distribución
```bash
# Compilar optimizado para producción
cargo build --release --bin file-transfer-cli

# El binario estará en: target/release/file-transfer-cli
# Tamaño típico: ~5-10MB (estático)
```

#### Docker para Distribución
```bash
# Construir imagen de producción
just docker-build

# Exportar imagen para distribución
docker save file-transfer-cli > file-transfer-cli.tar

# Importar en máquina de destino
docker load < file-transfer-cli.tar

# Ejecutar contenedor
docker run -it file-transfer-cli ft-cli --help
```

#### Distribución Multi-Plataforma
```bash
# Compilar para diferentes arquitecturas
cargo build --release --target x86_64-unknown-linux-gnu
cargo build --release --target aarch64-unknown-linux-gnu
cargo build --release --target x86_64-pc-windows-gnu
```

### 🤝 Desarrollo y Contribución

#### Requisitos de Desarrollo
- **Rust**: 1.70+ (recomendado 1.80+)
- **Just**: Task runner para comandos
- **Docker**: Para laboratorio y testing
- **Git**: Control de versiones

#### Workflow de Desarrollo
```bash
# Setup inicial
git clone <repo>
cd backend
just check

# Desarrollo continuo con auto-reload
cargo watch -x check -x test -x run

# Antes de commit
just lint          # Linting con clippy
just format        # Formateo con rustfmt
just test-all      # Todos los tests
just lab-validate  # Validación del laboratorio
```

#### Estructura de Testing Completa
```
tests/
├── integration_tests.rs                    # Tests de integración básicos
├── cli_integration_tests.rs                # Tests del CLI completo
├── test_error_handling.rs                  # Tests de manejo de errores
├── tcp_integration_test.rs                 # Tests TCP específicos
├── tcp_protocol_flow_test.rs               # Tests de flujo TCP
├── udp_fire_and_forget_test.rs             # Tests UDP fire-and-forget
├── communication_flow_e2e_test.rs          # Tests end-to-end
├── sender_receiver_communication_test.rs   # Tests de comunicación
├── transfer_orchestrator_integration_test.rs # Tests del orquestador
├── progress_tracking_integration_test.rs   # Tests de progreso
├── cli_functional_test.rs                  # Tests funcionales CLI
└── test_types.rs                          # Tests de tipos y estructuras
```

### 🎯 Casos de Uso Avanzados

#### Desarrollo y Testing
```bash
# Entorno completo de desarrollo
just lab-setup     # Laboratorio con redes aisladas
just lab-test      # Suite completa de pruebas
just lab-validate  # Validación de todos los componentes
```

#### Transferencias en Producción
```bash
# Receptor como servicio (systemd)
./target/release/file-transfer-cli receive \
  --port 8080 \
  --output /data/incoming/ \
  --timeout 3600

# Emisor con configuración robusta
./target/release/file-transfer-cli send \
  --target server.example.com \
  --port 8080 \
  --protocol tcp \
  --chunk-size 32768 \
  --timeout 300 \
  archivo-importante.tar.gz
```

#### Automatización y Scripting
```bash
#!/bin/bash
# Script de backup automático con manejo de errores
BACKUP_SERVER="backup.example.com"
BACKUP_PORT="8080"

for file in /backup/*.tar.gz; do
    echo "Transfiriendo: $file"
    
    if ./target/release/file-transfer-cli send \
        --target "$BACKUP_SERVER" \
        --port "$BACKUP_PORT" \
        --protocol tcp \
        --timeout 600 \
        "$file"; then
        echo "✅ Transferido: $file"
        # Opcional: mover archivo a directorio de completados
        mv "$file" /backup/completed/
    else
        echo "❌ Error transfiriendo: $file"
        # Log del error para revisión manual
        echo "$(date): Error en $file" >> /var/log/backup-errors.log
    fi
done
```

#### Monitoreo y Logging
```bash
# Receptor con logging detallado
./target/release/file-transfer-cli --verbose receive \
  --port 8080 \
  --output /data/incoming/ \
  2>&1 | tee /var/log/file-transfer-receiver.log

# Emisor con retry automático
for i in {1..3}; do
    if ./target/release/file-transfer-cli send \
        --target server.example.com \
        --timeout 120 \
        archivo.txt; then
        break
    else
        echo "Intento $i fallido, reintentando..."
        sleep 5
    fi
done
```

### 🏆 Características Destacadas

#### ✅ **Laboratorio Robusto**
- Entorno completamente aislado con Docker
- Validación automática de todos los componentes
- Tests comprehensivos TCP y UDP
- Troubleshooting integrado

#### ✅ **Implementación UDP Teórica**
- Fire-and-forget real sin acknowledgments
- Chunks de 1KB optimizados
- FIN markers para señalización
- Timeout-based completion detection

#### ✅ **CLI Completo y Robusto**
- Soporte completo TCP y UDP
- Manejo avanzado de errores
- Progress tracking en tiempo real
- Logging configurable (verbose/debug)

#### ✅ **Testing Exhaustivo**
- 15+ test suites diferentes
- Validación automática del laboratorio
- Tests de integración end-to-end
- Tests de rendimiento y estrés

#### ✅ **Documentación Completa**
- README consolidado con toda la información
- Guías paso a paso para todos los casos
- Troubleshooting detallado
- Ejemplos de uso avanzado

---

## 🎉 ¡Sistema Completo y Listo!

El sistema de transferencia de archivos está **completamente implementado y documentado**:

- **🧪 Laboratorio robusto** libre de fallas
- **🌐 CLI completo** con TCP y UDP
- **📋 Testing exhaustivo** automatizado
- **📚 Documentación completa** consolidada
- **🔧 Troubleshooting integrado** para todos los casos

### 🚀 Comenzar Ahora
```bash
cd backend
just lab-setup    # Setup completo
just lab-test     # Validar todo funciona
just lab-status   # Ver estado del sistema
```

**¡El sistema está listo para transferir archivos de manera confiable y eficiente!** 🚀