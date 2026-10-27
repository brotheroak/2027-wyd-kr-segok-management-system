import XCTest
import WebKit
@testable import SegokChurch

/// Network-dependent checks against the production sites (read-only page loads, no login or form submission).
final class LiveSiteTests: XCTestCase {
    @MainActor
    private func load(_ url: URL, in controller: BrowserViewController) async throws {
        controller.webView.load(URLRequest(url: url))
        for _ in 0..<300 {
            try await Task.sleep(nanoseconds: 100_000_000)
            if !controller.webView.isLoading, controller.webView.estimatedProgress >= 1 { break }
        }
    }

    @MainActor
    func testProductionSitesLoadOverTrustedTLS() async throws {
        for url in [NavigationPolicy.home, NavigationPolicy.apply] {
            let controller = BrowserViewController(popup: true)
            controller.loadViewIfNeeded()
            try await load(url, in: controller)
            let loaded = try XCTUnwrap(controller.webView.url, url.absoluteString)
            XCTAssertEqual(loaded.scheme, "https", url.absoluteString)
            XCTAssertTrue(NavigationPolicy.isEmbedded(loaded), "Stayed in app: \(loaded)")
            // A failed TLS handshake would stop the load before a URL/title is committed.
            // WebKit may not expose serverTrust after same-document (SPA) URL changes, so only require it on the home page.
            if url == NavigationPolicy.home { XCTAssertNotNil(controller.webView.serverTrust, "TLS trust evaluated: \(url)") }
            XCTAssertTrue(controller.webView.hasOnlySecureContent, "No mixed content: \(url)")
            // Avoid evaluateJavaScript here: a page-level alert() would block it while the view is offscreen.
            XCTAssertFalse((controller.webView.title ?? "").isEmpty, "Page title rendered: \(url)")
        }
    }

    @MainActor
    func testBackNavigationReturnsToPreviousPage() async throws {
        let controller = BrowserViewController(popup: true)
        controller.loadViewIfNeeded()
        try await load(NavigationPolicy.home, in: controller)
        try await load(NavigationPolicy.apply, in: controller)
        XCTAssertTrue(controller.webView.canGoBack)
        controller.webView.goBack()
        for _ in 0..<200 {
            try await Task.sleep(nanoseconds: 100_000_000)
            if controller.webView.url?.host == NavigationPolicy.home.host, !controller.webView.isLoading { break }
        }
        XCTAssertEqual(controller.webView.url?.host, NavigationPolicy.home.host)
    }

}
