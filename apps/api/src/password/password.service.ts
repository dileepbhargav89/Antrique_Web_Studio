import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { hash, verify } from '@node-rs/argon2';
import type { Algorithm } from '@node-rs/argon2';
import hashConfig from './config/hash.config';

// Password hashing infrastructure only (Phase 1.2D.7) — see this module's
// own README for what "infrastructure only" means here. Wraps @node-rs/argon2
// (napi-rs bindings — chosen over the `argon2` npm package, which requires a
// node-gyp/Visual Studio C++ toolchain to compile from source and has no
// prebuilt binary for this environment's Node version; @node-rs/argon2 ships
// a prebuilt native binary, so `pnpm install` works with no local build
// toolchain). Named PasswordService: no naming collision risk since
// @node-rs/argon2 exports plain functions, not a class.
@Injectable()
export class PasswordService {
  // Argon2id is hardcoded, not read from config — the same "not
  // configurable" treatment already applied to the JWT signing algorithm
  // (HS256, fixed in token.service.ts). Making the variant itself
  // environment-tunable would let a misconfigured environment silently
  // weaken to argon2i/argon2d; only the cost parameters below are
  // legitimately environment-specific.
  //
  // `Algorithm` is declared `const enum` in @node-rs/argon2's own .d.ts, so
  // importing it as a value (`Algorithm.Argon2id`) fails under this
  // project's `isolatedModules` (TS2748 — ambient const enums can't be
  // inlined across file boundaries when each file is transpiled in
  // isolation, e.g. by ts-jest). `2` is that enum's own documented
  // `Argon2id` value (see the package's index.d.ts) — imported only as a
  // type here so this field stays statically checked against the real
  // option shape without triggering the const-enum restriction.
  private readonly algorithm: Algorithm = 2;

  constructor(@Inject(hashConfig.KEY) private readonly config: ConfigType<typeof hashConfig>) {}

  hash(plaintext: string): Promise<string> {
    return hash(plaintext, {
      algorithm: this.algorithm,
      memoryCost: this.config.memoryCost,
      timeCost: this.config.timeCost,
      parallelism: this.config.parallelism,
    });
  }

  // @node-rs/argon2's verify() reads the algorithm/cost parameters and salt
  // back out of the encoded PHC hash string itself (e.g.
  // `$argon2id$v=19$m=19456,t=2,p=1$...`), so no options are passed here —
  // a hash produced under a previous config value remains verifiable even
  // after HASH_MEMORY_COST/HASH_TIME_COST/HASH_PARALLELISM change. Delegates
  // directly to the library's own constant-time comparison; no custom
  // comparison logic is added on top.
  compare(plaintext: string, hashed: string): Promise<boolean> {
    return verify(hashed, plaintext);
  }
}
