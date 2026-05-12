import SwiftUI

struct GameSelectView: View {
    @State private var selected: Game?

    private let columns: [GridItem] = Array(
        repeating: GridItem(.flexible(), spacing: 10), count: 4
    )

    var body: some View {
        NavigationStack {
            CabinetFrame {
                VStack(spacing: 12) {
                    header
                    grid
                    footer
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 10)
            .background(Color.black.ignoresSafeArea())
            .navigationDestination(for: Game.self) { game in
                gameDestination(for: game)
            }
        }
        .preferredColorScheme(.dark)
    }

    private var header: some View {
        VStack(spacing: 2) {
            Text("POT-O-GOLD")
                .font(AppFont.display(34))
                .tracking(6)
                .foregroundStyle(Palette.magenta)
                .shadow(color: Palette.magenta.opacity(0.6), radius: 8, x: 0, y: 0)
                .cabinetShadow(2)
            Text("SELECT A GAME")
                .font(AppFont.button(11))
                .tracking(4)
                .foregroundStyle(Palette.textCream)
                .cabinetShadow(1)
        }
        .padding(.top, 6)
    }

    private var grid: some View {
        LazyVGrid(columns: columns, spacing: 10) {
            ForEach(GameCatalog.all) { game in
                if game.isPlayable {
                    NavigationLink(value: game) { GameTile(game: game) }
                        .buttonStyle(.plain)
                } else {
                    GameTile(game: game)
                }
            }
        }
        .padding(.horizontal, 4)
    }

    private var footer: some View {
        HStack {
            ReadoutRow(label: "CREDIT", value: "$0.00")
            ReadoutRow(label: "GAMES", value: "\(GameCatalog.all.count)")
        }
        .padding(.horizontal, 4)
        .padding(.bottom, 2)
        .overlay(alignment: .bottom) {
            Text("POG_510C/R510POG2 IND B:01 G:000001  ©︎ 1986-99 LEISURE TIME TECH., INC")
                .font(AppFont.meta(8))
                .foregroundStyle(.white.opacity(0.45))
                .padding(.bottom, -14)
        }
    }

    @ViewBuilder
    private func gameDestination(for game: Game) -> some View {
        switch game.id {
        case "triple_sevens":
            TripleSevensView(game: game)
        default:
            ComingSoonView(game: game)
        }
    }
}

#Preview {
    GameSelectView()
}
