import SwiftUI

/// Placeholder for Phase 2 — renders the 3×3 reel frame and a "Coming next" message
/// so tapping the Triple Sevens tile reveals the visual identity that gameplay will
/// plug into. Spin logic, paylines, and paytable land next session.
struct TripleSevensView: View {
    let game: Game
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        CabinetFrame {
            VStack(spacing: 10) {
                title
                reelGrid
                Spacer(minLength: 4)
                bottomBar
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 10)
        .background(Color.black.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
    }

    private var title: some View {
        VStack(spacing: 0) {
            Text("TRIPLE SEVENS")
                .font(AppFont.display(26))
                .tracking(5)
                .foregroundStyle(Palette.magenta)
                .shadow(color: Palette.magenta.opacity(0.6), radius: 6)
                .cabinetShadow(2)
            Text("JACKPOT × 10,000")
                .font(AppFont.button(10))
                .tracking(3)
                .foregroundStyle(Palette.goldBright)
                .cabinetShadow(1)
        }
        .padding(.top, 4)
    }

    private var reelGrid: some View {
        let symbols: [[String]] = [
            ["7.square.fill", "leaf.fill", "7.square.fill"],
            ["bell.fill", "7.square.fill", "circle.hexagongrid.fill"],
            ["7.square.fill", "rectangle.fill", "bell.fill"],
        ]
        return VStack(spacing: 6) {
            ForEach(0 ..< 3, id: \.self) { row in
                HStack(spacing: 6) {
                    ForEach(0 ..< 3, id: \.self) { col in
                        reelCell(symbol: symbols[row][col])
                    }
                }
            }
        }
        .padding(10)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Palette.chromeGradient)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(Palette.chromeEdge, lineWidth: 1)
        )
        .padding(.horizontal, 12)
    }

    private func reelCell(symbol: String) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .fill(Palette.cellGradient(tint: Palette.blueCell))
            Image(systemName: symbol)
                .resizable()
                .scaledToFit()
                .symbolRenderingMode(.palette)
                .foregroundStyle(Palette.goldBright, .white.opacity(0.9))
                .shadow(color: .black.opacity(0.7), radius: 3, x: 0, y: 3)
                .padding(14)
        }
        .aspectRatio(1, contentMode: .fit)
        .overlay(
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .strokeBorder(
                    LinearGradient(colors: [.white.opacity(0.4), .clear],
                                   startPoint: .top, endPoint: .bottom),
                    lineWidth: 1
                )
        )
    }

    private var bottomBar: some View {
        VStack(spacing: 8) {
            HStack(spacing: 8) {
                ReadoutRow(label: "CREDIT", value: "$10.00")
                ReadoutRow(label: "BET", value: "1")
                ReadoutRow(label: "WIN", value: "0")
            }
            HStack(spacing: 10) {
                RedButton(title: "EXIT") { dismiss() }
                RedButton(title: "SPIN") { /* Phase 2 */ }
                    .opacity(0.6)
            }
            Text("GAMEPLAY COMING NEXT SESSION")
                .font(AppFont.button(9))
                .tracking(2)
                .foregroundStyle(.white.opacity(0.7))
                .cabinetShadow(1)
                .padding(.top, 2)
        }
        .padding(.horizontal, 8)
    }
}
