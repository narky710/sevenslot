import SwiftUI

struct GameTile: View {
    let game: Game
    @GestureState private var pressed = false

    var body: some View {
        ZStack {
            // Outer chrome bezel
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(Palette.chromeGradient)
                .overlay(
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .stroke(featuredAccent ?? Palette.chromeEdge, lineWidth: featuredAccent == nil ? 1 : 1.5)
                )
                .shadow(color: .black.opacity(0.5), radius: 4, x: 0, y: 4)

            // Inner cell with light gradient + tint
            RoundedRectangle(cornerRadius: 4, style: .continuous)
                .fill(Palette.cellGradient(tint: game.tint))
                .padding(3)
                .overlay {
                    cellContent.padding(8)
                }

            // Inner highlight + inset shadow
            RoundedRectangle(cornerRadius: 4, style: .continuous)
                .strokeBorder(
                    LinearGradient(colors: [.white.opacity(0.55), .clear, .black.opacity(0.3)],
                                   startPoint: .top, endPoint: .bottom),
                    lineWidth: 1
                )
                .padding(3)
                .allowsHitTesting(false)

            // NEW pill (featured)
            if game.isFeatured {
                NewPill()
                    .padding(5)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                    .allowsHitTesting(false)
            }

            // COMING SOON overlay
            if !game.isPlayable {
                RoundedRectangle(cornerRadius: 4, style: .continuous)
                    .fill(.black.opacity(0.45))
                    .padding(3)
                    .overlay {
                        Text("COMING\nSOON")
                            .font(AppFont.button(10))
                            .tracking(1.5)
                            .multilineTextAlignment(.center)
                            .foregroundStyle(Palette.textCream.opacity(0.9))
                            .cabinetShadow(1)
                    }
                    .allowsHitTesting(false)
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .scaleEffect(pressed ? 0.96 : 1.0)
        .animation(.easeOut(duration: 0.1), value: pressed)
        .gesture(DragGesture(minimumDistance: 0).updating($pressed) { _, s, _ in s = true })
    }

    private var featuredAccent: Color? {
        game.isFeatured ? Palette.goldBright : nil
    }

    private var cellContent: some View {
        VStack(spacing: 6) {
            Image(systemName: game.glyph)
                .resizable()
                .scaledToFit()
                .symbolRenderingMode(.palette)
                .foregroundStyle(
                    game.accent ?? Palette.goldBright,
                    Color.white.opacity(0.9)
                )
                .shadow(color: .black.opacity(0.6), radius: 2, x: 0, y: 2)
                .frame(maxWidth: 38, maxHeight: 38)

            Text(game.shortTitle)
                .font(AppFont.button(9.5))
                .tracking(1.0)
                .multilineTextAlignment(.center)
                .lineLimit(2)
                .foregroundStyle(.white)
                .cabinetShadow(1)
                .minimumScaleFactor(0.7)
        }
    }
}

private struct NewPill: View {
    var body: some View {
        Text("NEW")
            .font(AppFont.display(9))
            .tracking(1.0)
            .foregroundStyle(.black)
            .padding(.horizontal, 5)
            .padding(.vertical, 2)
            .background(Palette.goldBright)
            .clipShape(RoundedRectangle(cornerRadius: 3, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 3, style: .continuous)
                    .stroke(Palette.goldDeep, lineWidth: 0.5)
            )
            .shadow(color: .black.opacity(0.4), radius: 1, x: 0, y: 1)
    }
}
