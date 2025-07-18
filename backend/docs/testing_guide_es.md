# Guía de Pruebas Reales del CLI

Esta guía te explica cómo hacer pruebas reales del CLI de transferencia de archivos, incluyendo cómo encontrar IPs y configurar diferentes escenarios de prueba.

## 🚀 Preparación Inicial

### 1. Compilar el CLI
```bash
cd backend
cargo build --release --bin file-transfer-cli
```

El ejecutable estará en `target/release/file-transfer-cli`

### 2. Crear alias para facilitar el uso (opcional)
```bash
# En tu ~/.bashrc o ~/.zshrc
alias ft-cli="./target/release/file-transfer-cli"
```

## 🌐 Encontrar Direcciones IP

### En tu máquina local:
```bash
# Linux/macOS
ip addr show
# o
ifconfig

# Windows
ipconfig
```

Busca tu IP local, generalmente será algo como:
- `192.168.1.xxx` (red doméstica)
- `10.0.0.xxx` (algunas redes corporativas)
- `172.16.xxx.xxx` (redes privadas)

### Ejemplo de salida:
```
2: wlan0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500
    inet 192.168.1.105/24 brd 192.168.1.255 scope global dynamic
```
En este caso, tu IP es `192.168.1.105`

## 🧪 Escenarios de Prueba

### Escenario 1: Prueba Local (Misma Máquina)

Esta es la prueba más básica usando localhost:

#### Terminal 1 (Receptor):
```bash
cd backend
./target/release/file-transfer-cli receive --port 8080 --output ./downloads/
```

#### Terminal 2 (Emisor):
```bash
# Crear un archivo de prueba
echo "¡Hola mundo desde el CLI!" > test.txt

# Enviar el archivo
./target/release/file-transfer-cli send --target 127.0.0.1 --port 8080 test.txt
```

### Escenario 2: Prueba en Red Local (Dos Máquinas)

#### Máquina A (Receptor):
```bash
# Encontrar tu IP
ip addr show

# Iniciar receptor (ejemplo con IP 192.168.1.105)
./target/release/file-transfer-cli receive --port 8080 --output ./downloads/
```

#### Máquina B (Emisor):
```bash
# Crear archivo de prueba
echo "Transferencia entre máquinas" > archivo_red.txt

# Enviar a la IP de la Máquina A
./target/release/file-transfer-cli send --target 192.168.1.105 --port 8080 archivo_red.txt
```

### Escenario 3: Prueba con Diferentes Protocolos

#### TCP (por defecto):
```bash
# Receptor
./target/release/file-transfer-cli receive --port 8080 --protocol tcp

# Emisor
./target/release/file-transfer-cli send --target 192.168.1.105 --protocol tcp archivo.txt
```

#### UDP:
```bash
# Receptor
./target/release/file-transfer-cli receive --port 8080 --protocol udp

# Emisor
./target/release/file-transfer-cli send --target 192.168.1.105 --protocol udp archivo.txt
```

## 📋 Casos de Prueba Específicos

### 1. Archivo Pequeño (< 1KB)
```bash
echo "Archivo pequeño" > small.txt
./target/release/file-transfer-cli send --target 192.168.1.105 small.txt
```

### 2. Archivo Mediano (~1MB)
```bash
# Crear archivo de 1MB
dd if=/dev/zero of=medium.txt bs=1024 count=1024

./target/release/file-transfer-cli send --target 192.168.1.105 medium.txt
```

### 3. Archivo Grande (~10MB)
```bash
# Crear archivo de 10MB
dd if=/dev/zero of=large.txt bs=1024 count=10240

./target/release/file-transfer-cli send --target 192.168.1.105 large.txt
```

### 4. Prueba con Configuración Personalizada
```bash
./target/release/file-transfer-cli send \
  --target 192.168.1.105 \
  --port 9090 \
  --protocol udp \
  --chunk-size 4096 \
  --timeout 60 \
  archivo.txt
```

### 5. Prueba con Logging Detallado
```bash
# Verbose
./target/release/file-transfer-cli --verbose send --target 192.168.1.105 archivo.txt

# Debug
./target/release/file-transfer-cli --debug send --target 192.168.1.105 archivo.txt
```

## 🔧 Solución de Problemas Comunes

### Error: "Connection refused"
```
Error: Network error: Failed to connect to 192.168.1.105:8080: Connection refused
```

**Soluciones:**
1. Verificar que el receptor esté ejecutándose
2. Verificar que el puerto esté correcto
3. Verificar que no haya firewall bloqueando

### Error: "File does not exist"
```
Error: File does not exist: archivo.txt
```

**Solución:**
```bash
# Verificar que el archivo existe
ls -la archivo.txt

# Usar ruta absoluta si es necesario
./target/release/file-transfer-cli send --target 192.168.1.105 /ruta/completa/archivo.txt
```

### Error: "Permission denied"
```
Error: Failed to create output directory: Permission denied
```

**Solución:**
```bash
# Crear directorio con permisos
mkdir -p downloads
chmod 755 downloads

# O usar directorio con permisos
./target/release/file-transfer-cli receive --output /tmp/downloads/
```

## 🌍 Configuración de Red

### Firewall (Linux)
```bash
# Permitir puerto específico
sudo ufw allow 8080

# O deshabilitar temporalmente para pruebas
sudo ufw disable
```

### Firewall (Windows)
1. Ir a "Windows Defender Firewall"
2. "Configuración avanzada"
3. "Reglas de entrada" → "Nueva regla"
4. Permitir puerto 8080

### Router/NAT
Si estás probando entre redes diferentes, necesitarás:
1. Port forwarding en el router
2. Usar la IP pública del router
3. Configurar DMZ (no recomendado para producción)

## 📊 Monitoreo Durante las Pruebas

### Ver Transferencias Activas
```bash
# En otra terminal mientras se ejecuta la transferencia
./target/release/file-transfer-cli list
```

### Cancelar Transferencia
```bash
# Obtener ID de la transferencia con 'list'
./target/release/file-transfer-cli cancel <transfer-id>
```

### Monitoreo de Red (opcional)
```bash
# Ver conexiones activas
netstat -an | grep 8080

# Monitorear tráfico
sudo tcpdump -i any port 8080
```

## 🧪 Script de Pruebas Automatizadas

Crea este script para pruebas rápidas:

```bash
#!/bin/bash
# test_cli.sh

set -e

echo "🚀 Iniciando pruebas del CLI..."

# Configuración
TARGET_IP="127.0.0.1"  # Cambiar por tu IP
PORT="8080"
CLI="./target/release/file-transfer-cli"

# Crear archivos de prueba
echo "Creando archivos de prueba..."
echo "Archivo pequeño" > test_small.txt
dd if=/dev/zero of=test_medium.txt bs=1024 count=100 2>/dev/null
echo "Archivos creados ✓"

# Función para iniciar receptor en background
start_receiver() {
    echo "Iniciando receptor en puerto $PORT..."
    $CLI receive --port $PORT --output ./test_downloads/ &
    RECEIVER_PID=$!
    sleep 2  # Dar tiempo al receptor para iniciar
}

# Función para detener receptor
stop_receiver() {
    if [ ! -z "$RECEIVER_PID" ]; then
        kill $RECEIVER_PID 2>/dev/null || true
        wait $RECEIVER_PID 2>/dev/null || true
    fi
}

# Limpiar al salir
trap 'stop_receiver; rm -f test_*.txt; rm -rf test_downloads' EXIT

# Crear directorio de descargas
mkdir -p test_downloads

echo "🧪 Prueba 1: Archivo pequeño con TCP"
start_receiver
$CLI send --target $TARGET_IP --port $PORT test_small.txt
stop_receiver
echo "Prueba 1 completada ✓"

echo "🧪 Prueba 2: Archivo mediano con UDP"
start_receiver
$CLI send --target $TARGET_IP --port $PORT --protocol udp test_medium.txt
stop_receiver
echo "Prueba 2 completada ✓"

echo "🧪 Prueba 3: Configuración personalizada"
start_receiver
$CLI send --target $TARGET_IP --port $PORT --chunk-size 4096 --timeout 30 test_small.txt
stop_receiver
echo "Prueba 3 completada ✓"

echo "✅ Todas las pruebas completadas exitosamente!"
echo "📁 Archivos recibidos en: ./test_downloads/"
ls -la test_downloads/
```

Hacer ejecutable y correr:
```bash
chmod +x test_cli.sh
./test_cli.sh
```

## 📝 Lista de Verificación para Pruebas

### Antes de empezar:
- [ ] CLI compilado correctamente
- [ ] Puertos disponibles (8080 por defecto)
- [ ] Firewall configurado si es necesario
- [ ] IPs identificadas correctamente

### Pruebas básicas:
- [ ] Transferencia local (127.0.0.1)
- [ ] Transferencia en red local
- [ ] Protocolo TCP
- [ ] Protocolo UDP
- [ ] Archivo pequeño (< 1KB)
- [ ] Archivo mediano (~1MB)
- [ ] Archivo grande (> 10MB)

### Pruebas de error:
- [ ] Archivo inexistente
- [ ] IP inexistente
- [ ] Puerto ocupado
- [ ] Protocolo inválido
- [ ] Sin permisos de escritura

### Funcionalidades:
- [ ] Logging verbose
- [ ] Logging debug
- [ ] Cancelación de transferencia
- [ ] Listado de transferencias activas
- [ ] Configuración personalizada

## 🎯 Consejos para Pruebas Exitosas

1. **Empezar simple**: Siempre comenzar con pruebas locales
2. **Un paso a la vez**: Probar cada funcionalidad por separado
3. **Verificar conectividad**: Usar `ping` para verificar que las máquinas se ven
4. **Logs detallados**: Usar `--debug` cuando algo no funcione
5. **Puertos alternativos**: Si 8080 está ocupado, usar otros (8081, 9090, etc.)
6. **Archivos de prueba**: Crear archivos de diferentes tamaños para probar rendimiento

¡Con esta guía deberías poder hacer pruebas completas del CLI en diferentes escenarios!