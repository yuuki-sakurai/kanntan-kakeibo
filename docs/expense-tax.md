# 品目ごとの消費税

- 入力・編集画面の各品目で「消費税を加算する」を選択する。初期状態は加算なし。
- 加算する場合は税抜単価を入力し、税率を0〜100%、小数点以下2桁まで指定できる。入力候補の初期値は `src/utils/expenseTax.ts` の `defaultTaxRate`（10）。8%や将来の税率も直接入力できる。
- 税額は品目ごとに `floor(単価 × 個数 × 税率 / 100)`、合計は税抜小計＋税額。税込価格の入力時は加算をオフにする。
- 税率は明細のスナップショットとして保存する。初期値の変更は過去の登録額に影響せず、過去の明細を修正するときだけ再計算する。

## API契約と反映順

POST `/api/v1/expenses` と PUT `/api/v1/expenses/{id}` の各itemsに `taxable: boolean` と `taxRate: number` を送る。加算なしの場合は `false` / `0` を送る。
レスポンスは各itemsに `taxable`、`taxRate`、サーバー計算の `taxAmount` を返す。支出・月別・日別・カテゴリ別の合計は税込とする。
旧クライアントから省略された税情報と既存・CSV明細は加算なしとして扱う。

税対応は共通Laravelの `kakeibo-app` に実装済み。新しい環境へ反映する際は `2026_09_17_000001_add_tax_to_expense_items.php` を含むmigrationを先に適用し、その後フロントを反映する。旧APIは追加フィールドを拒否するため、フロントだけを先に公開しない。

確認コマンド: Node.js 22.13.0以上の環境で `node --test tests/*.test.mjs`、`npm run build`。Dockerを使う場合は [READMEのホットリロード用構成](../README.md#ホットリロード用docker構成) を参照する。
