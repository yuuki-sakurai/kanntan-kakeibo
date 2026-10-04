# かんたん家計簿

Vue 3 + TypeScriptで作成した家計簿アプリのフロントエンドです。

家計簿とクレカ管理のCardDockは独立したSPAです。認証・API・DB・マイグレーションは共通のLaravelリポジトリ `kakeibo-app`（ローカルでは `household-env/src/kakeibo`）で管理します。支出 `Expense` とカード利用明細 `CreditCardTransaction` は別のデータで、カード明細を家計簿へ自動転記する機能はありません。

## 画面

- 月間一覧：月別合計、日別金額カレンダー、カテゴリ別集計、月全体・カテゴリ別の予算進捗
- 日別詳細：選択日の支出と品目内訳
- 支出入力・編集：日付、店舗、カテゴリ、品目、単価、個数、品目ごとの税加算、合計金額
- 設定 → CSVインポート：テンプレート取得、CSVの事前確認、一括登録
- 設定 → カテゴリ：カテゴリの一覧・追加
- 設定 → 月予算：月全体・カテゴリ別の予算設定

スマートフォンでは下部ナビを表示します。支出入力には品目一覧下の追加ボタン、追加した入力欄へのフォーカス、固定の合計・保存欄があります。

## 月予算

「設定 → 月予算」（`/#/settings/budget`）で対象月を選び、月全体と必要なカテゴリの予算を保存できます。予算はユーザー・月ごとに管理し、0円以上の整数で入力します。月全体の予算を空欄にするとカテゴリ別予算だけを設定でき、カテゴリの空欄は未設定として扱います。

月間一覧では支出実績に対する使用額・残額・超過額と進捗を確認できます。予算の取得・更新には共通Laravel APIの `/api/v1/monthly-budget` を使用します。

## カテゴリの追加

「設定 → カテゴリ」（`/#/settings/categories`）で、たとえば「お酒」「酒肴品」を1件ずつ追加できます。名前は50文字以内で、同名カテゴリは登録できません。

カテゴリ一覧はLaravel APIから取得し、支出入力・日別明細・カテゴリ別集計・CSVプレビューで共通利用します。CSVでは追加したカテゴリ名をそのまま指定できます。`src/stores/categories.ts` が共有状態と表示を管理し、一覧取得に失敗した場合は再読み込みボタンを表示します。

## CSVインポート

PCでは上部、スマートフォンでは下部の「設定」から利用します（`/#/settings/import`）。設定画面は子ルート構成で、今後設定項目を追加できます。

1. 「テンプレートをダウンロード」でCSVを取得し、サンプル2行を自分の支出に置き換えます。
2. CSVと文字コード（UTF-8またはShift_JIS）を選び、「内容を確認する」を押します。
3. 件数・合計・先頭20件を確認し、「○件を取り込む」を押します。

未登録カテゴリが含まれている場合は、CSV全体から該当する名前を一覧表示し、追加してよいか確認します。「OK：カテゴリを追加して取り込む」でカテゴリ・支出をまとめて登録します。「キャンセル」では何も保存せず、確認内容を閉じます。ファイルや文字コードを変更した場合は改めて確認が必要です。途中で保存に失敗した場合はカテゴリも含めて全件取り消します。

列は `日付,店舗,カテゴリ,品目,単価,数量` の順です。1行＝1支出・1品目で、同じ日付・店舗も別の支出として登録します。日本語のカテゴリ名または既存カテゴリIDを指定できます。上限は2MB・1,000件です。

不正な行があれば行番号付きエラーを表示し、全件未登録になります。ファイル全体の正規化した内容と行順が同じ場合は、ファイル名・改行・文字コードが変わっても再登録しません。行の追加・変更・並べ替えをしたCSVは別の取り込みになるため、取り込み済みの行を含めないでください。

必要なマイグレーションは共通Laravel側で適用します。フロントの起動・更新ではDBを初期化しません。

## 開発

### 共通Docker環境の標準構成

`household-env/src/kanntan-kakeibo` に配置し、環境リポジトリの初回セットアップを済ませてから、`household-env` で実行します。

```bash
docker compose up -d

# フロントのソース変更を通常URLへ反映する場合
docker compose build household-front
docker compose up -d --no-deps household-front
```

家計簿は `http://localhost:5174`、CardDockは既定で `http://localhost:5175` です。両SPAの `/api/` は各nginxから共通Laravelの `kakeibo-app:8080`（ネットワーク別名 `kakeibo-app.local`）へ転送します。共通MySQLの `kakeibo` データベースを使用します。

標準構成は各リポジトリのDockerfileを使用します。フロントはNodeでビルドした `dist/` をnginxで配信し、ソースをbind mountしません。編集後は上記の再ビルドが必要で、起動中の `household-front` コンテナにはnpmを実行する環境はありません。

新しいスキーマ変更がある場合のみ、`household-env` で `docker compose exec kakeibo-app php artisan migrate --force` を実行します。既存DBは `mysql-data` ボリュームに保持されます。`down -v` や `migrate:fresh` で初期化しないでください。

詳細な初回セットアップは環境リポジトリのREADMEを参照してください。

### ホットリロード用Docker構成

以下も `household-env` で実行します。標準構成と切り替えて使う構成です。

```bash
docker compose -f compose.dev.yml up -d --build --remove-orphans
docker compose -f compose.dev.yml exec kakeibo-app composer install

# スキーマ変更がある場合のみ
docker compose -f compose.dev.yml exec kakeibo-app php artisan migrate

# 型チェックを含むビルドと既存テスト
docker compose -f compose.dev.yml exec household-front npm run build
docker compose -f compose.dev.yml exec household-front sh -c 'node --test tests/*.test.mjs'

# 標準構成へ戻す場合
docker compose up -d --build --remove-orphans
```

開発構成ではソースをbind mountし、フロントをNode/Viteで実行します。APIはViteから `kakeibo-web` のnginxを経由してPHPコンテナへ転送します。標準構成と同じDBボリュームを使用し、家計簿のURLも `http://localhost:5174` のままです。

### Dockerを使わずフロントのみ起動する場合

Node.js 22.13.0以上を使用し、このリポジトリで実行します。APIとDBは別途起動しておく必要があります。

```bash
npm ci
npm run dev -- --port 5174 --strictPort
```

Viteは既定で `/api` を `http://localhost:8080` へ転送します。接続先は起動時の `API_PROXY_TARGET` で変更できます。

型チェックを含む本番ビルドと既存テスト：

```bash
npm run build
node --test tests/*.test.mjs
```

`package.json` に独立した `typecheck`・`lint`・`test` スクリプトはありません。`npm run build` が `vue-tsc -b` とViteビルドを実行します。

## API差し替え

設定例は `.env.example` を参照してください。ブラウザからの接続先は `VITE_API_BASE_URL`（既定 `/api/v1`）、Vite開発サーバーの転送先は `API_PROXY_TARGET`（既定 `http://localhost:8080`）です。Vite用の環境変数を変更したらViteを再起動し、配信用には再ビルドしてください。静的配信時は配信サーバーにも `/api` 転送が必要です。別オリジンへ接続する場合はBackendのCORS設定が必要です。

リポジトリのDockerfileでは `VITE_API_BASE_URL=/api/v1` を固定し、起動時の `BACKEND_HOST` でnginxの転送先を指定します。標準ローカル構成は環境リポジトリのnginxテンプレートに差し替えてDocker内HTTPを使います。本番用テンプレートはバックエンドの公開HTTPSホストへ転送します。詳しくは [Railway用の設定手順](docs/railway.md) を参照してください。

API通信は `src/api/expenseApi.ts` に集約し、同ファイル内の `HttpExpenseApi` がLaravel APIを呼び出します。家計簿では `/api/v1` 配下の `auth/*`、`expenses`（ID指定の取得・更新を含む）、`monthly-summary`、`monthly-budget`、`stores`、`categories`、`expense-imports`、`expense-imports/preview` を使用します。仕様はLaravelリポジトリの `docs/household-api.md` を参照してください。

### 支出を編集する

日別明細の支出カードをクリックすると編集画面が開きます。手入力・CSV取り込みのどちらも、日付・店舗・カテゴリ・品目・単価・個数を変更し、品目の追加・削除ができます。「変更を保存する」で更新後の日別明細へ戻ります。キャンセルでは保存しません。


## ログイン・新規登録

`/#/login` からメールアドレス・パスワードでログイン、`/#/register` から新規登録できます。名前、メールアドレス、12文字以上のパスワードと確認を入力します。パスワードはUTF-8で72バイト以内です。ログアウトはヘッダーから行えます（スマートフォンも対応）。

支出・店舗候補・独自カテゴリ・CSV履歴・月予算はユーザー単位で分離しています。初期9カテゴリだけが共通です。未ログイン時・セッション期限切れ時はログイン画面へ戻ります。業務データのAPIも認証必須です。セッションCookieはHttpOnly、CSRFトークンはメモリのみで保持し、localStorageには保存しません。

認証処理は `src/api/expenseApi.ts`、ログイン状態は `src/stores/auth.ts`、画面は `src/views/AuthView.vue` にあります。既存データの引き継ぎは管理者がLaravelの `expenses:assign-legacy` コマンドで実施します。

本リポジトリのDockerfileは同一オリジンのAPIプロキシを使用します。本番ではLaravelの `FRONTEND_ORIGINS` に利用するフロントのオリジンを指定し、`SESSION_SECURE_COOKIE=true` とします。Cookie等の設定は [Railway用の設定手順](docs/railway.md) を参照してください。

CardDockと同じアカウントを使えますが、別ドメインの両SPA間で自動ログインを共有するSSOは未実装です。メール確認・パスワード再設定メール・Google認証も未実装です。

## 文字の共通設定

フォント・サイズ・太さ・行間は `src/typography.css` で定義しています。両SPAで同じ定義を維持してください。[共通タイポグラフィ](docs/typography.md)を参照してください。
