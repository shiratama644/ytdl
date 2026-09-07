#!/usr/bin/env bash
# Sandbox 再構築後の依存再構築スクリプト。
# 使い方: bash .agent/hooks/restore-sandbox-env.sh
set -euo pipefail
cd "$(dirname "$0")/../.."

if command -v corepack >/dev/null 2>&1; then
  corepack enable pnpm >/dev/null 2>&1 || true
fi

pnpm install --frozen-lockfile
