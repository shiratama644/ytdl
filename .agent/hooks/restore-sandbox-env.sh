#!/usr/bin/env bash
# restore-sandbox-env.sh
# Sandbox 再構築後の環境復旧（AGENTS.md §4.1.1）。sandbox-rebuild-recovery.md から呼出。
#
# プロジェクトの方針・技術スタックに応じて依存関係やツールの復旧を行います。
set -euo pipefail

echo "[restore-sandbox-env] starting sandbox environment restoration..."

# ============================================================================
# 1. Node.js 環境の確認と依存インストール（package.json が存在する場合）
# ============================================================================
if [ -f package.json ]; then
  echo "[restore-sandbox-env] package.json detected."

  # bun.lock / bun.lockb が存在する場合
  if [ -f bun.lock ] || [ -f bun.lockb ]; then
    if ! command -v bun >/dev/null 2>&1; then
      echo "[restore-sandbox-env] bun not found. installing bun via npm..."
      npm install -g bun@latest >/dev/null 2>&1 || true
    fi
    if command -v bun >/dev/null 2>&1; then
      echo "[restore-sandbox-env] installing dependencies with bun..."
      bun install --frozen-lockfile || bun install
    else
      echo "[restore-sandbox-env] fallback to npm install..."
      npm install
    fi
  # pnpm-lock.yaml が存在する場合
  elif [ -f pnpm-lock.yaml ]; then
    if ! command -v pnpm >/dev/null 2>&1; then
      echo "[restore-sandbox-env] installing pnpm via npm..."
      npm install -g pnpm@latest >/dev/null 2>&1 || true
    fi
    pnpm install --frozen-lockfile || pnpm install
  # yarn.lock が存在する場合
  elif [ -f yarn.lock ]; then
    yarn install --frozen-lockfile || yarn install
  # package-lock.json または npm
  elif [ -f package-lock.json ]; then
    npm ci || npm install
  else
    npm install
  fi
fi

# ============================================================================
# 2. Python 環境の確認と依存インストール（requirements.txt / pyproject.toml が存在する場合）
# ============================================================================
if [ -f requirements.txt ]; then
  echo "[restore-sandbox-env] requirements.txt detected. installing python dependencies..."
  pip install -r requirements.txt || true
elif [ -f pyproject.toml ] && command -v poetry >/dev/null 2>&1; then
  echo "[restore-sandbox-env] pyproject.toml detected. installing poetry dependencies..."
  poetry install || true
fi

echo "[restore-sandbox-env] restoration completed successfully."
