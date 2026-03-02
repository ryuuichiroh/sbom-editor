# SBOM Editor

SPDX 2.3 と CycloneDX 1.4 の両フォーマットに対応した SBOM（Software Bill of Materials）の閲覧・編集ツール。

## 特徴

- **マルチフォーマット対応**: SPDX 2.3（JSON/YAML）と CycloneDX 1.4（JSON/XML）をサポート
- **ライセンス分析**: ライセンスをカテゴリ別（コピーレフト、パーミッシブなど）に分類・表示
- **コンポーネント管理**: ツリービューでの階層表示、親子関係の設定、循環参照の検出
- **カスタム属性**: 標準仕様外の属性を動的に追加、または設定ファイルで事前定義
- **バリデーション**: 仕様上の必須フィールドと組織ポリシーに基づく必須フィールドのチェック
- **クライアントサイド動作**: サーバー不要、ブラウザ内で完結

## 技術スタック

- TypeScript
- React 19
- Material-UI (MUI)
- Vite
- Jest + React Testing Library
- Playwright

## セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで `http://localhost:5173` を開いてください。

## 使い方

### 1. SBOM ファイルのアップロード

ヘッダーの「ファイルをアップロード」ボタンから SBOM ファイルを読み込みます。対応フォーマット:

- SPDX 2.3（JSON, YAML）
- CycloneDX 1.4（JSON, XML）

### 2. ライセンス一覧の確認

サイドバーの「ライセンス一覧」でライセンスをカテゴリ別に表示:

- コピーレフト（GPL, AGPL など）
- ウィークコピーレフト（LGPL, MPL など）
- パーミッシブ（MIT, Apache, BSD など）
- プロプライエタリ
- その他/不明

### 3. コンポーネントの編集

- サイドバーのツリービューからコンポーネントを選択
- 基本情報、ライセンス、親子関係、カスタム属性を編集
- 必須フィールド（*）は入力必須

### 4. カスタム属性の追加

コンポーネント編集画面の「カスタム属性」タブで:

- 事前定義された属性をプルダウンから選択
- または自由に属性名を入力して動的に追加
- 値のタイプ（string / string[]）を選択

### 5. ダウンロード

ヘッダーの「ダウンロード」ボタンで編集後の SBOM を保存します。元のフォーマットで出力されます。

## 設定ファイル

### 必須属性設定（field-requirements.json）

組織のポリシーに応じて必須とする属性を定義します。

- デフォルト: `public/config/field-requirements.json`
- 設定画面からカスタム設定をアップロード可能
- localStorage に保存され次回起動時も維持

<details>
<summary>設定例を見る</summary>

```json
{
  "version": "1.0.0",
  "cyclonedx": {
    "component": {
      "version": {
        "specRequired": false,
        "required": true,
        "errorMessage": "バージョンは必須です"
      },
      "purl": {
        "specRequired": false,
        "required": true,
        "hint": "例: pkg:npm/lodash@4.17.21"
      }
    }
  }
}
```

</details>

### カスタム属性定義（custom-attributes.json）

標準仕様外の属性を事前定義し、UI の選択肢として提供します。

- デフォルト: `public/config/custom-attributes.json`
- 設定画面からカスタム設定をアップロード可能
- 属性名、値のタイプ、選択肢、デフォルト値などを定義

<details>
<summary>設定例を見る</summary>

```json
{
  "version": "1.0.0",
  "attributes": [
    {
      "name": "internal:team",
      "label": "担当チーム",
      "description": "このコンポーネントを管理する社内チーム名",
      "valueType": "string",
      "required": false,
      "options": ["platform", "security", "frontend", "backend"]
    },
    {
      "name": "internal:tags",
      "label": "タグ",
      "valueType": "string[]",
      "required": false
    }
  ]
}
```

</details>

詳細なスキーマ定義は `public/config/` 配下のサンプルファイルを参照してください。

## 開発

### テスト

```bash
# 単体テスト
npm test

# カバレッジ付き
npm run test:coverage

# E2E テスト
npm run test:e2e

# E2E テスト（UI モード）
npm run test:e2e:ui
```

### コード品質

```bash
# Lint チェック
npm run lint

# Lint 自動修正
npm run lint:fix

# フォーマットチェック
npm run format:check

# フォーマット適用
npm run format
```

### ビルド

```bash
# プロダクションビルド
npm run build

# ビルド結果のプレビュー
npm run preview
```

## ディレクトリ構成

```
src/
├── components/       # React コンポーネント
│   ├── common/      # 共通コンポーネント
│   ├── license/     # ライセンス一覧
│   ├── component/   # コンポーネント管理
│   ├── editor/      # 属性エディタ
│   └── upload/      # ファイルアップロード
├── services/        # ビジネスロジック
│   ├── parser/      # SPDX/CycloneDX パーサー
│   ├── validator/   # バリデーター
│   └── exporter/    # エクスポーター
├── store/           # 状態管理
├── types/           # TypeScript 型定義
├── hooks/           # カスタムフック
└── utils/           # ユーティリティ

public/config/       # デフォルト設定ファイル
e2e/                 # E2E テスト
```

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。詳細は [LICENSE](LICENSE) を参照してください。

## 貢献

Issue や Pull Request を歓迎します。

## サポート

問題が発生した場合は、GitHub Issues でお知らせください。
