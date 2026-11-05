import AVFoundation
import UIKit
import UserNotifications
import WebKit

/// Notifications sans l'appli Instagram officielle :
/// Sans Scroll reste éveillé en arrière-plan (piste audio silencieuse) et
/// vérifie ton activité Instagram toutes les 30 secondes.
/// Les messages privés sont signalés quand l'appli est ouverte : le compteur de
/// l'icône Messages d'Instagram est lu par le script injecté (inject.js).
@MainActor
final class Notifier: NSObject, UNUserNotificationCenterDelegate {
    static let shared = Notifier()

    static let pollSeconds: UInt64 = 30

    /// Ouvre une page Instagram dans l'appli (branché par BrowserModel).
    var openURL: ((URL) -> Void)? {
        didSet { if let url = pendingURL, let openURL { pendingURL = nil; openURL(url) } }
    }
    /// Page affichée en ce moment (pour ne pas notifier une conversation déjà ouverte).
    var currentPath: () -> String = { "" }

    private var pendingURL: URL?
    private var loop: Task<Void, Never>?
    private var player: AVAudioPlayer?
    private let defaults = UserDefaults.standard

    var enabled: Bool {
        get { defaults.object(forKey: "notifEnabled") as? Bool ?? true }
        set { defaults.set(newValue, forKey: "notifEnabled") }
    }

    // MARK: - Démarrage / arrêt

    func start() {
        UNUserNotificationCenter.current().delegate = self
        guard enabled else { stop(); return }

        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in }
        startKeepAlive()

        if loop == nil {
            loop = Task { [weak self] in
                while !Task.isCancelled {
                    await self?.poll()
                    try? await Task.sleep(nanoseconds: Notifier.pollSeconds * 1_000_000_000)
                }
            }
        }
    }

    func stop() {
        loop?.cancel()
        loop = nil
        player?.stop()
        player = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    // MARK: - Rester éveillé en arrière-plan

    private var observersInstalled = false

    private func startKeepAlive() {
        let session = AVAudioSession.sharedInstance()
        try? session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
        try? session.setActive(true)

        if player == nil {
            player = try? AVAudioPlayer(data: Self.silentWAV())
            player?.numberOfLoops = -1
            player?.volume = 0.01
        }
        player?.play()

        guard !observersInstalled else { return }
        observersInstalled = true
        let nc = NotificationCenter.default
        nc.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.resumeKeepAlive() }
        }
        nc.addObserver(forName: AVAudioSession.mediaServicesWereResetNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated {
                self?.player = nil
                self?.resumeKeepAlive()
            }
        }
        nc.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.resumeKeepAlive() }
        }
        nc.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.resumeKeepAlive() }
        }
    }

    private func resumeKeepAlive() {
        guard enabled, loop != nil else { return }
        startKeepAlive()
    }

    /// 2 secondes de silence au format WAV.
    private static func silentWAV(seconds: Int = 2, rate: Int = 8000) -> Data {
        let samples = seconds * rate
        var d = Data()
        func ascii(_ s: String) { d.append(s.data(using: .ascii)!) }
        func u32(_ v: UInt32) { withUnsafeBytes(of: v.littleEndian) { d.append(contentsOf: $0) } }
        func u16(_ v: UInt16) { withUnsafeBytes(of: v.littleEndian) { d.append(contentsOf: $0) } }
        ascii("RIFF"); u32(UInt32(36 + samples * 2)); ascii("WAVE")
        ascii("fmt "); u32(16); u16(1); u16(1); u32(UInt32(rate)); u32(UInt32(rate * 2)); u16(2); u16(16)
        ascii("data"); u32(UInt32(samples * 2))
        d.append(Data(count: samples * 2))
        return d
    }

    // MARK: - Vérification Instagram

    private var activityCount = 0
    private var dmUnread = -1   // -1 : pas encore connu (pas de notification au lancement)

    /// Résultat de la dernière vérification, affiché dans les Réglages.
    var statusText: String { defaults.string(forKey: "notifStatus") ?? "Pas encore de vérification." }

    private func setStatus(_ text: String) {
        let time = DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .short)
        defaults.set("\(time) : \(text)", forKey: "notifStatus")
    }

    private func poll() async {
        let bg = UIApplication.shared.beginBackgroundTask(withName: "SansScrollPoll")
        defer { UIApplication.shared.endBackgroundTask(bg) }

        let settings = await UNUserNotificationCenter.current().notificationSettings()
        if settings.authorizationStatus == .denied {
            setStatus("notifications refusées. Active-les dans Réglages iPhone › Notifications › Sans Scroll.")
            return
        }
        guard let auth = await cookies() else {
            setStatus("pas connecté à Instagram dans Sans Scroll.")
            return
        }
        activityCount = await checkActivity(auth) ?? activityCount
        updateBadge()
    }

    private func updateBadge() {
        UNUserNotificationCenter.current().setBadgeCount(max(0, dmUnread) + activityCount) { _ in }
    }

    /// Envoie une notification d'essai (bouton dans les Réglages).
    func sendTest() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            Task { @MainActor in
                guard granted else {
                    self.setStatus("notifications refusées. Active-les dans Réglages iPhone › Notifications › Sans Scroll.")
                    return
                }
                self.notify(id: "test-\(Date().timeIntervalSince1970)", title: "Sans Scroll",
                            body: "Les notifications fonctionnent ✅", url: "https://www.instagram.com/", thread: "test")
            }
        }
    }

    private struct Auth {
        let cookie: String
        let csrf: String?
    }

    private func cookies() async -> Auth? {
        let all = await WKWebsiteDataStore.default().httpCookieStore.allCookies()
        let ig = all.filter { $0.domain.hasSuffix("instagram.com") }
        guard ig.contains(where: { $0.name == "sessionid" }) else { return nil }
        return Auth(
            cookie: ig.map { "\($0.name)=\($0.value)" }.joined(separator: "; "),
            csrf: ig.first { $0.name == "csrftoken" }?.value
        )
    }

    private func get(_ path: String, _ auth: Auth) async -> (json: [String: Any]?, code: Int) {
        guard let url = URL(string: "https://www.instagram.com" + path) else { return (nil, 0) }
        var req = URLRequest(url: url)
        req.httpShouldHandleCookies = false
        req.timeoutInterval = 20
        req.setValue(auth.cookie, forHTTPHeaderField: "Cookie")
        req.setValue("936619743392459", forHTTPHeaderField: "X-IG-App-ID")
        if let csrf = auth.csrf { req.setValue(csrf, forHTTPHeaderField: "X-CSRFToken") }
        req.setValue(InstagramWebView.safariUserAgent, forHTTPHeaderField: "User-Agent")
        req.setValue("https://www.instagram.com/", forHTTPHeaderField: "Referer")
        req.setValue("*/*", forHTTPHeaderField: "Accept")
        guard let result = try? await URLSession.shared.data(for: req) else { return (nil, -1) }
        let code = (result.1 as? HTTPURLResponse)?.statusCode ?? 0
        guard code == 200 else { return (nil, code) }
        return ((try? JSONSerialization.jsonObject(with: result.0)) as? [String: Any], code)
    }

    // MARK: Activité (likes, commentaires, abonnés, mentions…)

    /// Notifie chaque activité plus récente que la dernière vue. Renvoie le nombre de nouveautés.
    private func checkActivity(_ auth: Auth) async -> Int? {
        let (body, code) = await get("/api/v1/news/inbox/", auth)
        guard let json = body else {
            setStatus(code == -1 ? "pas de connexion internet." : "Instagram a refusé la vérification (code \(code)).")
            return nil
        }
        let lists = ["new_stories", "priority_stories", "old_stories"]
        let stories = lists.flatMap { json[$0] as? [[String: Any]] ?? [] }

        let lastTs = defaults.double(forKey: "lastActivityTs")
        let firstRun = lastTs == 0
        let viewingActivity = UIApplication.shared.applicationState == .active
            && currentPath().hasPrefix("/notifications")

        var fresh: [(ts: Double, id: String, text: String)] = []
        var maxTs = lastTs
        for story in stories {
            let args = story["args"] as? [String: Any] ?? [:]
            guard let ts = (args["timestamp"] as? NSNumber)?.doubleValue else { continue }
            maxTs = max(maxTs, ts)
            guard ts > lastTs,
                  let text = (args["text"] as? String) ?? (args["rich_text"] as? String),
                  !text.isEmpty else { continue }
            let id = Self.str(story["pk"]) ?? Self.str(args["tuuid"]) ?? String(ts)
            fresh.append((ts, id, Self.cleanRichText(text)))
        }
        defaults.set(maxTs, forKey: "lastActivityTs")

        setStatus(firstRun ? "connecté, en attente de nouvelles activités."
                           : "OK (\(fresh.count) nouvelle\(fresh.count > 1 ? "s" : "") activité\(fresh.count > 1 ? "s" : "")).")
        if !firstRun && !viewingActivity {
            for item in fresh.sorted(by: { $0.ts < $1.ts }).suffix(5) {
                notify(id: "act-\(item.id)", title: "Instagram", body: item.text,
                       url: "https://www.instagram.com/notifications/", thread: "activity")
            }
        }
        return (json["new_stories"] as? [[String: Any]])?.count ?? 0
    }

    /// "{jules|000000|1|user?id=1} a aimé ta photo." → "jules a aimé ta photo."
    private static func cleanRichText(_ s: String) -> String {
        guard let re = try? NSRegularExpression(pattern: "\\{([^|{}]+)\\|[^{}]*\\}") else { return s }
        return re.stringByReplacingMatches(in: s, range: NSRange(s.startIndex..., in: s), withTemplate: "$1")
    }

    // MARK: Messages privés (quand l'appli est ouverte)

    /// Nombre de conversations non lues, lu sur l'icône Messages d'Instagram.
    func dmCountChanged(_ n: Int) {
        let previous = dmUnread
        dmUnread = n
        updateBadge()
        guard enabled, previous >= 0, n > previous, !currentPath().hasPrefix("/direct") else { return }
        let extra = n - previous
        notify(id: "dm-\(Date().timeIntervalSince1970)",
               title: "Nouveau message",
               body: extra == 1 ? "Tu as reçu un message privé." : "Tu as reçu \(extra) nouveaux messages privés.",
               url: "https://www.instagram.com/direct/inbox/", thread: "dm")
    }

    // MARK: - Notifications locales

    private func notify(id: String, title: String, body: String, url: String, thread: String) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.threadIdentifier = thread
        content.userInfo = ["url": url]
        UNUserNotificationCenter.current().add(
            UNNotificationRequest(identifier: id, content: content, trigger: nil)
        )
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .list, .sound]
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let link = response.notification.request.content.userInfo["url"] as? String
        await MainActor.run {
            guard let link, let url = URL(string: link) else { return }
            if let openURL = self.openURL { openURL(url) } else { self.pendingURL = url }
        }
    }

    // MARK: - Utilitaires

    private static func str(_ any: Any?) -> String? {
        switch any {
        case let s as String: return s.isEmpty ? nil : s
        case let n as NSNumber: return n.stringValue
        default: return nil
        }
    }
}
