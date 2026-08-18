package id.rimpu.app

import android.Manifest
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.webkit.CookieManager
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private var geoCallback: GeolocationPermissions.Callback? = null
    private var geoOrigin: String? = null
    private var fileCallback: ValueCallback<Array<Uri>>? = null

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { result ->
        val granted = (result[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                result[Manifest.permission.ACCESS_COARSE_LOCATION] == true)
        geoCallback?.invoke(geoOrigin, granted, false)
        geoCallback = null
        geoOrigin = null
    }

    private val filePicker = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val callback = fileCallback ?: return@registerForActivityResult
        val uris = if (result.resultCode == RESULT_OK && result.data != null) {
            val data = result.data!!
            val clip = data.clipData
            if (clip != null) Array(clip.itemCount) { i -> clip.getItemAt(i).uri }
            else data.data?.let { arrayOf(it) } ?: emptyArray()
        } else emptyArray()
        callback.onReceiveValue(uris)
        fileCallback = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        webView = findViewById(R.id.webView)
        configureWebView()
        webView.loadUrl("https://anggidwisss-boop.github.io/SIMETER/?v=20260818-rimpu-pln-final-v2")
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() { if (webView.canGoBack()) webView.goBack() else finish() }
        })
    }

    private fun configureWebView() {
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            javaScriptCanOpenWindowsAutomatically = true
            setSupportMultipleWindows(false)
            cacheMode = WebSettings.LOAD_NO_CACHE
            userAgentString = "$userAgentString RIMPU-Android/1.2.0-PLN-UP3-BIMA"
        }
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                view.evaluateJavascript("(function(){var s=document.createElement('script');s.src='https://anggidwisss-boop.github.io/SIMETER/rimpu-pln-final-v2.js?v=20260818-rimpu-pln-final-v2';document.body.appendChild(s);})();", null)
            }
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url.toString()
                return if (url.startsWith("https://") || url.startsWith("http://")) false else { try { startActivity(Intent(Intent.ACTION_VIEW, request.url)) } catch (_: Exception) {}; true }
            }
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) { runOnUiThread { val resources=request.resources.filter { it==PermissionRequest.RESOURCE_VIDEO_CAPTURE || it==PermissionRequest.RESOURCE_AUDIO_CAPTURE }.toTypedArray(); if(resources.isNotEmpty())request.grant(resources) } }
            override fun onGeolocationPermissionsShowPrompt(origin: String, callback: GeolocationPermissions.Callback) {
                if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED || ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED) callback.invoke(origin,true,false)
                else { geoOrigin=origin;geoCallback=callback;permissionLauncher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION)) }
            }
            override fun onShowFileChooser(webView: WebView, filePathCallback: ValueCallback<Array<Uri>>, fileChooserParams: FileChooserParams): Boolean {
                fileCallback?.onReceiveValue(null);fileCallback=filePathCallback
                val intent=Intent(Intent.ACTION_OPEN_DOCUMENT).apply{addCategory(Intent.CATEGORY_OPENABLE);type="image/*";putExtra(Intent.EXTRA_ALLOW_MULTIPLE,true)}
                filePicker.launch(intent);return true
            }
        }
        webView.setDownloadListener { url,userAgent,contentDisposition,mimeType,_ -> try {
            val filename=URLUtil.guessFileName(url,contentDisposition,mimeType)
            val req=DownloadManager.Request(Uri.parse(url)).setMimeType(mimeType).setTitle(filename).setDescription("RIMPU PLN UP3 Bima").addRequestHeader("User-Agent",userAgent).setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED).setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS,filename)
            (getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(req);Toast.makeText(this,"File diunduh ke folder Download",Toast.LENGTH_SHORT).show()
        } catch (_:Exception){Toast.makeText(this,"Gagal mengunduh file",Toast.LENGTH_SHORT).show()} }
    }
    override fun onDestroy(){webView.stopLoading();webView.destroy();super.onDestroy()}
}
