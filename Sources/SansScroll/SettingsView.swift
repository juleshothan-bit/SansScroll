import SwiftUI

struct SettingsView: View {
    @ObservedObject var model: BrowserModel
    @Environment(\.dismiss) private var dismiss

    @State private var draft = FocusSettings.load()
    @State private var confirmLogout = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Label("Fil d'actualité désactivé", systemImage: "checkmark.circle.fill")
                    Label("Onglet Reels bloqué", systemImage: "checkmark.circle.fill")
                } header: {
                    Text("Toujours actif")
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
                        model.apply(draft)
                        dismiss()
                    }
                }
            }
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
        .onAppear { draft = model.settings }
    }
}
