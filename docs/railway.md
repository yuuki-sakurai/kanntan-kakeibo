# フロントを Railway に公開する

VueをNode.js 22でビルドし、生成したdistだけをnginxで配信します。
CDNは使用しません。API通信はブラウザ → フロントのnginx → バックエンドの公開HTTPS URLへ転送します。
家計簿とCardDockは独立したフロントエンドです。認証・API・DB・マイグレーションは共通のLaravelバックエンド `kakeibo-app` が管理します。この文書は家計簿フロントの設定手順で、各サービスの現在の本番反映状況を示すものではありません。

## 初回設定

1. このリポジトリを、バックエンド・MySQLと同じRailwayプロジェクトにGitHub Repoとして追加します。
2. Root Directoryはリポジトリルート、Dockerfileはルートの`Dockerfile`を使用します。
3. フロントサービスのVariablesに以下を登録します。

```dotenv
PORT=8080
BACKEND_HOST=実際のバックエンド公開ドメイン.up.railway.app
```

BACKEND_HOSTはホスト名のみです。https://・ポート番号・末尾スラッシュを付けません。
これは公開HTTPS接続用の設定なので、railway.internalは使用しません。
APP_KEYやDBの資格情報はフロントには登録しません。
VITE_API_BASE_URLはDockerfileで`/api/v1`に固定済みです。Variablesへの追加は不要です。

4. Settingsを以下に設定します。

| 項目 | 設定値 |
| --- | --- |
| Build Command | 空欄 |
| Start Command | 空欄（公式nginxイメージの起動処理を使用） |
| Pre-deploy Command | 空欄（フロントではmigrationを実行しない） |
| Healthcheck Path | /healthz |
| CDN Caching | OFF |

5. 変更を反映してデプロイします。Networkingから公開ドメインを発行します。Target Portは8080です。
6. バックエンドサービスのVariablesを確認して再デプロイします。

```dotenv
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
```

SESSION_DOMAINは未設定（項目を削除）にします。バックエンドのドメインを指定すると、フロント経由のCookieが拒否されます。
FRONTEND_ORIGINSはフロントの公開オリジン（https://を含む・末尾スラッシュなし）に合わせてください。
この構成のブラウザ通信は同一オリジンですが、バックエンドでOriginを検証する場合にも整合させます。
メール確認・パスワード再設定メールは現時点では未実装です。別ドメインの家計簿とCardDock間で自動ログインを共有するSSOも実装していません。

## 確認

- フロントの `/healthz` が200、本文okになること（nginxのみの確認）。
- `/` で画面が表示されること。
- フロントの `/api/v1/auth/session` が200でJSONを返すこと。
- ログイン後の再読み込みでもログインが維持されること。
- 支出登録・再読み込みでデータを取得できること。
- 下層画面を直接開いたり再読み込みしても表示されること。
- `/assets/存在しないファイル.js` がHTMLではなく404になること。

APIが502の場合はバックエンドの起動状態、BACKEND_HOST、nginxのエラーログを確認します。
419の場合はCookieが保存・送信されているか、SESSION_DOMAIN、CSRFトークンを確認します。
バックエンドのmigration失敗は別途解消する必要があります。

## ローカルでコンテナを確認する

```bash
docker build -t kakeibo-frontend:railway .
docker run --rm -p 8080:8080 -e PORT=8080 -e BACKEND_HOST=実際のバックエンド公開ドメイン.up.railway.app kakeibo-frontend:railway
curl -i http://localhost:8080/healthz
```

Secure Cookieを使用する本番ログインの最終確認はRailwayのHTTPS URLで行います。

## 更新とキャッシュ

接続ブランチへのpushを自動デプロイに接続すると、ビルドした画面が更新されます。
ハッシュ付きJS/CSSはブラウザで長期キャッシュし、index.htmlは保存させません。これはCDNの設定ではありません。
nginxは起動時にPORTとBACKEND_HOSTを設定へ反映するので、Variables変更後は再デプロイしてください。
バックエンド公開ドメインのIPはnginx起動時に解決します。DNS切り替え後に接続できない場合も再デプロイしてください。

公式資料: https://docs.railway.com/builds/dockerfiles / https://docs.railway.com/networking/public-networking
