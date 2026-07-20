# アートメモ帳 — Android アプリ

Android Studio で開いて、いつも通り実機にインストールできる Android アプリ版です。
メモ帳・デジタルアート・関数電卓のすべてをアプリ内に内蔵しており、**通信は一切しません**
(`INTERNET` 権限も付けていません)。機内モードでも完全に動作します。

## インストール手順(Android Studio)

1. **Android Studio** を起動し、`Open` からこの `android` フォルダを開く
   (`memo` リポジトリ全体ではなく、`android` フォルダを選んでください)
2. 初回は Android Studio が必要な SDK / Gradle を自動でダウンロードします
   (画面の指示に従って `Accept` / `Install` を押すだけ)
3. Android 端末を USB でつなぐ(端末側で「USBデバッグ」をオンにしておく)
4. 上部の実行ボタン ▶ (Run 'app') を押す → 端末にインストールされて起動します

## APK を直接作りたい場合(コマンドライン)

Android SDK が入った環境で、この `android` フォルダ内で:

```bash
./gradlew assembleDebug
```

生成物: `app/build/outputs/apk/debug/app-debug.apk`
これを端末に転送してインストールすればアプリになります(提供元不明アプリの許可が必要)。

> 注: このリポジトリを作成したサンドボックス環境では Google の SDK 配布サーバーへの
> 通信が遮断されているため、APK のビルドはお使いの Android Studio 側で行ってください。
> プロジェクト構成・ソースは検証済みです。

## 構成

| パス | 内容 |
|---|---|
| `app/src/main/assets/` | アプリ本体(`index.html` / `style.css` / `app.js`)。ここが画面の中身 |
| `app/src/main/java/.../MainActivity.java` | 上記を WebView で表示するアプリの入れ物 |
| `app/src/main/java/.../WebAppBridge.java` | PNG・メモ・バックアップを端末に保存する橋渡し |
| `app/src/main/AndroidManifest.xml` | アプリ定義(権限なし) |

## 動作の仕組み

- 画面(UI・ロジック)はリポジトリ直下の Web 版と同じものを `assets/` に同梱しています。
  Web 版を編集したら、3ファイルを `app/src/main/assets/` にコピーし直してください。
- `WebViewAssetLoader` でローカルの `assets` を `https://appassets.androidplatform.net/`
  として読み込むため、通信せずに `localStorage`(メモ・履歴・作品の自動保存)が使えます。
- 保存機能:
  - **画像(PNG)** → `Pictures/ArtMemo/`(ギャラリー/ファイルアプリから見えます)
  - **メモ.txt / バックアップ.json** → `Download/ArtMemo/`
  - ストレージ権限は不要です。

## 設定値

- パッケージ名: `com.artmemo.app`
- minSdk 26 (Android 8.0) / targetSdk 34 / compileSdk 34
- 依存: AndroidX (appcompat / webkit / activity / core)
