import SwiftUI

/// The universal cabinet wrapper: royal-blue radial field, chrome bezel,
/// screen glare and CRT vignette. Every screen sits inside this.
struct CabinetFrame<Content: View>: View {
    let content: Content
    init(@ViewBuilder content: () -> Content) { self.content = content() }

    var body: some View {
        ZStack {
            // Outer chrome bezel
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(Palette.chromeGradient)
                .overlay(
                    RoundedRectangle(cornerRadius: 22, style: .continuous)
                        .stroke(Palette.chromeEdge, lineWidth: 1)
                )
                .shadow(color: .black.opacity(0.6), radius: 24, x: 0, y: 16)

            // Inner royal blue field
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Palette.fieldGradient)
                .padding(14)
                .overlay(alignment: .center) {
                    // Faint POG watermark
                    Text("POG")
                        .font(AppFont.display(220))
                        .foregroundStyle(.white.opacity(0.045))
                        .rotationEffect(.degrees(-8))
                        .padding(14)
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                .overlay {
                    content.padding(14)
                }
                // Screen glare (light sweep)
                .overlay {
                    LinearGradient(
                        stops: [
                            .init(color: .white.opacity(0.07), location: 0.0),
                            .init(color: .clear, location: 0.35),
                            .init(color: .clear, location: 0.65),
                            .init(color: .white.opacity(0.025), location: 1.0),
                        ],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    )
                    .allowsHitTesting(false)
                    .padding(14)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                // CRT vignette
                .overlay {
                    RadialGradient(
                        colors: [.clear, .black.opacity(0.35)],
                        center: .center, startRadius: 80, endRadius: 540
                    )
                    .allowsHitTesting(false)
                    .padding(14)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }

            // Corner chrome studs
            CornerStuds()
                .padding(6)
        }
    }
}

/// Four small chrome rivets in the corners of the cabinet frame.
private struct CornerStuds: View {
    var body: some View {
        GeometryReader { geo in
            ZStack {
                stud.position(x: 14, y: 14)
                stud.position(x: geo.size.width - 14, y: 14)
                stud.position(x: 14, y: geo.size.height - 14)
                stud.position(x: geo.size.width - 14, y: geo.size.height - 14)
            }
        }
        .allowsHitTesting(false)
    }

    private var stud: some View {
        Circle()
            .fill(
                RadialGradient(colors: [Palette.chromeLight, Palette.chromeShadow],
                               center: .init(x: 0.35, y: 0.35),
                               startRadius: 0, endRadius: 6)
            )
            .overlay(Circle().stroke(Palette.chromeEdge, lineWidth: 0.5))
            .frame(width: 10, height: 10)
            .shadow(color: .black.opacity(0.4), radius: 1, x: 0, y: 1)
    }
}
