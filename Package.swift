// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "SansScroll",
    platforms: [
        .iOS(.v17),
        .macOS(.v14),
    ],
    products: [
        // xtool transforme ce produit en application iOS.
        .library(
            name: "SansScroll",
            targets: ["SansScroll"]
        ),
    ],
    targets: [
        .target(
            name: "SansScroll"
        ),
    ],
    swiftLanguageModes: [.v5]
)
