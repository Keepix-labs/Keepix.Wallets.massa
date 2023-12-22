import {
  Client,
  ClientFactory,
  IAccount,
  IProvider,
  ProviderType,
  WalletClient,
  utils,
  toMAS,
  Args,
  bytesToU256,
  fromMAS,
} from '@massalabs/massa-web3'
import { entropyToMnemonic, mnemonicToSeed } from 'bip39-light'
import crypto from 'crypto'
import { BigNumber } from 'bignumber.js'
import { HDKey } from './lib/hdkey'

const DERIVATION_PATH = `m/44'/632'/0'/0'/0'`

function createPrivateKey(templatePrivateKey: string, password: string) {
  const hash = crypto
    .createHash('sha256')
    .update(templatePrivateKey + password, 'utf8')
    .digest('hex')
  return hash.substring(0, 64) // Truncate to 64 characters (32 bytes)
}

export const parseAmount = (
  amount: number | string | BigNumber | bigint,
  decimals: number,
): bigint => {
  const parsed = new BigNumber(amount.toString())
  const scaleFactor = new BigNumber(10).pow(new BigNumber(decimals))
  const amountScaled = parsed.times(scaleFactor)
  return BigInt(amountScaled.toFixed(0))
}

export const formatAmount = (
  amount: number | string | BigNumber | bigint,
  decimals: number,
): BigNumber => {
  const parsed = new BigNumber(amount.toString())
  const scaleFactor = new BigNumber(10).pow(new BigNumber(decimals))
  const amountScaled = parsed.dividedBy(scaleFactor)
  return new BigNumber(amountScaled.toFixed(decimals))
}

/**
 * Wallet class who respect the WalletLibraryInterface for Keepix
 */
export class Wallet {
  private account?: IAccount
  private wallet?: Client
  private mnemonic?: string
  private type?: string
  private keepixTokens?: { coins: any; tokens: any }
  private rpc?: any

  constructor() {}

  public async init({
    password,
    mnemonic,
    privateKey,
    type,
    keepixTokens,
    rpc,
    privateKeyTemplate = '0x2050939757b6d498bb0407e001f0cb6db05c991b3c6f7d8e362f9d27c70128b9',
  }: {
    password?: string
    mnemonic?: string
    privateKey?: string
    type: string
    keepixTokens?: { coins: any; tokens: any } // whitelisted coins & tokens
    rpc: any
    privateKeyTemplate?: string
  }) {
    this.type = type
    this.keepixTokens = keepixTokens

    // select one random RPC or override
    if (keepixTokens != undefined
      && keepixTokens.coins[type] !== undefined
      && keepixTokens.coins[type].rpcs != undefined) {
        this.rpc = keepixTokens.coins[type].rpcs[Math.floor(Math.random()*keepixTokens.coins[type].rpcs.length)].url;
    }
    if (rpc !== undefined) {
      this.rpc = rpc.url;
    }

    const providers = [
      {
        type: ProviderType.PUBLIC,
        url: this.rpc,
      } as IProvider,
      {
        type: ProviderType.PRIVATE,
        url: this.rpc,
      } as IProvider,
    ]

    // from password
    if (password !== undefined) {
      const newEntropy = createPrivateKey(privateKeyTemplate, password)
      this.mnemonic = entropyToMnemonic(newEntropy)

      const privKey = await this.getPrivateKeyFromMnemonic(this.mnemonic)

      this.account = await WalletClient.getAccountFromSecretKey(privKey)

      this.wallet = await ClientFactory.createCustomClient(
        providers,
        true,
        this.account,
      )

      return
    }
    // from mnemonic
    if (mnemonic !== undefined) {
      this.mnemonic = mnemonic
      const privKey = await this.getPrivateKeyFromMnemonic(this.mnemonic)

      this.account = await WalletClient.getAccountFromSecretKey(privKey)

      this.wallet = await ClientFactory.createCustomClient(
        providers,
        true,
        this.account,
      )
      return
    }

    // from privateKey only
    if (privateKey !== undefined) {
      this.mnemonic = undefined
      this.account = await WalletClient.getAccountFromSecretKey(privateKey)
      this.wallet = await ClientFactory.createCustomClient(
        providers,
        true,
        this.account,
      )
      return
    }
    // Random
    this.mnemonic = entropyToMnemonic(crypto.randomBytes(32).toString('hex'))

    const privKey = await this.getPrivateKeyFromMnemonic(this.mnemonic)

    this.account = await WalletClient.getAccountFromSecretKey(privKey)

    this.wallet = await ClientFactory.createCustomClient(
      providers,
      true,
      this.account,
    )
  }

  // PUBLIC

  public getPrivateKey() {
    return this.account?.secretKey
  }

  public getMnemonic() {
    return this.mnemonic
  }

  public getAddress() {
    return this.account?.address
  }

  public getProdiver() {
    return undefined
  }

  public getConnectedWallet = () => {
    return this.wallet
  }

  // always display the balance in 0 decimals like 1.01 MASSA
  public async getCoinBalance(walletAddress?: string) {
    if (!this.wallet || !this.account) throw new Error('Not initialized')
    try {
      const balance = await this.wallet
        .wallet()
        .getAccountBalance(walletAddress ?? this.account.address ?? '')
      return toMAS(balance?.final ?? '0').toString()
    } catch (err) {
      console.log(err)
      return '0'
    }
  }

  // always display the balance in 0 decimals like 1.01 RPL
  public async getTokenBalance(tokenAddress: string, walletAddress?: string) {
    if (!this.wallet || !this.account) throw new Error('Not initialized')
    try {
      const decimals = await this.wallet.smartContracts().readSmartContract({
        targetAddress: tokenAddress,
        targetFunction: 'decimals',
        parameter: new Args(),
        maxGas: 100000000n,
      })
      const balance = await this.wallet.smartContracts().readSmartContract({
        targetAddress: tokenAddress,
        targetFunction: 'balanceOf',
        parameter: new Args().addString(
          walletAddress ?? this.account.address ?? '',
        ),
        maxGas: 100000000n,
      })
      return formatAmount(
        bytesToU256(balance.returnValue),
        decimals.returnValue[0],
      ).toString()
    } catch (err) {
      console.log(err)
      return '0'
    }
  }

  public async sendCoinTo(receiverAddress: string, amount: string) {
    if (!this.wallet || !this.account) throw new Error('Not initialized')
    try {
      const tx = await this.wallet.wallet().sendTransaction({
        amount: fromMAS(amount),
        fee: 0n,
        recipientAddress: receiverAddress,
      })
      return { success: true, description: tx.toString() }
    } catch (err) {
      console.log(err)
      return { success: false, description: `Transaction failed: ${err}` }
    }
  }

  public async sendTokenTo(
    tokenAddress: string,
    receiverAddress: string,
    amount: string,
  ) {
    if (!this.wallet || !this.account) throw new Error('Not initialized')
    try {
      const decimals = await this.wallet.smartContracts().readSmartContract({
        targetAddress: tokenAddress,
        targetFunction: 'decimals',
        parameter: new Args(),
        maxGas: 100000000n,
      })

      const parsedAmount = parseAmount(amount, decimals.returnValue[0])

      const tx = await this.wallet.smartContracts().callSmartContract({
        targetAddress: tokenAddress,
        functionName: 'transfer',
        maxGas: 100000000n,
        fee: 0n,
        coins: 0n,
        parameter: new Args().addString(receiverAddress).addU256(parsedAmount),
      })

      return { success: true, description: tx.toString() }
    } catch (err) {
      console.log(err)
      return { success: false, description: `Transaction failed: ${err}` }
    }
  }

  private async getPrivateKeyFromMnemonic(mnemonic: string) {
    const hdkey = new HDKey()
    await hdkey.derivePath(DERIVATION_PATH, mnemonicToSeed(mnemonic))
    const privateKey = utils.crypto.base58Encode(
      Uint8Array.from([0, ...hdkey.privateKey]),
    )
    return `S${privateKey}`
  }
}
