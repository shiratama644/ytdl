# `.agent/` — エージェント記憶システム

> **用途**: Agent のコードベース知識・定型ワークフロー・タスク実行ログをセッションをまたいで永続化する仕組み。
> 作業規約の本体は [`../AGENTS.md`](../AGENTS.md) §8 を参照してください。

## ディレクトリ

| ディレクトリ | 役割 | 入口 |
| --- | --- | --- |
| `skills/` | コードベースの**事実/仕様/暗黙了解** | [`skills/index.md`](./skills/index.md) |
| `hooks/` | トリガー別の**定型手順** (pre-task / verify / log / recovery) | [`hooks/index.md`](./hooks/index.md) |
| `logs/` | タスク完了毎の**実行記録** | [`logs/README.md`](./logs/README.md) |

## 使い方

- **タスク開始時**: [`hooks/pre-task.md`](./hooks/pre-task.md) を参考に現状把握 → [`skills/index.md`](./skills/index.md) から必要なスキルだけを読む。
- **commit 前検証**: [`hooks/verify-before-commit.md`](./hooks/verify-before-commit.md)。
- **タスク完了後**: [`hooks/log-task.md`](./hooks/log-task.md) でログ作成 + 知見を `skills/` へ同期。

コードベース知識（`skills/`）は **ytdl 専用**の内容で、`youtubei.js`・video.js / dashjs・ffmpeg ダウンロード・
Zustand stores・`__tests__` 規約等を扱います。
