import SwiftUI

enum Palette {
    // Royal blue field
    static let blueDeep = Color(hex: 0x0E1F6E)
    static let blueMid = Color(hex: 0x1A38B0)
    static let blueBright = Color(hex: 0x2A56D8)
    static let blueCell = Color(hex: 0x1C3AB3)

    // Chrome / silver bezel
    static let chromeLight = Color(hex: 0xF2F2F4)
    static let chromeMid = Color(hex: 0xBFC2CC)
    static let chromeShadow = Color(hex: 0x5C5F6B)
    static let chromeEdge = Color(hex: 0x2A2C34)

    // Red 3D button
    static let redBright = Color(hex: 0xE51E1E)
    static let redDeep = Color(hex: 0xA50F0F)
    static let redGlow = Color(hex: 0xFF6262)
    static let redDarkRing = Color(hex: 0x4A0808)

    // Gold / yellow
    static let goldBright = Color(hex: 0xFFD93D)
    static let goldDeep = Color(hex: 0xC99A1F)
    static let goldGlow = Color(hex: 0xFFF089)

    // Text
    static let textWhite = Color.white
    static let textCream = Color(hex: 0xFFF6D8)

    /// Paytable / accent
    static let magenta = Color(hex: 0xC825A0)

    // Per-game tints
    static let shamrockGreen = Color(hex: 0x1E7A2C)
    static let shamrockGold = Color(hex: 0xF5C520)
    static let jokerPurple = Color(hex: 0x5A2A8C)
    static let kenoGlow = Color(hex: 0x3DCEFF)
    static let blackFelt = Color(hex: 0x0A0A0A)
    static let cardFelt = Color(hex: 0x0A5C2A)

    /// Cabinet field radial gradient
    static var fieldGradient: RadialGradient {
        RadialGradient(
            colors: [blueBright, blueMid, blueDeep],
            center: .init(x: 0.5, y: 0.4),
            startRadius: 20,
            endRadius: 700
        )
    }

    /// Chrome bezel linear gradient (top→bottom)
    static var chromeGradient: LinearGradient {
        LinearGradient(
            stops: [
                .init(color: chromeLight, location: 0.0),
                .init(color: chromeMid, location: 0.55),
                .init(color: chromeShadow, location: 1.0),
            ],
            startPoint: .top, endPoint: .bottom
        )
    }

    /// Inner cell radial (light at upper-left)
    static func cellGradient(tint: Color = blueCell) -> RadialGradient {
        RadialGradient(
            colors: [Color.white.opacity(0.10), tint],
            center: .init(x: 0.3, y: 0.25),
            startRadius: 4,
            endRadius: 180
        )
    }
}

extension Color {
    init(hex: UInt32, alpha: Double = 1.0) {
        let r = Double((hex >> 16) & 0xFF) / 255.0
        let g = Double((hex >> 8) & 0xFF) / 255.0
        let b = Double(hex & 0xFF) / 255.0
        self.init(.sRGB, red: r, green: g, blue: b, opacity: alpha)
    }
}
