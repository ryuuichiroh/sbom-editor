# SBOM Editor

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![SPDX](https://img.shields.io/badge/SPDX-2.3-green)](https://spdx.dev/)
[![CycloneDX](https://img.shields.io/badge/CycloneDX-1.4-green)](https://cyclonedx.org/)

SPDX 2.3 と CycloneDX 1.4 の両フォーマットに対応した SBOM（Software Bill of Materials）の閲覧・編集ツール。

## 特徴

- **マルチフォーマット対応**: SPDX 2.3（JSON/YAML）と CycloneDX 1.4（JSON/XML）をサポート
- **ライセンス分析**: ライセンスをカテゴリ別（コピーレフト、パーミッシブなど）に分類・表示
- **コンポーネント管理**: ツリービューでの階層表示、親子関係の設定、循環参照の検出
- **カスタム属性**: 標準仕様外の属性を動的に追加、または設定ファイルで事前定義
- **バリデーション**: 仕様上の必須フィールドと組織ポリシーに基づく必須フィールドのチェック
- **ストア連携**: sbom-store との連携により SBOM の保存・読み込み、承認管理が可能
- **クライアントサイド動作**: サーバー不要、ブラウザ内で完結（ストア連携はオプション）

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

### 環境変数

ストア接続設定を環境変数で指定できます。

```bash
# .env ファイルを作成（.env.example をコピー）
cp .env.example .env
```

`.env` ファイルで以下の変数を設定:

```env
# SBOM Store バックエンドサーバーの URL
VITE_SBOM_STORE_URL=http://localhost:3000
```

**優先順位**: localStorage > 環境変数

- localStorage に値がある場合はそちらが優先されます
- localStorage に値がない場合、環境変数の値が使用されます
- 設定画面で URL を変更すると localStorage に保存されます

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
- 必須フィールド（\*）は入力必須

### 4. カスタム属性の追加

コンポーネント編集画面の「カスタム属性」タブで:

- 事前定義された属性をプルダウンから選択
- または自由に属性名を入力して動的に追加
- 値のタイプ（string / string[]）を選択

### 5. ダウンロード

ヘッダーの「ダウンロード」ボタンで編集後の SBOM を保存します。元のフォーマットで出力されます。

### 6. ストア連携（オプション）

sbom-store と連携することで、SBOM の一元管理が可能になります。

#### 6.1 ストア接続の設定

1. ヘッダーの設定アイコンをクリック
2. 「ストア接続設定」セクションで sbom-store の URL を入力（例: `http://localhost:3000`）
3. 「接続テスト」ボタンで接続を確認
4. 接続成功後、URL が自動保存されます

#### 6.2 ストアへ保存

1. ヘッダーの「ストアへ保存」ボタンをクリック
2. 名前、バージョン、タグを入力
3. 「保存」ボタンで sbom-store に保存

**注意事項**:

- 同じ名前とバージョンの SBOM が既に存在する場合、上書き確認が表示されます
- 承認済み SBOM は上書きできません（別の名前/バージョンで保存してください）

#### 6.3 ストアから読み込み

1. ヘッダーの「ストアから読み込み」ボタンをクリック
2. SBOM 一覧から読み込みたい SBOM を選択
3. フィルタリング機能で絞り込み可能:
   - 名前で検索
   - タグで絞り込み
   - 承認状態で絞り込み
4. 「読み込み」ボタンで編集画面にロード

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

## sbom-store との連携

sbom-editor は sbom-store バックエンドと連携することで、SBOM の一元管理機能を利用できます。

sbom-store のセットアップ方法は [sbom-store/README.md](https://github.com/ryuuichiroh/sbom-store/blob/main/README.md) を参照してください。
sbom-store の `.env` で `CORS_ORIGIN` に sbom-editor のオリジン（デフォルト: `http://localhost:5173`）を設定する必要があります。

## 開発

```bash
npm test              # 単体テスト
npm run test:coverage # カバレッジ付き
npm run test:e2e      # E2E テスト（Playwright）
npm run lint          # Lint チェック
npm run format        # フォーマット適用
npm run build         # プロダクションビルド
```

## ディレクトリ構成

```
src/
├── components/       # React コンポーネント
│   ├── common/      # 共通コンポーネント
│   ├── license/     # ライセンス一覧
│   ├── component/   # コンポーネント管理
│   ├── editor/      # 属性エディタ
│   ├── store/       # ストア連携（StoreConnectDialog, StoreSaveDialog）
│   └── upload/      # ファイルアップロード
├── services/        # ビジネスロジック
│   ├── parser/      # SPDX/CycloneDX パーサー
│   ├── validator/   # バリデーター
│   ├── exporter/    # エクスポーター
│   └── storeClient.ts  # sbom-store API クライアント
├── store/           # 状態管理
├── types/           # TypeScript 型定義
├── hooks/           # カスタムフック（useStoreConnection など）
└── utils/           # ユーティリティ

public/config/       # デフォルト設定ファイル
e2e/                 # E2E テスト
```

## Contributing

コントリビューションを歓迎します！

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

バグ報告や機能要望は [Issues](https://github.com/ryuuichiroh/sbom-editor/issues) からお願いします。

## Links

- [Issues](https://github.com/ryuuichiroh/sbom-editor/issues) - バグ報告・機能要望
- [Releases](https://github.com/ryuuichiroh/sbom-editor/releases) - リリース履歴

## License

このプロジェクトは Apache License 2.0 の下でライセンスされています。詳細は [LICENSE](LICENSE) ファイルを参照してください。
