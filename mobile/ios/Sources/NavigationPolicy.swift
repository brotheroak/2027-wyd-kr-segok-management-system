import Foundation

enum NavigationPolicy {
    static let home = URL(string: "https://www.segokc.or.kr/")!
    static let apply = URL(string: "https://sgwyd2027.kr/apply")!
    private static let sites: Set<String> = ["www.segokc.or.kr", "segokc.or.kr", "newsegok.imweb.me", "sgwyd2027.kr", "www.sgwyd2027.kr"]
    private static let auth: Set<String> = ["kauth.kakao.com", "accounts.kakao.com"]
    private static func contains(_ url: URL, hosts: Set<String>) -> Bool {
        url.scheme?.lowercased() == "https" && url.user == nil && url.password == nil &&
        (url.port == nil || url.port == 443) && hosts.contains(url.host?.lowercased() ?? "")
    }
    static func isSite(_ url: URL) -> Bool { contains(url, hosts: sites) }
    static func isEmbedded(_ url: URL) -> Bool { isSite(url) || contains(url, hosts: auth) }
    static func isExternal(_ url: URL) -> Bool {
        if url.scheme?.lowercased() == "https" { return url.host != nil && url.user == nil && url.password == nil }
        return ["tel", "mailto", "sms"].contains(url.scheme?.lowercased() ?? "")
    }
}
