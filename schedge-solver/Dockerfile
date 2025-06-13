FROM rust:1.87.0-bullseye AS builder

WORKDIR /app

COPY schedge-solver/ ./

RUN cargo build --release

FROM debian:bullseye-slim

WORKDIR /app

COPY --from=builder /app/target/release/schedge-solver-server /usr/local/bin/schedge-solver-server

EXPOSE 6000

CMD ["schedge-solver-server"]
