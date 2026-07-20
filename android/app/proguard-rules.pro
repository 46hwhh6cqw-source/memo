# WebView から呼び出す JavaScript インターフェースを難読化から除外
-keepclassmembers class com.artmemo.app.WebAppBridge {
    public *;
}
