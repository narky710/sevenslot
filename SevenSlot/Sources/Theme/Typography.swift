import SwiftUI

/// Font roles for the cabinet UI. We default to system rounded fonts as a polished
/// fallback; once we bundle Anton / Oswald / VT323 / Playfair as Resources we swap
/// the family name in here and everything cascades.
enum AppFont {
    enum Family: String {
        case display // Anton — game-title display
        case button // Oswald 700/800 — buttons, labels
        case readout // Oswald 800 tabular — credit/bet/win values
        case meta // VT323 — copyright / dev meta
        case card // Playfair Display — card pips
    }

    static func display(_ size: CGFloat) -> Font {
        // Anton is a tall condensed display face. System equivalent: heavy + width-condensed.
        .system(size: size, weight: .black, design: .default)
            .width(.condensed)
    }

    static func button(_ size: CGFloat) -> Font {
        .system(size: size, weight: .heavy, design: .default)
            .width(.condensed)
    }

    static func readout(_ size: CGFloat) -> Font {
        .system(size: size, weight: .heavy, design: .default)
            .monospacedDigit()
    }

    static func meta(_ size: CGFloat) -> Font {
        .system(size: size, weight: .regular, design: .monospaced)
    }
}

/// Drop-shadow text style universal to white-on-blue cabinet text.
struct CabinetTextShadow: ViewModifier {
    var radius: CGFloat = 0
    var y: CGFloat = 2
    func body(content: Content) -> some View {
        content.shadow(color: .black.opacity(0.6), radius: radius, x: 0, y: y)
    }
}

extension View {
    func cabinetShadow(_ y: CGFloat = 2, radius: CGFloat = 0) -> some View {
        modifier(CabinetTextShadow(radius: radius, y: y))
    }
}
