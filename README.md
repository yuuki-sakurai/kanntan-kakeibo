# かんたん家計簿

Vue 3 + TypeScriptで作成した家計簿アプリのフロントエンドです。

## 画面

- 月間一覧：月別合計、日別金額カレンダー、カテゴリ別集計
- 日別詳細：選択日の支出と品目内訳
- 支出入力：日付、店舗、カテゴリ、品目、単価、個数、合計金額

## 開発

### 共通Docker環境で開発する場合

`household-env/src/kanntan-kakeibo` に配置し、`household-env` で実行します。

```bash
docker compose up -d
docker compose exec household-front npm run build
```

家計簿は `http://localhost:5174` で開きます。`/api` は既存クレカ管理アプリのLaravel（`kakeibo-web`）へ転送します。Laravel側のAPI v1とDB保存は実装済みで、共通MySQLの `kakeibo` データベースを使用します。画面はHTTP APIに接続済みで、登録内容はDBに保存されます。クレカ管理アプリのフロント・バックは現時点では分離しません。

詳細な初回セットアップは環境リポジトリのREADMEを参照してください。

### Dockerを使わずフロントのみ起動する場合

```bash
npm install
npm run dev
```

型チェックを含む本番ビルド：

```bash
npm run build
```

## API差し替え

設定例は `.env.example` を参照してください。環境変数の変更後はViteを再起動し、配信用には再ビルドしてください。静的配信時は配信サーバーにも `/api` 転送が必要です。別オリジンへ接続する場合はBackendのCORS設定が必要です。

APIクライアントのテストは `household-env` で `docker compose exec household-front node --test tests/expenseApi.test.mjs` を実行します。

画面は `src/api/expenseApi.ts` の `ExpenseApi` インターフェースだけを参照します。現在は同ファイル内の `HttpExpenseApi` がLaravel APIを呼び出します。Laravel側に `/api/v1/expenses`、`/api/v1/monthly-summary`、`/api/v1/stores` を実装済みです。接続先は `VITE_API_BASE_URL`（既定 `/api/v1`）で変更できます。仕様はLaravelリポジトリの `docs/household-api.md` を参照してください。
