# E2E テスト

Playwright を使用した SBOM Editor の E2E テストです。

## セットアップ

```bash
# Playwright のインストール（初回のみ）
npm install -D @playwright/test

# ブラウザのインストール（初回のみ）
npx playwright install chromium
```

## テストの実行

```bash
# すべての E2E テストを実行
npm run test:e2e

# UI モードで実行（インタラクティブ）
npm run test:e2e:ui

# ヘッドモードで実行（ブラウザを表示）
npm run test:e2e:headed

# デバッグモードで実行
npm run test:e2e:debug
```

## テストファイル

- `spdx-workflow.spec.ts` - SPDX ファイルのアップロード・編集・ダウンロードのシナリオテスト
- `cyclonedx-workflow.spec.ts` - CycloneDX ファイルのアップロード・編集・ダウンロードのシナリオテスト
- `helpers/test-utils.ts` - テスト用のヘルパー関数

## テストフィクスチャ

- `fixtures/sample-spdx.json` - テスト用の SPDX サンプルファイル
- `fixtures/sample-cyclonedx.json` - テスト用の CycloneDX サンプルファイル

## テストシナリオ

### SPDX ワークフロー

1. SPDX ファイルのアップロード
2. コンポーネントの編集（バージョン、説明など）
3. 編集後の SBOM のダウンロード
4. 必須フィールドのバリデーション
5. ライセンス情報の表示

### CycloneDX ワークフロー

1. CycloneDX ファイルのアップロード
2. コンポーネントの編集（バージョン、グループ、PURL など）
3. 編集後の SBOM のダウンロード
4. 必須フィールドのバリデーション
5. コンポーネントタイプの表示
6. カスタムプロパティの追加
7. ライセンス情報の表示

## 注意事項

- テストは開発サーバー（`npm run dev`）を自動的に起動します
- テスト実行後、`playwright-report/` ディレクトリにレポートが生成されます
- ダウンロードファイルは `e2e/downloads/` に一時保存され、テスト後に削除されます
