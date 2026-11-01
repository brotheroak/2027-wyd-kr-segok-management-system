package kr.segokc.shell

import android.app.Activity
import android.app.Instrumentation
import android.content.Intent
import android.net.Uri
import androidx.test.espresso.intent.Intents
import androidx.test.espresso.intent.matcher.IntentMatchers.hasAction
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import androidx.test.espresso.intent.Intents.intended
import androidx.test.espresso.intent.Intents.intending
import java.io.File

/** Offline checks against the shared compatibility.html fixture (no network needed). */
@RunWith(AndroidJUnit4::class)
class FixtureTest {
    @Before fun setUp() = Intents.init()
    @After fun tearDown() = Intents.release()

    private fun androidx.test.core.app.ActivityScenario<MainActivity>.awaitFixture() =
        waitUntil(message = "fixture") { js("document.querySelector('#test-form')!==null") == "true" }

    @Test
    fun localFormAndFileInputWork() {
        launch("fixture").use { s ->
            s.awaitFixture()
            s.js("document.querySelector('#username').value='fixture-user';document.querySelector('#password').value='fixture-only';document.querySelector('#message').value='local test';document.querySelector('#test-form').requestSubmit();")
            assertEquals("\"로컬 폼 확인 성공 — 서버 전송 없음\"", s.js("document.querySelector('#result').textContent"))
            assertEquals("1", s.js("document.querySelectorAll('input[type=file]').length"))
        }
    }

    @Test
    fun fileChooserOpensAfterCancelAndDeliversSelectedFile() {
        val ctx = InstrumentationRegistry.getInstrumentation().targetContext
        val file = File(ctx.cacheDir, "upload-test.txt").apply { writeText("hello") }
        launch("fixture").use { s ->
            s.awaitFixture()
            // 1) cancel: the page must be able to open the chooser again afterwards.
            intending(hasAction(Intent.ACTION_GET_CONTENT)).respondWith(Instrumentation.ActivityResult(Activity.RESULT_CANCELED, null))
            s.tapElement("#attachment")
            waitUntil(message = "chooser launched (1)") { runCatching { intended(hasAction(Intent.ACTION_GET_CONTENT)); true }.getOrDefault(false) }
            Thread.sleep(1000)
            assertEquals("0", s.js("document.querySelector('#attachment').files.length"))
            // 2) pick a file.
            intending(hasAction(Intent.ACTION_GET_CONTENT)).respondWith(
                Instrumentation.ActivityResult(Activity.RESULT_OK, Intent().setData(Uri.fromFile(file))),
            )
            s.tapElement("#attachment")
            waitUntil(message = "selected file reaches the page") { s.js("document.querySelector('#attachment').files.length") == "1" }
            assertTrue(s.js("document.querySelector('#files').textContent").contains("upload-test.txt"))
        }
    }
}
