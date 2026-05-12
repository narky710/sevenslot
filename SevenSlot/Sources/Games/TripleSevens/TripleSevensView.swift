import SwiftUI

struct TripleSevensView: View {
    let game: Game
    @State private var engine = TripleSevenEngine(initialCredits: 1000)
    @State private var betAmount: Int = 1
    @State private var isSpinning = false

    private let reelLabels = ["REEL 1", "REEL 2", "REEL 3"]
    private let symbolNames = [
        "BLANK", "CHERRY", "CHERRY", "7", "7", "7", "7", "7",
        "7 7", "7 7", "7 7", "7 7", "7 7", "7 7", "7 7",
        "7 7 7", "7 7 7", "7 7 7", "7 7 7", "7 7 7", "7 7 7", "7 7 7"
    ]

    var body: some View {
        NavigationStack {
            CabinetFrame {
                VStack(spacing: 16) {
                    // Game title header
                    header

                    Divider()
                        .overlay(Palette.magenta.opacity(0.3))

                    // Reels display
                    reelsDisplay

                    Spacer(minLength: 8)

                    // Win display
                    winDisplay

                    Spacer(minLength: 12)

                    // Betting controls
                    bettingControls

                    // Spin button
                    spinButton

                    Spacer(minLength: 8)

                    // Footer with credits
                    footer
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 10)
            .background(Color.black.ignoresSafeArea())
        }
        .preferredColorScheme(.dark)
        .navigationBarBackButtonHidden(false)
    }

    private var header: some View {
        VStack(spacing: 2) {
            Text("TRIPLE SEVENS")
                .font(AppFont.display(32))
                .tracking(4)
                .foregroundStyle(Palette.magenta)
                .shadow(color: Palette.magenta.opacity(0.6), radius: 8, x: 0, y: 0)
                .cabinetShadow(2)
            Text("PULL FOR TRIPLE SEVENS")
                .font(AppFont.button(9))
                .tracking(2)
                .foregroundStyle(Palette.goldBright)
                .cabinetShadow(1)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
    }

    private var reelsDisplay: some View {
        VStack(spacing: 12) {
            // Three reels in a row
            HStack(spacing: 14) {
                reelBox(index: 0, position: engine.reelPositions.0)
                reelBox(index: 1, position: engine.reelPositions.1)
                reelBox(index: 2, position: engine.reelPositions.2)
            }
            .frame(height: 140)
        }
        .padding(.horizontal, 6)
    }

    private func reelBox(index: Int, position: Int) -> some View {
        VStack(spacing: 4) {
            // Reel label
            Text(reelLabels[index])
                .font(AppFont.button(8))
                .tracking(1)
                .foregroundStyle(Palette.textCream.opacity(0.8))

            // Reel window (3D effect with tint)
            ZStack {
                // Cell gradient background
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .fill(Palette.cellGradient(tint: game.tint))

                // Symbol display
                VStack(spacing: 0) {
                    // Previous reel position
                    Text(symbolNames[(position - 1 + 22) % 22])
                        .font(AppFont.readout(16))
                        .foregroundStyle(Palette.textCream.opacity(0.3))
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                        .frame(height: 32)

                    // Current reel position (highlighted)
                    Text(symbolNames[position])
                        .font(AppFont.display(24))
                        .foregroundStyle(game.accent ?? Palette.goldBright)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                        .frame(height: 42)
                        .scaleEffect(1.1)

                    // Next reel position
                    Text(symbolNames[(position + 1) % 22])
                        .font(AppFont.readout(16))
                        .foregroundStyle(Palette.textCream.opacity(0.3))
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                        .frame(height: 32)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 4)

                // Spinning indicator
                if isSpinning {
                    Image(systemName: "arrow.2.circlepath")
                        .font(.system(size: 20, weight: .heavy))
                        .foregroundStyle(Palette.redBright.opacity(0.6))
                        .rotationEffect(.degrees(isSpinning ? 360 : 0))
                        .animation(.linear(duration: 0.8).repeatForever(autoreverses: false), value: isSpinning)
                }
            }
            .overlay(
                RoundedRectangle(cornerRadius: 6, style: .continuous)
                    .stroke(Palette.chromeEdge, lineWidth: 1)
            )
            .frame(maxHeight: .infinity)
        }
    }

    private var winDisplay: some View {
        HStack(spacing: 20) {
            // Last win
            VStack(spacing: 2) {
                Text("LAST WIN")
                    .font(AppFont.button(8))
                    .tracking(2)
                    .foregroundStyle(Palette.textCream.opacity(0.7))

                Text("$\(engine.lastWinAmount)")
                    .font(AppFont.readout(20))
                    .foregroundStyle(engine.lastWinAmount > 0 ? Palette.goldBright : Palette.textCream)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 6)
            .background(Palette.cellGradient().opacity(0.6))
            .clipShape(RoundedRectangle(cornerRadius: 4, style: .continuous))

            // Big Win indicator (if applicable)
            if engine.lastWinAmount > 100 {
                VStack(spacing: 2) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 16))
                        .foregroundStyle(Palette.goldBright)

                    Text("BIG WIN!")
                        .font(AppFont.button(8))
                        .tracking(2)
                        .foregroundStyle(Palette.goldBright)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
                .background(Palette.redBright.opacity(0.15))
                .clipShape(RoundedRectangle(cornerRadius: 4, style: .continuous))
            }
        }
        .padding(.horizontal, 6)
    }

    private var bettingControls: some View {
        VStack(spacing: 8) {
            // Bet amount label
            Text("BET PER LINE")
                .font(AppFont.button(9))
                .tracking(2)
                .foregroundStyle(Palette.textCream)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 6)

            // Bet buttons
            HStack(spacing: 8) {
                betButton(amount: 1)
                betButton(amount: 5)
                betButton(amount: 10)
                betButton(amount: 25)
            }
            .padding(.horizontal, 6)
        }
    }

    private func betButton(amount: Int) -> some View {
        Button(action: { betAmount = amount }) {
            VStack(spacing: 1) {
                Text("$\(amount)")
                    .font(AppFont.readout(14))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 32)
            .foregroundStyle(betAmount == amount ? Palette.blackFelt : Palette.textCream)
            .background(betAmount == amount ? Palette.goldBright : Palette.chromeShadow)
            .clipShape(RoundedRectangle(cornerRadius: 4, style: .continuous))
        }
        .disabled(isSpinning)
    }

    private var spinButton: some View {
        Button(action: performSpin) {
            HStack(spacing: 8) {
                Image(systemName: "arrowtriangle.right.fill")
                    .font(.system(size: 16, weight: .heavy))

                Text(isSpinning ? "SPINNING..." : "SPIN REELS")
                    .font(AppFont.display(24))
                    .tracking(3)

                Image(systemName: "arrowtriangle.right.fill")
                    .font(.system(size: 16, weight: .heavy))
            }
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .foregroundStyle(.white)
            .background(
                ZStack {
                    // Gradient base
                    LinearGradient(
                        stops: [
                            .init(color: Palette.redBright, location: 0),
                            .init(color: Palette.redDeep, location: 1)
                        ],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    )

                    // Glow effect when spinning
                    if isSpinning {
                        RoundedRectangle(cornerRadius: 8, style: .continuous)
                            .stroke(Palette.redGlow, lineWidth: 2)
                            .opacity(0.6)
                    }
                }
            )
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            .shadow(color: Palette.redBright.opacity(0.5), radius: 6, x: 0, y: 2)
            .scaleEffect(isSpinning ? 1.02 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: isSpinning)
        }
        .disabled(isSpinning || engine.credits < betAmount)
        .padding(.horizontal, 6)
    }

    private func performSpin() {
        guard !isSpinning && engine.credits >= betAmount else { return }

        isSpinning = true

        Task {
            // Simulate a brief spin animation (0.5 seconds)
            try? await Task.sleep(nanoseconds: 500_000_000)

            // Call the engine to perform the spin
            _ = await engine.spin(betAmount: betAmount)

            isSpinning = false
        }
    }

    private var footer: some View {
        HStack {
            ReadoutRow(label: "CREDIT", value: "$\(engine.credits)")
            ReadoutRow(label: "BET", value: "$\(betAmount)")
        }
        .padding(.horizontal, 4)
        .padding(.bottom, 2)
    }
}

#Preview {
    TripleSevensView(game: GameCatalog.find("triple_sevens")!)
}
