import SwiftUI
import WebKit

/// Réglages persistants (UserDefaults).
struct FocusSettings: Equatable {
    /// Bloque aussi les Reels envoyés en message (/reel/...), pas seulement l'onglet Reels.
    var blockAllReels: Bool
    /// Remplace la grille Explorer par la simple barre de recherche.
    var blockExplore: Bool

    static func load() -> FocusSettings {
        let d = UserDefaults.standard
        d.register(defaults: ["blockAllReels": true, "blockExplore": false])
        return FocusSettings(
            blockAllReels: d.bool(forKey: "blockAllReels"),
            blockExplore: d.bool(forKey: "blockExplore")
        )
    }

    func save() {
        let d = UserDefaults.standard
        d.set(blockAllReels, forKey: "blockAllReels")
        d.set(blockExplore, forKey: "blockExplore")
    }

    var json: String {
        "{\"blockAllReels\":\(blockAllReels),\"blockExplore\":\(blockExplore)}"
    }
}

@MainActor
final class BrowserModel: ObservableObject {
    static let home = URL(string: "https://www.instagram.com/")!

    @Published var showSettings = false
    @Published var settings = FocusSettings.load()

    private(set) weak var webView: WKWebView?

    func attach(_ webView: WKWebView) {
        self.webView = webView
        installScripts(on: webView.configuration.userContentController)
    }

    func installScripts(on controller: WKUserContentController) {
        controller.removeAllUserScripts()
        let source = "window.__SS_CONFIG__ = \(settings.json);\n" + Inject.source
        controller.addUserScript(
            WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true)
        )
    }

    func apply(_ newSettings: FocusSettings) {
        guard newSettings != settings else { return }
        settings = newSettings
        settings.save()
        guard let webView else { return }
        installScripts(on: webView.configuration.userContentController)
        webView.reload()
    }

    func goHome() {
        webView?.load(URLRequest(url: Self.home))
    }

    /// Déconnecte : efface cookies et données Instagram de l'appli.
    func logOut() async {
        let store = WKWebsiteDataStore.default()
        await store.removeData(
            ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(),
            modifiedSince: .distantPast
        )
        goHome()
    }

    // MARK: - Règles de navigation

    static let internalHosts = [
        "instagram.com", "cdninstagram.com",
        "facebook.com", "facebook.net", "fb.com", "fbcdn.net", "meta.com",
    ]

    static func isInternal(_ url: URL) -> Bool {
        guard let host = url.host?.lowercased() else { return false }
        return internalHosts.contains { host == $0 || host.hasSuffix("." + $0) }
    }

    func isBlocked(_ url: URL) -> Bool {
        guard Self.isInternal(url) else { return false }
        let path = url.path.lowercased()
        // Onglet Reels, et page Reels d'un profil (/pseudo/reels/)
        if path == "/reels" || path.hasPrefix("/reels/") { return true }
        if path.hasSuffix("/reels") || path.hasSuffix("/reels/") { return true }
        if settings.blockAllReels {
            if path.hasPrefix("/reel/") || path.contains("/reel/") { return true }
        }
        return false
    }
}
