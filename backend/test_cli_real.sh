#!/bin/bash
# Script de pruebas reales para el CLI de transferencia de archivos

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
TARGET_IP="127.0.0.1"  # Cambiar por la IP de destino
PORT="8080"
CLI="./target/release/file-transfer-cli"
TEST_DIR="./test_files"
DOWNLOAD_DIR="./test_downloads"

# Función para imprimir mensajes con colores
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "\n${BLUE}🧪 $1${NC}"
    echo "----------------------------------------"
}

# Función para limpiar archivos de prueba
cleanup() {
    print_info "Limpiando archivos de prueba..."
    rm -rf "$TEST_DIR" "$DOWNLOAD_DIR" 2>/dev/null || true
    if [ ! -z "$RECEIVER_PID" ]; then
        kill $RECEIVER_PID 2>/dev/null || true
        wait $RECEIVER_PID 2>/dev/null || true
    fi
}

# Configurar limpieza al salir
trap cleanup EXIT

# Función para verificar que el CLI existe
check_cli() {
    if [ ! -f "$CLI" ]; then
        print_error "CLI no encontrado en $CLI"
        print_info "Compilando CLI..."
        cargo build --release --bin file-transfer-cli
        if [ ! -f "$CLI" ]; then
            print_error "Error al compilar el CLI"
            exit 1
        fi
    fi
    print_success "CLI encontrado"
}

# Función para crear archivos de prueba
create_test_files() {
    print_info "Creando archivos de prueba..."
    mkdir -p "$TEST_DIR"
    
    # Archivo pequeño
    echo "¡Hola mundo desde el CLI de transferencia!" > "$TEST_DIR/small.txt"
    
    # Archivo mediano (100KB)
    dd if=/dev/zero of="$TEST_DIR/medium.txt" bs=1024 count=100 2>/dev/null
    
    # Archivo con contenido específico
    cat > "$TEST_DIR/content.txt" << EOF
Este es un archivo de prueba para el CLI.
Contiene múltiples líneas de texto.
Fecha de creación: $(date)
Tamaño esperado: pequeño
Protocolo de prueba: TCP y UDP
EOF
    
    print_success "Archivos de prueba creados:"
    ls -lh "$TEST_DIR"
}

# Función para iniciar receptor en background
start_receiver() {
    local protocol=${1:-tcp}
    local port=${2:-$PORT}
    
    print_info "Iniciando receptor ($protocol) en puerto $port..."
    mkdir -p "$DOWNLOAD_DIR"
    
    if [ "$protocol" = "udp" ]; then
        $CLI receive --port "$port" --protocol udp --output "$DOWNLOAD_DIR" &
    else
        $CLI receive --port "$port" --output "$DOWNLOAD_DIR" &
    fi
    
    RECEIVER_PID=$!
    sleep 2  # Dar tiempo al receptor para iniciar
    
    # Verificar que el proceso está corriendo
    if ! kill -0 $RECEIVER_PID 2>/dev/null; then
        print_error "Error al iniciar el receptor"
        return 1
    fi
    
    print_success "Receptor iniciado (PID: $RECEIVER_PID)"
}

# Función para detener receptor
stop_receiver() {
    if [ ! -z "$RECEIVER_PID" ]; then
        print_info "Deteniendo receptor..."
        kill $RECEIVER_PID 2>/dev/null || true
        wait $RECEIVER_PID 2>/dev/null || true
        RECEIVER_PID=""
        sleep 1
    fi
}

# Función para verificar transferencia
verify_transfer() {
    local original_file="$1"
    local received_file="$2"
    
    if [ ! -f "$received_file" ]; then
        print_error "Archivo no recibido: $received_file"
        return 1
    fi
    
    # Comparar tamaños
    local original_size=$(stat -f%z "$original_file" 2>/dev/null || stat -c%s "$original_file" 2>/dev/null)
    local received_size=$(stat -f%z "$received_file" 2>/dev/null || stat -c%s "$received_file" 2>/dev/null)
    
    if [ "$original_size" != "$received_size" ]; then
        print_error "Tamaños diferentes: original=$original_size, recibido=$received_size"
        return 1
    fi
    
    # Comparar contenido (para archivos pequeños)
    if [ "$original_size" -lt 10240 ]; then  # < 10KB
        if ! cmp -s "$original_file" "$received_file"; then
            print_error "Contenido diferente entre archivos"
            return 1
        fi
    fi
    
    print_success "Transferencia verificada correctamente"
    return 0
}

# Función para ejecutar prueba de transferencia
run_transfer_test() {
    local test_name="$1"
    local file="$2"
    local protocol="${3:-tcp}"
    local extra_args="$4"
    
    print_header "$test_name"
    
    # Iniciar receptor
    start_receiver "$protocol"
    
    # Ejecutar transferencia
    local filename=$(basename "$file")
    print_info "Enviando $filename con protocolo $protocol..."
    
    if [ -n "$extra_args" ]; then
        print_info "Argumentos adicionales: $extra_args"
        $CLI send --target "$TARGET_IP" --port "$PORT" --protocol "$protocol" $extra_args "$file"
    else
        $CLI send --target "$TARGET_IP" --port "$PORT" --protocol "$protocol" "$file"
    fi
    
    # Detener receptor
    stop_receiver
    
    # Verificar resultado
    local received_file="$DOWNLOAD_DIR/$filename"
    if verify_transfer "$file" "$received_file"; then
        print_success "$test_name completada exitosamente"
        return 0
    else
        print_error "$test_name falló"
        return 1
    fi
}

# Función principal
main() {
    print_header "Iniciando Pruebas Reales del CLI"
    
    # Verificaciones iniciales
    check_cli
    create_test_files
    
    # Contador de pruebas
    local total_tests=0
    local passed_tests=0
    
    # Prueba 1: Archivo pequeño con TCP
    total_tests=$((total_tests + 1))
    if run_transfer_test "Prueba 1: Archivo pequeño (TCP)" "$TEST_DIR/small.txt" "tcp"; then
        passed_tests=$((passed_tests + 1))
    fi
    
    # Limpiar descargas entre pruebas
    rm -rf "$DOWNLOAD_DIR"/*
    
    # Prueba 2: Archivo mediano con TCP
    total_tests=$((total_tests + 1))
    if run_transfer_test "Prueba 2: Archivo mediano (TCP)" "$TEST_DIR/medium.txt" "tcp"; then
        passed_tests=$((passed_tests + 1))
    fi
    
    # Limpiar descargas entre pruebas
    rm -rf "$DOWNLOAD_DIR"/*
    
    # Prueba 3: Archivo con UDP
    total_tests=$((total_tests + 1))
    if run_transfer_test "Prueba 3: Archivo pequeño (UDP)" "$TEST_DIR/content.txt" "udp"; then
        passed_tests=$((passed_tests + 1))
    fi
    
    # Limpiar descargas entre pruebas
    rm -rf "$DOWNLOAD_DIR"/*
    
    # Prueba 4: Configuración personalizada
    total_tests=$((total_tests + 1))
    if run_transfer_test "Prueba 4: Configuración personalizada" "$TEST_DIR/small.txt" "tcp" "--chunk-size 4096 --timeout 30"; then
        passed_tests=$((passed_tests + 1))
    fi
    
    # Prueba 5: Verbose logging
    print_header "Prueba 5: Logging verbose"
    start_receiver "tcp"
    print_info "Ejecutando con logging verbose..."
    if $CLI --verbose send --target "$TARGET_IP" --port "$PORT" "$TEST_DIR/small.txt"; then
        print_success "Prueba de logging verbose completada"
        total_tests=$((total_tests + 1))
        passed_tests=$((passed_tests + 1))
    else
        print_error "Prueba de logging verbose falló"
        total_tests=$((total_tests + 1))
    fi
    stop_receiver
    
    # Pruebas de error
    print_header "Pruebas de Manejo de Errores"
    
    # Error: archivo inexistente
    total_tests=$((total_tests + 1))
    print_info "Probando archivo inexistente..."
    if ! $CLI send --target "$TARGET_IP" --port "$PORT" "archivo_inexistente.txt" 2>/dev/null; then
        print_success "Error de archivo inexistente manejado correctamente"
        passed_tests=$((passed_tests + 1))
    else
        print_error "Error de archivo inexistente no detectado"
    fi
    
    # Error: protocolo inválido
    total_tests=$((total_tests + 1))
    print_info "Probando protocolo inválido..."
    if ! $CLI send --target "$TARGET_IP" --port "$PORT" --protocol "invalid" "$TEST_DIR/small.txt" 2>/dev/null; then
        print_success "Error de protocolo inválido manejado correctamente"
        passed_tests=$((passed_tests + 1))
    else
        print_error "Error de protocolo inválido no detectado"
    fi
    
    # Prueba de comandos de gestión
    print_header "Pruebas de Comandos de Gestión"
    
    # Comando list (sin transferencias activas)
    total_tests=$((total_tests + 1))
    print_info "Probando comando 'list' sin transferencias..."
    if $CLI list | grep -q "No active transfers"; then
        print_success "Comando 'list' funciona correctamente"
        passed_tests=$((passed_tests + 1))
    else
        print_error "Comando 'list' no funciona como esperado"
    fi
    
    # Comando help
    total_tests=$((total_tests + 1))
    print_info "Probando comando 'help'..."
    if $CLI --help | grep -q "socket-based file transfer"; then
        print_success "Comando 'help' funciona correctamente"
        passed_tests=$((passed_tests + 1))
    else
        print_error "Comando 'help' no funciona como esperado"
    fi
    
    # Resumen final
    print_header "Resumen de Pruebas"
    echo "Total de pruebas: $total_tests"
    echo "Pruebas exitosas: $passed_tests"
    echo "Pruebas fallidas: $((total_tests - passed_tests))"
    
    if [ "$passed_tests" -eq "$total_tests" ]; then
        print_success "¡Todas las pruebas pasaron exitosamente! 🎉"
        echo ""
        print_info "El CLI está funcionando correctamente y listo para usar."
        print_info "Puedes cambiar TARGET_IP en este script para probar con otras máquinas."
        exit 0
    else
        print_error "Algunas pruebas fallaron. Revisa los logs arriba."
        exit 1
    fi
}

# Verificar argumentos
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Script de pruebas reales para el CLI de transferencia de archivos"
    echo ""
    echo "Uso: $0 [IP_DESTINO]"
    echo ""
    echo "Argumentos:"
    echo "  IP_DESTINO    IP de destino para las pruebas (default: 127.0.0.1)"
    echo ""
    echo "Ejemplos:"
    echo "  $0                    # Pruebas locales"
    echo "  $0 192.168.1.100     # Pruebas a otra máquina"
    echo ""
    echo "El script ejecutará múltiples pruebas automáticamente y reportará los resultados."
    exit 0
fi

# Permitir especificar IP como argumento
if [ ! -z "$1" ]; then
    TARGET_IP="$1"
    print_info "Usando IP de destino: $TARGET_IP"
fi

# Ejecutar pruebas
main