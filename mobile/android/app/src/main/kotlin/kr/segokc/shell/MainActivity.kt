package kr.segokc.shell

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.net.Uri
import android.net.http.SslError
import android.os.Bundle
import android.os.Message
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.GeolocationPermissions
import android.webkit.JsPromptResult
import android.webkit.JsResult
import android.webkit.PermissionRequest
import android.webkit.RenderProcessGoneDetail
import android.webkit.SslErrorHandler
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import java.io.IOException

/**
 * Hosts the church site and the WYD application site in a WebView (behaviour matches the iOS app).
 * Declared with configChanges in the manifest, so fold/unfold, rotation and resizing never recreate it.
 */
class MainActivity : AppCompatActivity() {
    internal lateinit var webView: WebView
        private set
    private lateinit var progress: ProgressBar
    private lateinit var popupContainer: View
    private lateinit var popupHost: FrameLayout
    private var popup: WebView? = null
    private var fileCallback: ValueCallback<Array<Uri>>? = null

    /** Incremented by onConfigurationChanged; lets tests prove folding does not restart the activity. */
    @Volatile
    internal var configurationChangeCount = 0
        private set

    private val fileChooser = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        // parseResult returns null for cancel, which still must be reported or the page can never reopen the chooser.
        fileCallback?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data))
        fileCallback = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT),
        )
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val root = findViewById<View>(R.id.root)
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout() or WindowInsetsCompat.Type.ime(),
            )
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            WindowInsetsCompat.CONSUMED
        }

        progress = findViewById(R.id.progress)
        popupContainer = findViewById(R.id.popupContainer)
        popupHost = findViewById(R.id.popupHost)
        webView = findViewById(R.id.webView)
        configure(webView, isPopup = false)

        findViewById<View>(R.id.btnBack).setOnClickListener { navigateBack() }
        findViewById<View>(R.id.btnHome).setOnClickListener { confirmLeaving { webView.loadUrl(NavigationPolicy.HOME) } }
        findViewById<View>(R.id.btnApply).setOnClickListener { confirmLeaving { webView.loadUrl(NavigationPolicy.APPLY) } }
        findViewById<View>(R.id.btnRefresh).setOnClickListener { confirmLeaving { webView.reload() } }
        findViewById<View>(R.id.btnPopupClose).setOnClickListener { closePopup() }
        findViewById<View>(R.id.btnPopupBack).setOnClickListener { navigateBack() }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (!navigateBack()) {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) loadStartPage()
    }

    private fun loadStartPage() {
        if (BuildConfig.DEBUG) {
            // Debug-only start page for automated screenshots/tests: --es SegokStartPage apply|fixture
            when (intent?.getStringExtra(DEBUG_START_PAGE)) {
                "apply" -> { webView.loadUrl(NavigationPolicy.APPLY); return }
                "fixture" -> { loadFixture(); return }
            }
        }
        webView.loadUrl(NavigationPolicy.HOME)
    }

    private fun loadFixture() {
        try {
            val html = assets.open("compatibility.html").bufferedReader(Charsets.UTF_8).use { it.readText() }
            webView.loadDataWithBaseURL(NavigationPolicy.HOME, html, "text/html", "UTF-8", null)
        } catch (_: IOException) {
            webView.loadUrl(NavigationPolicy.HOME)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onPause() {
        CookieManager.getInstance().flush() // persist session cookies (login) to disk
        super.onPause()
    }

    override fun onConfigurationChanged(newConfig: android.content.res.Configuration) {
        super.onConfigurationChanged(newConfig)
        configurationChangeCount++
    }

    override fun onDestroy() {
        fileCallback?.onReceiveValue(null)
        fileCallback = null
        closePopup()
        webView.destroy()
        super.onDestroy()
    }

    /** Pop-up first, then page history. Returns false when there is nothing left to go back to. */
    private fun navigateBack(): Boolean {
        val p = popup
        if (p != null) {
            if (p.canGoBack()) p.goBack() else closePopup()
            return true
        }
        if (webView.canGoBack()) {
            webView.goBack()
            return true
        }
        return false
    }

    private fun confirmLeaving(action: () -> Unit) {
        AlertDialog.Builder(this)
            .setTitle(R.string.leave_title)
            .setMessage(R.string.leave_message)
            .setNegativeButton(R.string.cancel, null)
            .setPositiveButton(R.string.proceed) { _, _ -> action() }
            .show()
    }

    private fun showMessage(message: Int) {
        if (!isFinishing && !isDestroyed) Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }

    private fun openExternal(url: String): Boolean {
        return try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addCategory(Intent.CATEGORY_BROWSABLE))
            true
        } catch (_: ActivityNotFoundException) {
            showMessage(R.string.link_blocked)
            false
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configure(view: WebView, isPopup: Boolean) {
        view.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(true)
            allowFileAccess = false
            allowContentAccess = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            mediaPlaybackRequiresUserGesture = true
            useWideViewPort = true
            loadWithOverviewMode = true
            setSupportZoom(true)
            builtInZoomControls = true
            displayZoomControls = false
        }
        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(view, true) // Kakao sign-in and embedded forms
        }
        view.webViewClient = SegokClient(isPopup)
        view.webChromeClient = SegokChrome(isPopup)
        view.setDownloadListener { url, _, _, _, _ ->
            if (NavigationPolicy.isExternal(url)) {
                showMessage(R.string.file_in_browser)
                openExternal(url)
            }
        }
    }

    private fun openPopup(): WebView {
        closePopup()
        val view = WebView(this)
        configure(view, isPopup = true)
        popupHost.addView(view, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        popupContainer.visibility = View.VISIBLE
        popup = view
        return view
    }

    private fun closePopup() {
        val view = popup ?: return
        popup = null
        popupContainer.visibility = View.GONE
        popupHost.removeView(view)
        view.stopLoading()
        view.destroy()
    }

    private inner class SegokClient(private val isPopup: Boolean) : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            // Don't reroute subframes (e.g. address search widgets).
            if (!request.isForMainFrame) return false
            val url = request.url.toString()
            if (NavigationPolicy.isEmbedded(url)) return false
            if (isPopup && url == "about:blank") return false
            if (NavigationPolicy.isExternal(url)) openExternal(url) else showMessage(R.string.link_blocked)
            if (isPopup) view.post { closePopup() }
            return true
        }

        override fun onPageStarted(view: WebView, url: String?, favicon: Bitmap?) {
            if (!isPopup) {
                progress.visibility = View.VISIBLE
                return
            }
            // A pop-up's first navigation is not always routed through shouldOverrideUrlLoading.
            if (url != null && url != "about:blank" && !NavigationPolicy.isEmbedded(url)) {
                view.stopLoading()
                if (NavigationPolicy.isExternal(url)) openExternal(url) else showMessage(R.string.link_blocked)
                view.post { closePopup() }
            }
        }

        override fun onPageFinished(view: WebView, url: String?) {
            if (!isPopup) progress.visibility = View.GONE
            CookieManager.getInstance().flush()
        }

        override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
            if (request.isForMainFrame && error.errorCode != ERROR_UNKNOWN) showMessage(R.string.load_failed)
        }

        // Never call handler.proceed(): certificate errors are not bypassed.
        override fun onReceivedSslError(view: WebView, handler: SslErrorHandler, error: SslError) {
            handler.cancel()
            showMessage(R.string.tls_failed)
        }

        override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
            showMessage(R.string.renderer_gone)
            runOnUiThread { recreate() }
            return true
        }
    }

    private inner class SegokChrome(private val isPopup: Boolean) : WebChromeClient() {
        override fun onProgressChanged(view: WebView, newProgress: Int) {
            if (!isPopup) {
                progress.progress = newProgress
                progress.visibility = if (newProgress >= 100) View.GONE else View.VISIBLE
            }
        }

        override fun onCreateWindow(view: WebView, isDialog: Boolean, isUserGesture: Boolean, resultMsg: Message): Boolean {
            val origin = view.url
            if (origin == null || !NavigationPolicy.isEmbedded(origin)) return false
            val transport = resultMsg.obj as? WebView.WebViewTransport ?: return false
            // The pop-up shares the cookie jar so window.opener sign-in flows keep working.
            transport.webView = openPopup()
            resultMsg.sendToTarget()
            return true
        }

        override fun onCloseWindow(window: WebView) {
            if (window === popup) closePopup()
        }

        // Live camera/microphone/location is outside this wrapper; the file picker works independently.
        override fun onPermissionRequest(request: PermissionRequest) = request.deny()

        override fun onGeolocationPermissionsShowPrompt(origin: String?, callback: GeolocationPermissions.Callback) =
            callback.invoke(origin, false, false)

        override fun onShowFileChooser(
            webView: WebView,
            filePathCallback: ValueCallback<Array<Uri>>,
            fileChooserParams: FileChooserParams,
        ): Boolean {
            fileCallback?.onReceiveValue(null)
            fileCallback = filePathCallback
            return try {
                fileChooser.launch(fileChooserParams.createIntent())
                true
            } catch (_: ActivityNotFoundException) {
                fileCallback = null
                filePathCallback.onReceiveValue(null)
                showMessage(R.string.no_file_picker)
                true
            }
        }

        private fun host(url: String?): String? = url?.let { runCatching { Uri.parse(it).host }.getOrNull() }

        override fun onJsAlert(view: WebView, url: String?, message: String?, result: JsResult): Boolean {
            if (isFinishing) { result.cancel(); return true }
            AlertDialog.Builder(this@MainActivity).setTitle(host(url)).setMessage(message)
                .setPositiveButton(R.string.ok) { _, _ -> result.confirm() }
                .setOnCancelListener { result.cancel() }.show()
            return true
        }

        override fun onJsConfirm(view: WebView, url: String?, message: String?, result: JsResult): Boolean {
            if (isFinishing) { result.cancel(); return true }
            AlertDialog.Builder(this@MainActivity).setTitle(host(url)).setMessage(message)
                .setPositiveButton(R.string.ok) { _, _ -> result.confirm() }
                .setNegativeButton(R.string.cancel) { _, _ -> result.cancel() }
                .setOnCancelListener { result.cancel() }.show()
            return true
        }

        override fun onJsPrompt(view: WebView, url: String?, message: String?, defaultValue: String?, result: JsPromptResult): Boolean {
            if (isFinishing) { result.cancel(); return true }
            val input = EditText(this@MainActivity).apply { setText(defaultValue) }
            AlertDialog.Builder(this@MainActivity).setTitle(host(url)).setMessage(message).setView(input)
                .setPositiveButton(R.string.ok) { _, _ -> result.confirm(input.text.toString()) }
                .setNegativeButton(R.string.cancel) { _, _ -> result.cancel() }
                .setOnCancelListener { result.cancel() }.show()
            return true
        }
    }

    companion object {
        const val DEBUG_START_PAGE = "SegokStartPage"
    }
}
