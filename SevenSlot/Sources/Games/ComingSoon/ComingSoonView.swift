import SwiftUI

struct ComingSoonView: View {
    let game: Game
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        CabinetFrame {
            VStack(spacing: 18) {
                Text(game.title.uppercased())
                    .font(AppFont.display(28))
                    .tracking(5)
                    .foregroundStyle(Palette.magenta)
                    .shadow(color: Palette.magenta.opacity(0.6), radius: 6)
                    .cabinetShadow(2)
                    .multilineTextAlignment(.center)

                Text(game.category.rawValue)
                    .font(AppFont.button(11))
                    .tracking(3)
                    .foregroundStyle(Palette.textCream)

                Image(systemName: game.glyph)
                    .resizable().scaledToFit()
                    .symbolRenderingMode(.palette)
                    .foregroundStyle(game.accent ?? Palette.goldBright, .white.opacity(0.9))
                    .shadow(color: .black.opacity(0.6), radius: 6, y: 4)
                    .frame(width: 100, height: 100)
                    .padding(.vertical, 12)

                Text("COMING SOON")
                    .font(AppFont.display(20))
                    .tracking(6)
                    .foregroundStyle(Palette.goldBright)
                    .shadow(color: Palette.goldGlow.opacity(0.6), radius: 8)
                    .cabinetShadow(2)

                Spacer()
                RedButton(title: "EXIT") { dismiss() }
                    .padding(.horizontal, 30)
            }
            .padding(20)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 10)
        .background(Color.black.ignoresSafeArea())
        .navigationBarBackButtonHidden(true)
    }
}
