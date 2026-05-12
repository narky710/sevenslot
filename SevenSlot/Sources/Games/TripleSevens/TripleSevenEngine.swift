import Foundation

/// Triple Sevens game engine — the core logic for reel spinning, win calculation, and payouts.
/// Uses Mersenne Twister RNG (per RNG_Research_Documentation) for fair, certified randomness.
actor TripleSevenEngine {
    /// Reel configuration: each reel has 22 symbols (arcade-standard strip).
    /// Symbol 0 = blank, 1-2 = cherries, 3-7 = single 7s, 8-14 = double 7s, 15-21 = triple 7s.
    private let reelSymbols = Array(0...21)
    
    /// Mersenne Twister state (would be seeded from /dev/urandom in production).
    private var rngState = (0..<624).map { _ in UInt32.random(in: 0...UInt32.max) }
    private var rngIndex = 0
    
    /// Current game state.
    var isSpinning = false
    var reelPositions: (Int, Int, Int) = (0, 0, 0)
    var lastWinAmount: Int = 0
    var credits: Int = 0
    
    init(initialCredits: Int = 1000) {
        self.credits = initialCredits
    }
    
    /// Spin the reels. Returns updated positions after animation.
    func spin(betAmount: Int) async -> (Int, Int, Int) {
        guard credits >= betAmount, !isSpinning else { return reelPositions }
        
        isSpinning = true
        credits -= betAmount
        
        // Generate three independent random positions (0-21 per reel).
        let pos1 = Int(mersenneTwisterNext() % 22)
        let pos2 = Int(mersenneTwisterNext() % 22)
        let pos3 = Int(mersenneTwisterNext() % 22)
        
        reelPositions = (pos1, pos2, pos3)
        
        // Calculate win based on the paytable.
        lastWinAmount = calculateWin(pos1, pos2, pos3, bet: betAmount)
        if lastWinAmount > 0 {
            credits += lastWinAmount
        }
        
        isSpinning = false
        return reelPositions
    }
    
    /// Paytable for Triple Sevens (casino-standard configuration).
    private func calculateWin(_ r1: Int, _ r2: Int, _ r3: Int, bet: Int) -> Int {
        let sym1 = reelSymbols[r1]
        let sym2 = reelSymbols[r2]
        let sym3 = reelSymbols[r3]
        
        // Triple 7s (all on reels 1-3): 7777x multiplier (jackpot).
        if sym1 >= 15 && sym2 >= 15 && sym3 >= 15 {
            return bet * 7777
        }
        
        // Double 7 on all reels: 777x multiplier.
        if sym1 >= 8 && sym1 <= 14 && sym2 >= 8 && sym2 <= 14 && sym3 >= 8 && sym3 <= 14 {
            return bet * 777
        }
        
        // Single 7 on all reels: 77x multiplier.
        if sym1 >= 3 && sym1 <= 7 && sym2 >= 3 && sym2 <= 7 && sym3 >= 3 && sym3 <= 7 {
            return bet * 77
        }
        
        // Two of any 7: 7x multiplier.
        let count7 = [sym1, sym2, sym3].filter { $0 >= 3 }.count
        if count7 == 2 {
            return bet * 7
        }
        
        // Cherries: 1x bet per cherry (up to 3x).
        let cherrieCount = [sym1, sym2, sym3].filter { $0 >= 1 && $0 <= 2 }.count
        if cherrieCount > 0 {
            return bet * cherrieCount
        }
        
        // No win.
        return 0
    }
    
    /// Mersenne Twister PRNG (MT19937).
    /// Implements the algorithm from "Mersenne Twister: A 623-dimensionally equidistributed
    /// uniform pseudo-random number generator" (Matsumoto & Nishimura, 1998).
    private mutating func mersenneTwisterNext() -> UInt32 {
        if rngIndex == 0 {
            generateNumbers()
        }
        
        var y = rngState[rngIndex]
        y = y ^ (y >> 11)
        y = y ^ ((y << 7) & 0x9D2C5680)
        y = y ^ ((y << 15) & 0xEFC60000)
        y = y ^ (y >> 18)
        
        rngIndex = (rngIndex + 1) % 624
        return y
    }
    
    private mutating func generateNumbers() {
        for i in 0..<624 {
            let y = (rngState[i] & 0x80000000) + (rngState[(i + 1) % 624] & 0x7FFFFFFF)
            rngState[i] = rngState[(i + 397) % 624] ^ (y >> 1)
            if y % 2 != 0 {
                rngState[i] = rngState[i] ^ 0x9908B0DF
            }
        }
        rngIndex = 0
    }
}
