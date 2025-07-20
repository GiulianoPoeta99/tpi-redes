# Multi-stage build para optimizar el tamaño final
FROM rust:1.80-slim as builder

# Instalar dependencias del sistema necesarias para compilar
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración de Cargo
COPY Cargo.toml ./

# Copiar el código fuente
COPY src ./src

# Compilar la aplicación (regenerará Cargo.lock si es necesario)
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