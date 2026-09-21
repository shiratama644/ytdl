#!/usr/bin/env bash
# restore-sandbox-env.sh
# Sandbox 再構築後の環境復旧（AGENTS.md §4.1.1）。sandbox-rebuild-recovery.md から呼出。
#
# やること:
#   1. Node.js が存在することを確認（プラットフォーム標準の node v22 を使用。
#      ytdl は .nvmrc を持たないためバージョン置換は行わない）
#   2. pnpm を導入（Sandbox にプリインストールされていない場合のみ。
#      npm registry は到達可能 / get.pnpm.io 等は到達不可の可能性のため npm パッケージ経由）
#   3. 依存をインストール（pnpm-lock.yaml が存在する場合のみ）
#
# ※ 本プロジェクトのパッケージ管理は **pnpm**（AGENTS.md §6.1）。
#   bun 導入処理は本プロジェクトでは使わない。
set -euo pipefail

# ============================================================================
# 1. Node.js の確認
# ============================================================================
if ! command -v node >/dev/null 2>&1; then
  echo "[restore-sandbox-env] ERROR: node not found. cannot continue." >&2
  exit 1
fi
echo "[restore-sandbox-env] node: $(node --version)"

# ============================================================================
# 2. pnpm の導入
# ============================================================================
if command -v pnpm >/dev/null 2>&1; then
  echo "[restore-sandbox-env] pnpm already installed: $(pnpm --version)"
else
  echo "[restore-sandbox-env] installing pnpm globally via npm ..."
  npm install -g pnpm >/dev/null 2>&1
  echo "[restore-sandbox-env] pnpm: $(pnpm --version)"
fi

# ============================================================================
# 3. 依存インストール
# ============================================================================
if [ -f pnpm-lock.yaml ]; then
  echo "[restore-sandbox-env] installing dependencies (frozen-lockfile) ..."
  pnpm install --frozen-lockfile
  echo "[restore-sandbox-env] done. verify with: pnpm run test（package.json の定義に従う）"
elif [ -f package.json ]; then
  echo "[restore-sandbox-env] package.json exists but no pnpm-lock.yaml. run 'pnpm install' manually after first lockfile commit."
else
  echo "[restore-sandbox-env] no package.json yet (pre P00-B). skipping dependency install."
fi
