package kr.segokc.shell

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.matcher.ViewMatchers.withId
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

/** Read-only page loads of the production sites (network required). No login, no form submission. */
@RunWith(AndroidJUnit4::class)
class LiveSiteTest {
    @Test
    fun churchHomeLoadsOverTrustedTlsAndStaysInApp() {
        launch().use { s ->
            s.awaitPage("www.segokc.or.kr")
            val url = s.read { it.webView.url!! }
            assertTrue(url, url.startsWith("https://"))
            assertTrue(url, NavigationPolicy.isEmbedded(url))
            assertTrue("title rendered", !s.read { it.webView.title }.isNullOrBlank())
        }
    }

    @Test
    fun wydApplyPageLoads() {
        launch("apply").use { s ->
            s.awaitPage("sgwyd2027.kr")
            val url = s.read { it.webView.url!! }
            assertTrue(url, NavigationPolicy.isEmbedded(url))
            assertTrue("title rendered", !s.read { it.webView.title }.isNullOrBlank())
        }
    }

    @Test
    fun backButtonReturnsToPreviousPage() {
        launch().use { s ->
            s.awaitPage("www.segokc.or.kr")
            s.onActivity { it.webView.loadUrl(NavigationPolicy.APPLY) }
            s.awaitPage("sgwyd2027.kr")
            assertTrue(s.read { it.webView.canGoBack() })
            onView(withId(R.id.btnBack)).perform(click())
            s.awaitPage("www.segokc.or.kr")
            assertEquals("www.segokc.or.kr", java.net.URI(s.read { it.webView.url!! }).host)
        }
    }

    @Test
    fun cleartextTrafficIsDisabled() {
        val policy = android.security.NetworkSecurityPolicy.getInstance()
        assertTrue(!policy.isCleartextTrafficPermitted("www.segokc.or.kr"))
        assertTrue(!policy.isCleartextTrafficPermitted("sgwyd2027.kr"))
    }
}
