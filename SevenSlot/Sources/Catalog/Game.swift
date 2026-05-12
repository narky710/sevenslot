import SwiftUI

enum GameCategory: String, CaseIterable, Hashable {
    case reelSlots = "REEL SLOTS"
    case videoPoker = "VIDEO POKER"
    case keno = "KENO"
    case blackjack = "BLACKJACK"
    case bingoLotto = "BINGO / LOTTO"
    case bonus = "BONUS"
}

struct Game: Identifiable, Hashable {
    let id: String
    let title: String
    let shortTitle: String
    let category: GameCategory
    let tint: Color
    let accent: Color?
    let glyph: String // SF Symbol name used as placeholder art
    let isPlayable: Bool // false = "COMING SOON"
    let isFeatured: Bool // true = NEW pill on the tile
}

enum GameCatalog {
    static let all: [Game] = [
        // Reel Slots
        .init(id: "triple_sevens", title: "Triple Sevens", shortTitle: "TRIPLE\nSEVENS",
              category: .reelSlots, tint: Palette.blueCell, accent: Palette.goldBright,
              glyph: "7.square.fill", isPlayable: true, isFeatured: true),
        .init(id: "shamrock_7s", title: "Shamrock 7's", shortTitle: "SHAMROCK\n7'S",
              category: .reelSlots, tint: Color(hex: 0x1F4A8F), accent: Palette.shamrockGold,
              glyph: "leaf.fill", isPlayable: false, isFeatured: false),
        .init(id: "respin_777", title: "Respin 777", shortTitle: "RESPIN\n777",
              category: .reelSlots, tint: Palette.blueCell, accent: Palette.goldBright,
              glyph: "arrow.triangle.2.circlepath", isPlayable: false, isFeatured: false),
        .init(id: "respin_gold_row", title: "Respin Gold Row", shortTitle: "RESPIN\nGOLD ROW",
              category: .reelSlots, tint: Palette.blueCell, accent: Palette.goldBright,
              glyph: "rectangle.fill", isPlayable: false, isFeatured: false),

        // Video Poker
        .init(id: "jacks_or_better", title: "Jacks or Better", shortTitle: "JACKS OR\nBETTER",
              category: .videoPoker, tint: Palette.blueCell, accent: nil,
              glyph: "suit.spade.fill", isPlayable: false, isFeatured: false),
        .init(id: "deuces_wild", title: "Deuces Wild", shortTitle: "DEUCES\nWILD",
              category: .videoPoker, tint: Palette.blueCell, accent: nil,
              glyph: "2.circle.fill", isPlayable: false, isFeatured: false),
        .init(id: "wild_jokers", title: "Wild Jokers", shortTitle: "WILD\nJOKERS",
              category: .videoPoker, tint: Palette.jokerPurple, accent: Palette.magenta,
              glyph: "theatermasks.fill", isPlayable: false, isFeatured: false),

        // Keno
        .init(id: "touch_easy_keno", title: "Touch Easy Keno", shortTitle: "TOUCH EASY\nKENO",
              category: .keno, tint: Palette.blueCell, accent: nil,
              glyph: "circle.grid.3x3.fill", isPlayable: false, isFeatured: false),
        .init(id: "super_ball_keno", title: "Super Ball Keno", shortTitle: "SUPER BALL\nKENO",
              category: .keno, tint: Palette.blueCell, accent: nil,
              glyph: "circle.dotted", isPlayable: false, isFeatured: false),
        .init(id: "double_up_keno", title: "Double-Up Keno", shortTitle: "DOUBLE-UP\nKENO",
              category: .keno, tint: Palette.blueCell, accent: nil,
              glyph: "multiply.circle.fill", isPlayable: false, isFeatured: false),

        // Blackjack
        .init(id: "black_gold_21", title: "Black Gold 21", shortTitle: "BLACK\nGOLD 21",
              category: .blackjack, tint: Palette.blackFelt, accent: Palette.goldDeep,
              glyph: "suit.club.fill", isPlayable: false, isFeatured: false),
        .init(id: "spin_jack_21", title: "Spin Jack 21", shortTitle: "SPIN\nJACK 21",
              category: .blackjack, tint: Palette.blueCell, accent: nil,
              glyph: "suit.heart.fill", isPlayable: false, isFeatured: false),

        // Bingo / Lotto
        .init(id: "super_gold_bingo", title: "Super Gold Bingo", shortTitle: "SUPER GOLD\nBINGO",
              category: .bingoLotto, tint: Palette.blueCell, accent: Palette.goldBright,
              glyph: "square.grid.4x3.fill", isPlayable: false, isFeatured: false),
        .init(id: "super_pick_lotto", title: "Super Pick Lotto", shortTitle: "SUPER PICK\nLOTTO",
              category: .bingoLotto, tint: Palette.blueCell, accent: nil,
              glyph: "circle.hexagongrid.fill", isPlayable: false, isFeatured: false),

        // Bonus
        .init(id: "super_double_up", title: "Super Double-Up", shortTitle: "SUPER\nDOUBLE-UP",
              category: .bonus, tint: Palette.blueCell, accent: Palette.goldBright,
              glyph: "rectangle.portrait.on.rectangle.portrait.fill", isPlayable: false, isFeatured: true),
        .init(id: "spin_ball_bonus", title: "Spin Ball Bonus", shortTitle: "SPIN BALL\nBONUS",
              category: .bonus, tint: Palette.blueCell, accent: nil,
              glyph: "circle.circle.fill", isPlayable: false, isFeatured: false),
    ]

    static func find(_ id: String) -> Game? {
        all.first { $0.id == id }
    }
}
