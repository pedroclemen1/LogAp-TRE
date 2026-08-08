#!/usr/bin/env bash
# Executa Maven com JDK 21 em container e disponibiliza Docker ao Testcontainers.
set -euo pipefail

API_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
M2_DIR="${HOME}/.m2"
mkdir -p "${M2_DIR}"

DOCKER_SOCK=/var/run/docker.sock

TTY_FLAGS=(-i)
[ -t 0 ] && [ -t 1 ] && TTY_FLAGS=(-i -t)

DOCKER_ACCESS=(-v "${DOCKER_SOCK}:${DOCKER_SOCK}")
if [ -S "${DOCKER_SOCK}" ]; then
  DOCKER_ACCESS+=(--group-add "$(stat -c '%g' "${DOCKER_SOCK}")")
fi

# Evita a porta auxiliar do Ryuk, incompatível com o Docker Desktop/WSL2 deste ambiente.
exec docker run --rm "${TTY_FLAGS[@]}" \
  --user "$(id -u):$(id -g)" \
  --network host \
  "${DOCKER_ACCESS[@]}" \
  -e TESTCONTAINERS_RYUK_DISABLED=true \
  -v "${API_DIR}":/app \
  -v "${M2_DIR}":/.m2 \
  -e MAVEN_CONFIG=/.m2 \
  -w /app \
  maven:3.9-eclipse-temurin-21 \
  mvn -Dmaven.repo.local=/.m2/repository "$@"
