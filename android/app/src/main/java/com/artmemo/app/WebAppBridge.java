package com.artmemo.app;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * Web アプリ側の saveFile() から呼ばれ、受け取ったデータを端末のストレージへ保存する。
 * 画像は「Pictures/ArtMemo」、その他(メモ・バックアップ)は「Download/ArtMemo」へ。
 * ストレージ権限は不要(Android 10+ は MediaStore、それ未満はアプリ専用領域を使用)。
 */
public class WebAppBridge {

    private final Context context;

    WebAppBridge(Context context) {
        this.context = context.getApplicationContext();
    }

    @JavascriptInterface
    public void saveBase64(String filename, String base64, String mime) {
        try {
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            String location = save(sanitize(filename), bytes, mime == null ? "" : mime);
            toast("保存しました:\n" + location);
        } catch (Exception e) {
            toast("保存に失敗しました");
        }
    }

    private String save(String filename, byte[] bytes, String mime) throws Exception {
        boolean isImage = mime.startsWith("image/");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentResolver cr = context.getContentResolver();
            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
            if (!mime.isEmpty()) {
                values.put(MediaStore.MediaColumns.MIME_TYPE, mime);
            }
            Uri collection;
            String shownDir;
            if (isImage) {
                values.put(MediaStore.MediaColumns.RELATIVE_PATH,
                        Environment.DIRECTORY_PICTURES + "/ArtMemo");
                collection = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
                shownDir = "Pictures/ArtMemo/";
            } else {
                values.put(MediaStore.MediaColumns.RELATIVE_PATH,
                        Environment.DIRECTORY_DOWNLOADS + "/ArtMemo");
                collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
                shownDir = "Download/ArtMemo/";
            }
            Uri uri = cr.insert(collection, values);
            if (uri == null) throw new Exception("insert failed");
            try (OutputStream out = cr.openOutputStream(uri)) {
                if (out == null) throw new Exception("stream null");
                out.write(bytes);
            }
            return shownDir + filename;
        } else {
            File dir = context.getExternalFilesDir(
                    isImage ? Environment.DIRECTORY_PICTURES : Environment.DIRECTORY_DOWNLOADS);
            File outFile = new File(dir, filename);
            try (FileOutputStream fos = new FileOutputStream(outFile)) {
                fos.write(bytes);
            }
            return outFile.getAbsolutePath();
        }
    }

    private static String sanitize(String name) {
        if (name == null || name.trim().isEmpty()) return "artmemo_file";
        return name.replaceAll("[\\\\/:*?\"<>|]", "_");
    }

    private void toast(final String message) {
        new Handler(Looper.getMainLooper()).post(
                () -> Toast.makeText(context, message, Toast.LENGTH_LONG).show());
    }
}
