import SwiftUI

@main
struct SansScrollApp: App {
    @StateObject private var model = BrowserModel()

    var body: some Scene {
        WindowGroup {
            InstagramWebView(model: model)
                .background(Color(uiColor: .systemBackground))
                .sheet(isPresented: $model.showSettings) {
                    SettingsView(model: model)
                }
        }
    }
}
