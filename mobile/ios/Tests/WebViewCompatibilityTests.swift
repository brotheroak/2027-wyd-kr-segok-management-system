import XCTest
import WebKit
@testable import SegokChurch

final class WebViewCompatibilityTests: XCTestCase {
    @MainActor
    func testLocalFormAndFileInputExistInNativeWebKit() async throws {
        // Popup mode suppresses the initial production-page load.
        let controller = BrowserViewController(popup: true)
        controller.loadViewIfNeeded()
        let path = try XCTUnwrap(Bundle.main.url(forResource: "compatibility", withExtension: "html"))
        let html = try String(contentsOf: path, encoding: .utf8)
        controller.webView.loadHTMLString(html, baseURL: NavigationPolicy.home)
        var loaded = false
        for _ in 0..<100 {
            if let ready = try? await controller.webView.evaluateJavaScript("document.querySelector('#test-form')!==null"), (ready as? Bool) == true {
                loaded = true; break
            }
            try await Task.sleep(nanoseconds: 100_000_000)
        }
        XCTAssertTrue(loaded, "Bundled fixture must load")
        guard loaded else { return }
        _ = try await controller.webView.evaluateJavaScript("document.querySelector('#username').value='fixture-user';document.querySelector('#password').value='fixture-only';document.querySelector('#message').value='local test';document.querySelector('#test-form').requestSubmit();")
        let result = try await controller.webView.evaluateJavaScript("document.querySelector('#result').textContent")
        XCTAssertEqual(result as? String, "로컬 폼 확인 성공 — 서버 전송 없음")
        let count = try await controller.webView.evaluateJavaScript("document.querySelectorAll('input[type=file]').length")
        XCTAssertEqual(count as? Int, 1)
        // File chooser presentation/selection still requires an iPhone UI test or manual test.
    }
}
