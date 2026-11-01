package kr.segokc.shell

import android.content.Context
import android.content.Intent
import android.os.ParcelFileDescriptor
import android.view.MotionEvent
import android.os.SystemClock
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.platform.app.InstrumentationRegistry
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

fun launch(startPage: String? = null): ActivityScenario<MainActivity> {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val intent = Intent(context, MainActivity::class.java)
    if (startPage != null) intent.putExtra(MainActivity.DEBUG_START_PAGE, startPage)
    return ActivityScenario.launch(intent)
}

fun <T> ActivityScenario<MainActivity>.read(block: (MainActivity) -> T): T {
    var result: Any? = null
    onActivity { result = block(it) }
    @Suppress("UNCHECKED_CAST")
    return result as T
}

fun waitUntil(timeoutMs: Long = 60_000, message: String, condition: () -> Boolean) {
    val end = SystemClock.uptimeMillis() + timeoutMs
    while (SystemClock.uptimeMillis() < end) {
        if (condition()) return
        Thread.sleep(200)
    }
    throw AssertionError("Timed out: $message")
}

/** Waits until the WebView finished loading a page whose URL host matches [host]. */
fun ActivityScenario<MainActivity>.awaitPage(host: String) {
    waitUntil(message = "page load for $host") {
        read { it.webView.progress == 100 && runCatching { java.net.URI(it.webView.url ?: "").host }.getOrNull() == host }
    }
}

/** evaluateJavascript is async; this blocks the test thread and returns the raw JSON result. */
fun ActivityScenario<MainActivity>.js(script: String): String {
    val latch = CountDownLatch(1)
    var value = ""
    onActivity { a -> a.webView.evaluateJavascript(script) { value = it ?: ""; latch.countDown() } }
    check(latch.await(15, TimeUnit.SECONDS)) { "evaluateJavascript timed out: $script" }
    return value
}

fun shell(command: String): String {
    val pfd = InstrumentationRegistry.getInstrumentation().uiAutomation.executeShellCommand(command)
    return ParcelFileDescriptor.AutoCloseInputStream(pfd).use { it.readBytes().toString(Charsets.UTF_8) }
}

/** A real touch (with user gesture), as JavaScript click() cannot open the file chooser. */
fun ActivityScenario<MainActivity>.tapElement(selector: String) {
    js("document.querySelector('$selector').scrollIntoView({block:'center'})")
    Thread.sleep(500)
    val rect = js(
        "(function(){var r=document.querySelector('$selector').getBoundingClientRect();" +
            "return [r.left+r.width/2, r.top+r.height/2, window.devicePixelRatio].join(',')})()",
    ).trim('"').split(',').map { it.toFloat() }
    val loc = IntArray(2)
    var width = 0
    onActivity { a -> a.webView.getLocationOnScreen(loc); width = a.webView.width }
    val x = loc[0] + rect[0] * rect[2]
    val y = loc[1] + rect[1] * rect[2]
    val inst = InstrumentationRegistry.getInstrumentation()
    val t = SystemClock.uptimeMillis()
    inst.sendPointerSync(MotionEvent.obtain(t, t, MotionEvent.ACTION_DOWN, x, y, 0))
    inst.sendPointerSync(MotionEvent.obtain(t, t + 80, MotionEvent.ACTION_UP, x, y, 0))
}
