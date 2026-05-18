"use strict";
// Mersenne Twister MT19937 implementation
// Based on Matsumoto & Nishimura 1998
Object.defineProperty(exports, "__esModule", { value: true });
exports.MersenneTwister = void 0;
class MersenneTwister {
    // Seed is REQUIRED. A static default would mean every fresh instance
    // produces the same stream — NGCB Tech Standards explicitly prohibit
    // static seed initialization for gaming RNGs. Callers must supply a
    // high-entropy seed (TripleSevenEngine pulls one from crypto.getRandomValues)
    // or an explicit deterministic seed for tests / replay.
    constructor(seed) {
        this.N = 624;
        this.M = 397;
        this.MATRIX_A = 0x9908b0df;
        this.UPPER_MASK = 0x80000000;
        this.LOWER_MASK = 0x7fffffff;
        this.mt = [];
        this.mti = this.N + 1;
        this.initGenRand(seed >>> 0);
    }
    initGenRand(s) {
        this.mt = [];
        this.mt[0] = s >>> 0;
        for (this.mti = 1; this.mti < this.N; this.mti++) {
            const s = this.mt[this.mti - 1] ^ (this.mt[this.mti - 1] >>> 30);
            this.mt[this.mti] =
                (((((s & 0xffff0000) >>> 16) * 1812433253) << 16) +
                    (s & 0x0000ffff) * 1812433253) +
                    this.mti;
            this.mt[this.mti] = this.mt[this.mti] >>> 0;
        }
    }
    genrandInt32() {
        let y;
        if (this.mti >= this.N) {
            let kk;
            if (this.mti > this.N) {
                this.initGenRand(5489);
            }
            for (kk = 0; kk < this.N - this.M; kk++) {
                y = (this.mt[kk] & this.UPPER_MASK) | (this.mt[kk + 1] & this.LOWER_MASK);
                this.mt[kk] = this.mt[kk + this.M] ^ (y >>> 1) ^ (this.MATRIX_A & -(y & 0x1));
            }
            for (; kk < this.N - 1; kk++) {
                y = (this.mt[kk] & this.UPPER_MASK) | (this.mt[kk + 1] & this.LOWER_MASK);
                this.mt[kk] = this.mt[kk + (this.M - this.N)] ^ (y >>> 1) ^ (this.MATRIX_A & -(y & 0x1));
            }
            y = (this.mt[this.N - 1] & this.UPPER_MASK) | (this.mt[0] & this.LOWER_MASK);
            this.mt[this.N - 1] = this.mt[this.M - 1] ^ (y >>> 1) ^ (this.MATRIX_A & -(y & 0x1));
            this.mti = 0;
        }
        y = this.mt[this.mti++];
        y ^= y >>> 11;
        y ^= (y << 7) & 0x9d2c5680;
        y ^= (y << 15) & 0xefc60000;
        y ^= y >>> 18;
        return y >>> 0;
    }
    // Returns random integer in [0, 2^32-1]
    random() {
        return this.genrandInt32();
    }
    // Returns random integer in [0, n)
    randomInt(n) {
        return this.random() % n;
    }
}
exports.MersenneTwister = MersenneTwister;
