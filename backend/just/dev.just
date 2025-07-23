# Show CLI help and options
dev:
    cargo run --bin file-transfer-cli -- --help

# Run file receiver on specified port
run-receiver port="8080":
    cargo run --bin file-transfer-cli -- receive --port {{port}}

# Send file to target address
run-sender file target="127.0.0.1:8080":
    cargo run --bin file-transfer-cli -- send --target {{target}} {{file}}

# Watch files and auto-rebuild on changes
watch:
    cargo watch -x check -x test -x run