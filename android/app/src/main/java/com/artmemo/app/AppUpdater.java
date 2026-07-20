package com.artmemo.app;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import android.widget.Toast;

/**
 * GitHub Releases の固定URLから最新版APKを取得し、端末のインストーラーを開く。
 * ユーザーが毎回URLを入力する必要はない。
 */
final class AppUpdater {

    private static final String LATEST_APK_URL =
            "https://github.com/46hwhh6cqw-source/memo/releases/latest/download/ArtMemo.apk";

    private final Activity activity;

    AppUpdater(Activity activity) {
        this.activity = activity;
    }

    void start() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !activity.getPackageManager().canRequestPackageInstalls()) {
            Toast.makeText(activity,
                    "最初の1回だけ、このアプリからのインストールを許可してください。\n許可後にもう一度「更新」を押します。",
                    Toast.LENGTH_LONG).show();
            Intent settings = new Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + activity.getPackageName()));
            activity.startActivity(settings);
            return;
        }

        DownloadManager downloadManager =
                (DownloadManager) activity.getSystemService(Context.DOWNLOAD_SERVICE);
        if (downloadManager == null) {
            toast("更新を開始できませんでした");
            return;
        }

        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(LATEST_APK_URL))
                .setTitle("アートメモ帳を更新")
                .setDescription("最新版をダウンロードしています")
                .setMimeType("application/vnd.android.package-archive")
                .setNotificationVisibility(
                        DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setDestinationInExternalFilesDir(
                        activity, Environment.DIRECTORY_DOWNLOADS, "ArtMemo.apk");

        final long downloadId;
        try {
            downloadId = downloadManager.enqueue(request);
        } catch (Exception e) {
            toast("更新のダウンロードを開始できませんでした");
            return;
        }

        toast("最新版をダウンロードしています");

        BroadcastReceiver receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (!DownloadManager.ACTION_DOWNLOAD_COMPLETE.equals(intent.getAction())) return;
                long completedId = intent.getLongExtra(
                        DownloadManager.EXTRA_DOWNLOAD_ID, -1L);
                if (completedId != downloadId) return;

                try {
                    activity.unregisterReceiver(this);
                } catch (Exception ignored) {
                }

                DownloadManager.Query query = new DownloadManager.Query().setFilterById(downloadId);
                try (Cursor cursor = downloadManager.query(query)) {
                    if (cursor == null || !cursor.moveToFirst()) {
                        toast("更新ファイルを確認できませんでした");
                        return;
                    }
                    int statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
                    int status = statusIndex >= 0 ? cursor.getInt(statusIndex) : -1;
                    if (status != DownloadManager.STATUS_SUCCESSFUL) {
                        toast("更新のダウンロードに失敗しました");
                        return;
                    }
                }

                Uri apkUri = downloadManager.getUriForDownloadedFile(downloadId);
                if (apkUri == null) {
                    toast("更新ファイルを開けませんでした");
                    return;
                }

                Intent install = new Intent(Intent.ACTION_VIEW)
                        .setDataAndType(apkUri, "application/vnd.android.package-archive")
                        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                try {
                    activity.startActivity(install);
                } catch (Exception e) {
                    toast("インストール画面を開けませんでした");
                }
            }
        };

        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            activity.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            activity.registerReceiver(receiver, filter);
        }
    }

    private void toast(String message) {
        activity.runOnUiThread(() ->
                Toast.makeText(activity, message, Toast.LENGTH_LONG).show());
    }
}
