package kr.segokc.shell

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Same cases as the iOS NavigationPolicyTests. */
class NavigationPolicyTest {
    @Test
    fun churchAndApplicationRemainEmbedded() {
        listOf(
            "https://www.segokc.or.kr/login",
            "https://sgwyd2027.kr/apply/volunteer",
            "https://newsegok.imweb.me/notice",
            "https://kauth.kakao.com/oauth/authorize",
            NavigationPolicy.HOME,
            NavigationPolicy.APPLY,
        ).forEach { assertTrue(it, NavigationPolicy.isEmbedded(it)) }
    }

    @Test
    fun lookalikesAndDangerousSchemesAreRejected() {
        listOf(
            "http://www.segokc.or.kr/",
            "https://www.segokc.or.kr.evil.test/",
            "https://evil@www.segokc.or.kr/",
            "https://www.segokc.or.kr:444/",
            "file:///etc/passwd",
            "javascript:alert(1)",
            "intent://launch",
            "content://com.android.providers/x",
            "about:blank",
            "not a url",
            "",
        ).forEach { assertFalse(it, NavigationPolicy.isEmbedded(it)) }
    }

    @Test
    fun externalLinks() {
        assertTrue(NavigationPolicy.isExternal("tel:02-459-8211"))
        assertTrue(NavigationPolicy.isExternal("mailto:a@example.com"))
        assertTrue(NavigationPolicy.isExternal("sms:0100000000"))
        assertTrue(NavigationPolicy.isExternal("https://example.com/page"))
        assertFalse(NavigationPolicy.isExternal("http://example.com/"))
        assertFalse(NavigationPolicy.isExternal("file:///etc/passwd"))
        assertFalse(NavigationPolicy.isExternal("intent://launch#Intent;scheme=x;end"))
        assertFalse(NavigationPolicy.isExternal("https://user@example.com/"))
        assertFalse(NavigationPolicy.isSite("https://kauth.kakao.com/oauth/authorize"))
    }
}
