package kr.segokc.shell

import java.net.URI

/**
 * Which URLs stay inside the app and which go to an external app. Mirrors the iOS NavigationPolicy.
 * Uses java.net.URI (not android.net.Uri) so the rules are covered by plain JVM unit tests.
 */
object NavigationPolicy {
    const val HOME = "https://www.segokc.or.kr/"
    const val APPLY = "https://sgwyd2027.kr/apply"

    private val sites = setOf("www.segokc.or.kr", "segokc.or.kr", "newsegok.imweb.me", "sgwyd2027.kr", "www.sgwyd2027.kr")
    private val auth = setOf("kauth.kakao.com", "accounts.kakao.com")
    private val externalSchemes = setOf("tel", "mailto", "sms")

    private fun parse(url: String): URI? = try { URI(url) } catch (_: Exception) { null }

    private fun contains(url: String, hosts: Set<String>): Boolean {
        val uri = parse(url) ?: return false
        return uri.scheme?.lowercase() == "https" && uri.userInfo == null &&
            (uri.port == -1 || uri.port == 443) && hosts.contains(uri.host?.lowercase() ?: "")
    }

    fun isSite(url: String): Boolean = contains(url, sites)

    /** Church/WYD sites plus Kakao sign-in: loaded inside the app. */
    fun isEmbedded(url: String): Boolean = isSite(url) || contains(url, auth)

    /** Anything else that is safe to hand to the system (browser, dialer, mail, SMS). */
    fun isExternal(url: String): Boolean {
        val uri = parse(url) ?: return false
        val scheme = uri.scheme?.lowercase() ?: return false
        if (scheme == "https") return uri.host != null && uri.userInfo == null
        return scheme in externalSchemes
    }
}
