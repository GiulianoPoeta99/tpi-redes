# 🚀 Guía Rápida - CLI de Transferencia de Archivos

## Compilar y Probar en 5 Minutos

### 1. Compilar el CLI
```bash
cd backend
cargo build --release --bin file-transfer-cli
```

### 2. Prueba Rápida Local

#### Terminal 1 (Receptor):
```bash
./target/release/file-transfer-cli receive --port 8080 --output ./downloads/
```

#### Terminal 2 (Emisor):
```bash
# Crear archivo de prueba
echo "¡Hola desde el CLI!" > test.txt

# Enviar archivo
./target/release/file-transfer-cli send --target 127.0.0.1 --port 8080 test.txt
```

### 3. Verificar Resultado
```bash
ls -la downloads/
cat downloads/test.txt
```

## 🌐 Prueba en Red Local

### Encontrar tu IP:
```bash
# Linux/macOS
ip addr show | grep "inet " | grep -v 127.0.0.1

# Resultado ejemplo: 192.168.1.105
```

### Máquina A (Receptor):
```bash
./target/release/file-transfer-cli receive --port 8080 --output ./downloads/
```

### Máquina B (Emisor):
```bash
# Reemplazar 192.168.1.105 con la IP real de la Máquina A
./target/release/file-transfer-cli send --target 192.168.1.105 --port 8080 archivo.txt
```

## 🧪 Script de Pruebas Automáticas

```bash
# Hacer ejecutable
chmod +x test_cli_real.sh

# Ejecutar pruebas locales
./test_cli_real.sh

# Ejecutar pruebas a otra máquina
./test_cli_real.sh 192.168.1.105
```

## 📋 Comandos Útiles

```bash
# Ver ayuda
./target/release/file-transfer-cli --help

# Ver transferencias activas
./target/release/file-transfer-cli list

# Cancelar transferencia
./target/release/file-transfer-cli cancel <transfer-id>

# Con logging detallado
./target/release/file-transfer-cli --debug send --target IP archivo.txt
```

## 🔧 Solución Rápida de Problemas

### "Connection refused"
- Verificar que el receptor esté corriendo
- Verificar la IP y puerto
- Revisar firewall

### "File does not exist"
- Verificar que el archivo existe: `ls -la archivo.txt`
- Usar ruta completa si es necesario

### "Permission denied"
- Crear directorio: `mkdir -p downloads`
- Usar directorio con permisos: `--output /tmp/`

¡Listo para transferir archivos! 🎉