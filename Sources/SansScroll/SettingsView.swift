import SwiftUI

/// Dégradé façon Instagram.
let instaGradient = LinearGradient(
    colors: [
        Color(red: 0.996, green: 0.855, blue: 0.459),
        Color(red: 0.980, green: 0.494, blue: 0.118),
        Color(red: 0.839, green: 0.161, blue: 0.463),
        Color(red: 0.588, green: 0.184, blue: 0.749),
        Color(red: 0.310, green: 0.357, blue: 0.835),
    ],
    startPoint: .bottomLeading,
    endPoint: .topTrailing
)
let instaPink = Color(red: 0.839, green: 0.161, blue: 0.463)

struct SettingsView: View {
    @ObservedObject var model: BrowserModel
    @Environment(\.dismiss) private var dismiss

    @State private var draft = FocusSettings.load()
    @State private var notifications = Notifier.shared.enabled
    @State private var confirmLogout = false
    @State private var status = Notifier.shared.statusText

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack(spacing: 14) {
                        RoundedRectangle(cornerRadius: 14)
                            .fill(instaGradient)
                            .frame(width: 52, height: 52)
                            .overlay(Image(systemName: "hand.raised.fill").font(.title2).foregroundStyle(.white))
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Sans Scroll").font(.title3.bold())
                            Text("Instagram, sans pubs ni Reels").font(.subheadline).foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }

                Section {
                    Label("Publicités masquées dans le fil", systemImage: "checkmark.circle.fill")
                    Label("Onglet Reels bloqué", systemImage: "checkmark.circle.fill")
                } header: {
                    Text("Toujours actif")
                }

                Section {
                    Toggle("Notifications", isOn: $notifications)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Dernière vérification").font(.caption).foregroundStyle(.secondary)
                        Text(status).font(.footnote)
                    }
                    Button("Envoyer une notification test") {
                        Notifier.shared.sendTest()
                    }
                } header: {
                    Text("Messages et activité")
                } footer: {
                    Text("Likes, commentaires, abonnés et mentions : vérifiés toutes les 30 secondes, même écran verrouillé. Messages privés : signalés quand l'appli est ouverte. Ne ferme pas l'appli depuis le sélecteur d'applis, sinon les notifications s'arrêtent. Ça consomme un peu de batterie.")
                }

                Section {
                    Toggle("Bloquer aussi les Reels qu'on m'envoie", isOn: $draft.blockAllReels)
                    Toggle("Masquer la grille Explorer", isOn: $draft.blockExplore)
                } header: {
                    Text("Options")
                } footer: {
                    Text("Avec la grille Explorer masquée, l'onglet loupe ouvre directement la recherche.")
                }

                Section {
                    Button("Revenir à l'accueil") {
                        model.goHome()
                        dismiss()
                    }
                    Button("Se déconnecter et effacer les données", role: .destructive) {
                        confirmLogout = true
                    }
                }
            }
            .navigationTitle("Sans Scroll")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("OK") {
                        if notifications != Notifier.shared.enabled {
                            Notifier.shared.enabled = notifications
                            if notifications { Notifier.shared.start() } else { Notifier.shared.stop() }
                        }
                        model.apply(draft)
                        dismiss()
                    }
                }
            }
            .symbolRenderingMode(.monochrome)
            .confirmationDialog(
                "Te déconnecter d'Instagram dans Sans Scroll ?",
                isPresented: $confirmLogout,
                titleVisibility: .visible
            ) {
                Button("Se déconnecter", role: .destructive) {
                    Task {
                        await model.logOut()
                        dismiss()
                    }
                }
            }
        }
        .tint(instaPink)
        .onAppear {
            draft = model.settings
            notifications = Notifier.shared.enabled
            status = Notifier.shared.statusText
        }
    }
}
