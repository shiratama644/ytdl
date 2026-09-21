# ytdl ドキュメント索引

ytdl は、**YouTube Proxy Site**(しあTube と同構成の YouTube 代替視聴・ダウンロードサイト)のリポジトリです。
Material 3 Design Expressive の UI で、**動画ダウンロード(拡張子 / 画質選択 + キュー)** を差別化機能とする。
最初は GAS で運用し、制限にぶつかったら自宅サーバー(Proxmox/LXC)へ移行する(Phase 4)。

---

## ディレクトリ

```
docs/
├── README.md            ← 本ファイル
├── task-list.md         ★ 進捗の唯一の正本
├── HANDOVER.md          ★ AI 引き継ぎドキュメント(コンテキスト引き継ぎ時のエントリポイント)
├── arch/                # 仕様書(どう作るか)※ Phase 0 完了後に新規作成
│   └── (adr.md 等: 着手時に作成)
├── planning/            # 計画書(着手前に _TEMPLATE.md で作成)
│   ├── _TEMPLATE.md
│   ├── README.md        ← 計画書索引
│   └── PHASE0_PLAN.md   ★ Phase 0(基盤 + 全体アーキテクチャ)
└── research/            # 調査結果
    ├── README.md
    ├── SHIATUBE_DEEP_RESEARCH.md  ★ 参照元サービスの完全調査(一次情報)
    ├── VERIFICATION_P0.md         ★ 検証証跡(V1〜V4・設計への影響)
    └── DOWNLOAD_MECHANISM_RESEARCH.md  ★ DL 機構調査(StreamSaver/直リンク/方式 A・B・C + 決定記録)
```

`docs/` 外に関連するディレクトリ:
- [`../verification/`](../verification/README.md) = 検証キット + 生結果(README = 実行手順・生結果は 1 ファイル = 最新のみ)
- [`../.agent/`](../.agent/hooks/index.md) = Agent 記憶システム(hooks = 定型手順 / skills = 実測ノウハウ / logs = 実行記録・追加のみ)

---

## 読む順

| 順 | 文書 | 内容 |
|---:|---|---|
| 0 | [`task-list.md`](task-list.md) | 進捗の唯一の正本。次に着手するタスク |
| 0' | [`HANDOVER.md`](HANDOVER.md) | **AI 引き継ぎ時**に最初に読む(全コンテキストの入口・§14 に引き継ぎプロンプト) |
| 1 | [`../README.md`](../README.md) | プロダクト概要・現状 |
| 2 | [`planning/PHASE0_PLAN.md`](planning/PHASE0_PLAN.md) | **全体アーキテクチャ(GAS→自宅サーバー)・スタック・修正点・リスク** |
| 3 | [`research/SHIATUBE_DEEP_RESEARCH.md`](research/SHIATUBE_DEEP_RESEARCH.md) | しあTube の実装詳細(技術・API 形状・運営・法的)。アーキ判断の根拠 |
| 4 | `arch/`(作成後) | 仕様正本。採用判断はここへ反映してから実装 |
