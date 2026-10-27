import UIKit
import WebKit

final class BrowserViewController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    let webView: WKWebView
    private let popup: Bool
    private let progress = UIProgressView(progressViewStyle: .default)
    private var progressObservation: NSKeyValueObservation?
    private var urlObservation: NSKeyValueObservation?

    init(configuration: WKWebViewConfiguration? = nil, popup: Bool = false) {
        let config = configuration ?? WKWebViewConfiguration()
        if configuration == nil { config.websiteDataStore = .default() }
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        config.preferences.javaScriptCanOpenWindowsAutomatically = false
        self.webView = WKWebView(frame: .zero, configuration: config)
        self.popup = popup
        super.init(nibName: nil, bundle: nil)
        self.webView.navigationDelegate = self
        self.webView.uiDelegate = self
    }
    required init?(coder: NSCoder) { fatalError("Use init(configuration:popup:)") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.keyboardDismissMode = .interactive
        view.addSubview(webView)
        progress.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(progress)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            progress.topAnchor.constraint(equalTo: webView.topAnchor),
            progress.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            progress.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
        navigationItem.title = "세곡동성당"
        navigationItem.rightBarButtonItem = UIBarButtonItem(barButtonSystemItem: .refresh, target: self, action: #selector(refreshPage))
        if popup { navigationItem.leftBarButtonItem = UIBarButtonItem(barButtonSystemItem: .close, target: self, action: #selector(closePopup)) }
        toolbarItems = [
            UIBarButtonItem(title: "뒤로", style: .plain, target: self, action: #selector(goBack)),
            UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil),
            UIBarButtonItem(title: "성당 홈", style: .plain, target: self, action: #selector(goHome)),
            UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil),
            UIBarButtonItem(title: "WYD 신청", style: .plain, target: self, action: #selector(goApply))
        ]
        #if DEBUG
        navigationItem.leftBarButtonItems = (navigationItem.leftBarButtonItem.map { [$0] } ?? []) + [UIBarButtonItem(title: "테스트", style: .plain, target: self, action: #selector(showDiagnostics))]
        #endif
        navigationController?.setToolbarHidden(false, animated: false)
        progressObservation = webView.observe(\.estimatedProgress, options: [.new]) { [weak self] web, _ in
            self?.progress.progress = Float(web.estimatedProgress)
            self?.progress.isHidden = web.estimatedProgress >= 1
        }
        urlObservation = webView.observe(\.url, options: [.new]) { [weak self] web, _ in self?.navigationItem.title = web.url?.host ?? "세곡동성당" }
        if !popup { webView.load(URLRequest(url: NavigationPolicy.home)) }
    }

    @objc private func goBack() { if webView.canGoBack { webView.goBack() } else if popup { closePopup() } }
    @objc private func closePopup() { dismiss(animated: true) }
    @objc private func refreshPage() { confirmLeaving { [weak self] in self?.webView.reload() } }
    @objc private func goHome() { confirmLeaving { [weak self] in self?.webView.load(URLRequest(url: NavigationPolicy.home)) } }
    @objc private func goApply() { confirmLeaving { [weak self] in self?.webView.load(URLRequest(url: NavigationPolicy.apply)) } }
    private func confirmLeaving(_ action: @escaping () -> Void) {
        let alert = UIAlertController(title: "페이지 이동", message: "작성 중인 내용이 사라질 수 있습니다.", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "취소", style: .cancel))
        alert.addAction(UIAlertAction(title: "계속", style: .default) { _ in action() })
        present(alert, animated: true)
    }
    #if DEBUG
    @objc private func showDiagnostics() {
        guard let url = Bundle.main.url(forResource: "compatibility", withExtension: "html"),
              let html = try? String(contentsOf: url, encoding: .utf8) else { return }
        webView.loadHTMLString(html, baseURL: NavigationPolicy.home)
    }
    #endif

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { decisionHandler(.cancel); return }
        // Don't reroute form subframes (e.g. address search). Never inject a native bridge.
        if let frame = action.targetFrame, !frame.isMainFrame { decisionHandler(.allow); return }
        if NavigationPolicy.isEmbedded(url) { decisionHandler(.allow); return }
        decisionHandler(.cancel)
        if NavigationPolicy.isExternal(url) { UIApplication.shared.open(url) }
        else { showMessage("이 링크는 앱에서 열 수 없습니다.") }
    }
    func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        if response.canShowMIMEType { decisionHandler(.allow); return }
        decisionHandler(.cancel)
        if let url = response.response.url, NavigationPolicy.isExternal(url) {
            showMessage("파일은 브라우저에서 엽니다. 필요한 경우 다시 로그인해 주세요.")
            UIApplication.shared.open(url)
        }
    }
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        guard let origin = webView.url, NavigationPolicy.isEmbedded(origin),
              let url = action.request.url, NavigationPolicy.isEmbedded(url) else {
            if let url = action.request.url, NavigationPolicy.isExternal(url) { UIApplication.shared.open(url) }
            return nil
        }
        // Keep WebKit's supplied configuration/data store so window.opener + login cookies survive.
        let child = BrowserViewController(configuration: configuration, popup: true)
        let navigation = UINavigationController(rootViewController: child)
        navigation.modalPresentationStyle = .fullScreen
        present(navigation, animated: true)
        return child.webView
    }
    func webViewDidClose(_ webView: WKWebView) { if popup { closePopup() } }
    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) {
        // Live camera/microphone (e.g. attendance scanning) is outside this wrapper milestone.
        // The system file-input photo picker continues to work independently.
        decisionHandler(.deny)
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { handleError(error) }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { handleError(error) }
    private func handleError(_ error: Error) {
        if (error as NSError).code != NSURLErrorCancelled { showMessage("페이지를 열지 못했습니다. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.") }
    }
    private func showMessage(_ message: String) {
        guard presentedViewController == nil else { return }
        let alert = UIAlertController(title: "안내", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "확인", style: .default))
        present(alert, animated: true)
    }
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        guard presentedViewController == nil else { completionHandler(); return }
        let alert = UIAlertController(title: frame.request.url?.host, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "확인", style: .default) { _ in completionHandler() })
        present(alert, animated: true)
    }
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        guard presentedViewController == nil else { completionHandler(false); return }
        let alert = UIAlertController(title: frame.request.url?.host, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "취소", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "확인", style: .default) { _ in completionHandler(true) })
        present(alert, animated: true)
    }
    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        guard presentedViewController == nil else { completionHandler(nil); return }
        let alert = UIAlertController(title: frame.request.url?.host, message: prompt, preferredStyle: .alert)
        alert.addTextField { $0.text = defaultText }
        alert.addAction(UIAlertAction(title: "취소", style: .cancel) { _ in completionHandler(nil) })
        alert.addAction(UIAlertAction(title: "확인", style: .default) { _ in completionHandler(alert.textFields?.first?.text) })
        present(alert, animated: true)
    }
    // WKWebView's native iOS file-input picker is intentionally retained.
    // No runOpenPanel override, custom upload endpoint, injected JS or credential interception.
}
