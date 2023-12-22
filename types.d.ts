declare module 'bip39-light' {
  export function mnemonicToSeed(mnemonic: string, password?: string): Buffer
  export function mnemonicToSeedHex(mnemonic: string, password?: string): string
  export function mnemonicToEntropy(
    mnemonic: string,
    wordlist?: string[],
  ): string
  export function entropyToMnemonic(
    entropy: string,
    wordlist?: string[],
  ): string
  export function generateMnemonic(
    strength?: number,
    rng?: Buffer,
    wordlist?: string[],
  ): string
  export function validateMnemonic(
    mnemonic: string,
    wordlist?: string[],
  ): boolean
}
