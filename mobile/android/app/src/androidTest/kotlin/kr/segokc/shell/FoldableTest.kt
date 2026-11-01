package kr.segokc.shell

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

/** Simulates fold/unfold (display size + density change) and rotation: the activity must not restart. */
@RunWith(AndroidJUnit4::class)
class FoldableTest {
    @After
    fun resetDisplay() {
        shell("wm size reset")
        shell("wm density reset")
        shell("settings put system accelerometer_rotation 1")
    }

    @Test
    fun foldUnfoldAndRotationKeepActivityAndFormInput() {
        launch("fixture").use { s ->
            waitUntil(message = "fixture") { s.js("document.querySelector('#test-form')!==null") == "true" }
            s.js("document.querySelector('#message').value='keep-me'")
            val original = s.read { it }
            val before = s.read { it.configurationChangeCount }
            val sizeBefore = s.read { it.resources.configuration.screenWidthDp }

            // Unfolded 7.6" inner display -> folded cover display -> back.
            shell("wm size 1080x2400"); shell("wm density 420")
            waitUntil(message = "config change (fold)") { s.read { it.configurationChangeCount } > before }
            val mid = s.read { it.configurationChangeCount }
            shell("wm size reset"); shell("wm density reset")
            waitUntil(message = "config change (unfold)") { s.read { it.configurationChangeCount } > mid }
            // Rotation.
            shell("settings put system accelerometer_rotation 0")
            shell("settings put system user_rotation 1")
            Thread.sleep(2500)
            shell("settings put system user_rotation 0")
            Thread.sleep(1500)

            assertSame("activity instance preserved (not recreated)", original, s.read { it })
            assertFalse(s.read { it.isDestroyed })
            assertEquals("\"keep-me\"", s.js("document.querySelector('#message').value"))
            assertTrue(s.read { it.configurationChangeCount } > before)
            assertTrue(sizeBefore > 0)
        }
    }
}
