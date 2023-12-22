import { Wallet } from './Wallet'

describe('basic wallet', () => {
  const mnemonic =
    'celery net original hire stand seminar cricket reject draft hundred hybrid dry three chair sea enable perfect this good race tooth junior beyond since'
  const privateKey = 'S16aLNzUtGu5FirjkULhqefVWiAXR1kdoRmQhfSU8V7LWdkuY9x'
  const address = 'AU12T2AuCmkmd1BmuBptrSzBqjiM9u2SJ7SVRjWyXCwA4J9UZUwVt'

  it('can generate same wallet', async () => {
    const wallet = new Wallet()
    await wallet.init({
      type: 'massa',
      rpc: 'https://buildnet.massa.net/api/v2',
      password: 'toto',
    })

    expect(wallet.getAddress()).toEqual(address)
    expect(wallet.getPrivateKey()).toEqual(privateKey)
    expect(wallet.getMnemonic()).toEqual(mnemonic)
  })

  it('can generate with Mnemonic', async () => {
    const wallet = new Wallet()
    await wallet.init({
      type: 'massa',
      rpc: 'https://buildnet.massa.net/api/v2',
      mnemonic,
    })

    expect(wallet.getAddress()).toEqual(address)
    expect(wallet.getPrivateKey()).toEqual(privateKey)
    expect(wallet.getMnemonic()).toEqual(mnemonic)
  })

  it('can generate with PrivateKey', async () => {
    const wallet = new Wallet()
    await wallet.init({
      type: 'massa',
      rpc: 'https://buildnet.massa.net/api/v2',
      privateKey,
    })

    expect(wallet.getAddress()).toEqual(address)
    expect(wallet.getPrivateKey()).toEqual(privateKey)
    expect(wallet.getMnemonic()).toBe(undefined)
  })

  it('can generate with random', async () => {
    const wallet = new Wallet()
    await wallet.init({
      type: 'massa',
      rpc: 'https://buildnet.massa.net/api/v2',
    })

    expect(wallet.getAddress()).toBeDefined()
    expect(wallet.getPrivateKey()).toBeDefined()
    expect(wallet.getMnemonic()).toBeDefined()
  })

  it('can getBalance', async () => {
    const wallet = new Wallet()
    await wallet.init({
      type: 'massa',
      rpc: 'https://buildnet.massa.net/api/v2',
      privateKey,
    })
    expect(
      await wallet.getCoinBalance(
        'AU1dADjCGvDFoUeDAchFHCoACNpeceHoxujZmVn3h15FmQSPznrL',
      ),
    ).toEqual('0')
  })

  it('can getTokenBalance', async () => {
    const wallet = new Wallet()
    await wallet.init({
      type: 'massa',
      rpc: 'https://buildnet.massa.net/api/v2',
      privateKey,
    })
    expect(
      await wallet.getTokenBalance(
        'AS12WuMr6jLBy6xgPLSBZaypHC9BXtYBFG2Ys6fPQcEYTMBhSzofC',
        'AU1dADjCGvDFoUeDAchFHCoACNpeceHoxujZmVn3h15FmQSPznrL',
      ),
    ).toEqual('11')
  })

  it('can estimate sendCoin', async () => {
    const wallet = new Wallet()
    await wallet.init({
      type: 'massa',
      rpc: 'https://buildnet.massa.net/api/v2',
      privateKey,
    })
    const estimationResult = await wallet.sendCoinTo(
      'AU1vKSSft8LZrC2UGuTG3m3LFcgWUN64v2n1ypZ6PLTe9xKk3Jah',
      '1',
    )
    expect(estimationResult.success).toBe(true)
    // expect(estimationResult.description).toMatch('insufficient funds')
  })

  it('can estimate sendToken', async () => {
    const wallet = new Wallet()
    await wallet.init({
      type: 'massa',
      rpc: 'https://buildnet.massa.net/api/v2',
      privateKey,
    })

    const estimationResult = await wallet.sendTokenTo(
      'AS12WuMr6jLBy6xgPLSBZaypHC9BXtYBFG2Ys6fPQcEYTMBhSzofC',
      'AU1vKSSft8LZrC2UGuTG3m3LFcgWUN64v2n1ypZ6PLTe9xKk3Jah',
      '1',
    )
    expect(estimationResult.success).toBe(true)
    // expect(estimationResult.description).toMatch(
    //   'execution reverted: ERC20: transfer amount exceeds balance',
    // )
  })
})
