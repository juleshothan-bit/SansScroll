import SwiftUI
import UIKit
import WebKit

struct InstagramWebView: UIViewRepresentable {
    @ObservedObject var model: BrowserModel

    func makeCoordinator() -> Coordinator {
        Coordinator(model: model)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()          // garde ta session : tu restes connecté
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let controller = WKUserContentController()
        controller.add(WeakMessageHandler(context.coordinator), name: "sansScroll")
        config.userContentController = controller

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.customUserAgent = Self.safariUserAgent
        webView.allowsBackForwardNavigationGestures = true
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = .systemBackground
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }

        context.coordinator.titleObservation = webView.observe(\.title, options: [.new]) { wv, _ in
            Task { @MainActor in Notifier.shared.titleChanged(wv.title) }
        }

        model.attach(webView)
        webView.load(URLRequest(url: BrowserModel.home))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    /// Instagram sert la version mobile complète à Safari iOS.
    @MainActor static var safariUserAgent: String {
        let parts = UIDevice.current.systemVersion.split(separator: ".")
        let major = parts.first.map(String.init) ?? "18"
        let minor = parts.count > 1 ? String(parts[1]) : "0"
        return "Mozilla/5.0 (iPhone; CPU iPhone OS \(major)_\(minor) like Mac OS X) "
            + "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/\(major).\(minor) "
            + "Mobile/15E148 Safari/604.1"
    }

    // MARK: - Coordinator

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        let model: BrowserModel
        var titleObservation: NSKeyValueObservation?

        init(model: BrowserModel) {
            self.model = model
        }

        // Messages venant du script injecté
        func userContentController(
            _ userContentController: WKUserContentController,
            didReceive message: WKScriptMessage
        ) {
            guard let body = message.body as? [String: Any],
                  let action = body["action"] as? String else { return }
            switch action {
            case "openSettings":
                model.showSettings = true
            default:
                break
            }
        }

        // Filtre de navigation
        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction
        ) async -> WKNavigationActionPolicy {
            guard let url = navigationAction.request.url else { return .allow }
            let isMainFrame = navigationAction.targetFrame?.isMainFrame ?? true
            let scheme = url.scheme?.lowercased() ?? ""

            if scheme == "about" || scheme == "blob" || scheme == "data" { return .allow }

            // Liens instagram://, itms-apps://… : on ne laisse pas l'appli officielle s'ouvrir.
            if scheme != "http" && scheme != "https" {
                if scheme == "mailto" || scheme == "tel" || scheme == "sms" {
                    UIApplication.shared.open(url, options: [:], completionHandler: nil)
                }
                return .cancel
            }

            guard isMainFrame else { return .allow }

            // Liens externes → Safari
            if !BrowserModel.isInternal(url) {
                if url.host?.lowercased().contains("apps.apple.com") == true { return .cancel }
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
                return .cancel
            }

            if model.isBlocked(url) {
                webView.evaluateJavaScript(
                    "window.SansScroll && SansScroll.toast('Reels bloqués 🚫')",
                    completionHandler: nil
                )
                if webView.url == nil { model.goHome() }
                return .cancel
            }
            return .allow
        }

        // Liens target="_blank"
        func webView(
            _ webView: WKWebView,
            createWebViewWith configuration: WKWebViewConfiguration,
            for navigationAction: WKNavigationAction,
            windowFeatures: WKWindowFeatures
        ) -> WKWebView? {
            if let url = navigationAction.request.url {
                if BrowserModel.isInternal(url) {
                    if !model.isBlocked(url) { webView.load(navigationAction.request) }
                } else if url.scheme == "http" || url.scheme == "https" {
                    UIApplication.shared.open(url, options: [:], completionHandler: nil)
                }
            }
            return nil
        }

        // Caméra / micro pour Instagram
        func webView(
            _ webView: WKWebView,
            decideMediaCapturePermissionsFor origin: WKSecurityOrigin,
            initiatedBy frame: WKFrameInfo,
            type: WKMediaCaptureType
        ) async -> WKPermissionDecision {
            origin.host.hasSuffix("instagram.com") ? .grant : .prompt
        }

        // alert() / confirm() de la page
        func webView(
            _ webView: WKWebView,
            runJavaScriptAlertPanelWithMessage message: String,
            initiatedByFrame frame: WKFrameInfo
        ) async {
            await withCheckedContinuation { (cont: CheckedContinuation<Void, Never>) in
                MainActor.assumeIsolated {
                    let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
                    alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in cont.resume() })
                    if !Self.present(alert) { cont.resume() }
                }
            }
        }

        func webView(
            _ webView: WKWebView,
            runJavaScriptConfirmPanelWithMessage message: String,
            initiatedByFrame frame: WKFrameInfo
        ) async -> Bool {
            await withCheckedContinuation { (cont: CheckedContinuation<Bool, Never>) in
                MainActor.assumeIsolated {
                    let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
                    alert.addAction(UIAlertAction(title: "Annuler", style: .cancel) { _ in cont.resume(returning: false) })
                    alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in cont.resume(returning: true) })
                    if !Self.present(alert) { cont.resume(returning: false) }
                }
            }
        }

        // Pas de connexion
        func webView(
            _ webView: WKWebView,
            didFailProvisionalNavigation navigation: WKNavigation!,
            withError error: Error
        ) {
            let nsError = error as NSError
            guard nsError.domain == NSURLErrorDomain,
                  nsError.code != NSURLErrorCancelled else { return }
            webView.loadHTMLString(Self.offlineHTML, baseURL: nil)
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            webView.reload()
        }

        @discardableResult
        static func present(_ vc: UIViewController) -> Bool {
            let scene = UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .first { $0.activationState == .foregroundActive }
            guard var top = scene?.keyWindow?.rootViewController else { return false }
            while let next = top.presentedViewController { top = next }
            top.present(vc, animated: true)
            return true
        }

        static let offlineHTML = """
        <!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
        <style>
        :root{color-scheme:light dark}
        body{font-family:-apple-system,system-ui;display:flex;min-height:90vh;align-items:center;
        justify-content:center;text-align:center;margin:0;padding:24px}
        a{display:inline-block;margin-top:16px;padding:12px 22px;border-radius:12px;background:#0095f6;
        color:#fff;text-decoration:none;font-weight:600}
        </style></head><body><div><h2>Pas de connexion</h2>
        <p>Vérifie ton réseau puis réessaie.</p>
        <a href="https://www.instagram.com/">Réessayer</a></div></body></html>
        """
    }
}

/// Évite que WKUserContentController retienne le coordinator (fuite mémoire).
@MainActor
final class WeakMessageHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?

    init(_ target: WKScriptMessageHandler) {
        self.target = target
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        target?.userContentController(userContentController, didReceive: message)
    }
}
