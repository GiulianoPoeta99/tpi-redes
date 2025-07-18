# Multi-stage build para optimizar el tamaño final
FROM rust:1.75-slim as builder

# Instalar dependencias del sistema necesarias para compilar
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración de Cargo
COPY Cargo.toml Cargo.lock ./

# Crear estructura de directorios
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Compilar dependencias (esto se cachea si no cambian)
RUN cargo build --release --bin file-transfer-cli
RUN rm src/main.rs

# Copiar el código fuente real
COPY src ./src

# Compilar la aplicación final
RUN cargo build --release --bin file-transfer-cli

# Imagen final más pequeña
FROM debian:bookworm-slim

# Instalar dependencias de runtime
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Crear usuario no-root para seguridad
RUN useradd -r -s /bin/false -m -d /app appuser

# Crear directorios necesarios
RUN mkdir -p /app/files /app/downloads && \
    chown -R appuser:appuser /app

# Copiar el binario compilado
COPY --from=builder /app/target/release/file-transfer-cli /usr/local/bin/ft-cli

# Hacer ejecutable
RUN chmod +x /usr/local/bin/ft-cli

# Cambiar a usuario no-root
USER appuser
WORKDIR /app

# Exponer puertos comunes
EXPOSE 8080 8081 8082 9090

# Comando por defecto (mostrar ayuda)
CMD ["ft-cli", "--help"]