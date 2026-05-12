import SwiftUI

/// The sacred red 3D plastic button — hard-edged drop shadow, top highlight,
/// translates down 4pt on press (no blur, no softness).
struct RedButton: View {
    let title: String
    let action: () -> Void
    @GestureState private var pressed = false

    var body: some View {
        Text(title)
            .font(AppFont.button(18))
            .tracking(1.5)
            .foregroundStyle(.white)
            .cabinetShadow(1)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(buttonFill)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .stroke(Palette.redDarkRing, lineWidth: 1)
            )
            .overlay(alignment: .top) {
                // Top sheen highlight
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(LinearGradient(
                        colors: [.white.opacity(0.45), .clear],
                        startPoint: .top, endPoint: .center
                    ))
                    .frame(height: 16)
                    .padding(.horizontal, 2)
                    .padding(.top, 1)
                    .allowsHitTesting(false)
            }
            .offset(y: pressed ? 4 : 0)
            .shadow(color: Palette.redDarkRing.opacity(pressed ? 0 : 1),
                    radius: 0, x: 0, y: pressed ? 0 : 4)
            .shadow(color: .black.opacity(0.4), radius: 8, x: 0, y: 4)
            .gesture(
                DragGesture(minimumDistance: 0)
                    .updating($pressed) { _, state, _ in state = true }
                    .onEnded { _ in action() }
            )
            .animation(.easeOut(duration: 0.08), value: pressed)
    }

    private var buttonFill: some View {
        LinearGradient(
            stops: [
                .init(color: Palette.redGlow.opacity(0.8), location: 0.0),
                .init(color: Palette.redBright, location: 0.45),
                .init(color: Palette.redDeep, location: 1.0),
            ],
            startPoint: .top, endPoint: .bottom
        )
    }
}

/// Compact credit/bet/win readout block
struct ReadoutRow: View {
    let label: String
    let value: String
    var body: some View {
        HStack {
            Text(label)
                .font(AppFont.button(13))
                .tracking(1.2)
                .foregroundStyle(.white)
            Spacer(minLength: 8)
            Text(value)
                .font(AppFont.readout(15))
                .foregroundStyle(Palette.textCream)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(.black.opacity(0.35))
        .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 6, style: .continuous)
                .stroke(Palette.chromeShadow, lineWidth: 0.5)
        )
    }
}
