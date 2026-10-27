import XCTest
@testable import SegokChurch

final class NavigationPolicyTests: XCTestCase {
    func testChurchAndApplicationRemainEmbedded() {
        for value in ["https://www.segokc.or.kr/login", "https://sgwyd2027.kr/apply/volunteer", "https://newsegok.imweb.me/notice", "https://kauth.kakao.com/oauth/authorize"] {
            XCTAssertTrue(NavigationPolicy.isEmbedded(URL(string: value)!), value)
        }
    }
    func testLookalikesAndDangerousSchemesAreRejected() {
        for value in ["http://www.segokc.or.kr/", "https://www.segokc.or.kr.evil.test/", "https://evil@www.segokc.or.kr/", "https://www.segokc.or.kr:444/", "file:///etc/passwd", "javascript:alert(1)", "intent://launch"] {
            XCTAssertFalse(NavigationPolicy.isEmbedded(URL(string: value)!), value)
        }
    }
    func testExternalLinks() {
        XCTAssertTrue(NavigationPolicy.isExternal(URL(string: "tel:02-459-8211")!))
        XCTAssertFalse(NavigationPolicy.isExternal(URL(string: "file:///etc/passwd")!))
        XCTAssertFalse(NavigationPolicy.isSite(URL(string: "https://kauth.kakao.com/oauth/authorize")!))
    }
}
