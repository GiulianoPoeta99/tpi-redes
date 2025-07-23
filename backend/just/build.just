# Build release version
build:
    cargo build --release

# Build debug version
build-debug:
    cargo build

# Check code without building
check:
    cargo check

# Lint code with clippy
lint:
    cargo clippy -- -D warnings

# Format code with rustfmt
format:
    cargo fmt

# Show dependency tree
check-deps:
    cargo tree

# Update all dependencies
update-deps:
    cargo update

# Generate and open documentation
docs:
    cargo doc --open