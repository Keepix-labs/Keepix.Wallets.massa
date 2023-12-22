const ED25519_CURVE = Buffer.from('ed25519 seed', 'utf8')
const HARDENED_OFFSET = 0x80000000
const pathRegex = new RegExp("^m(\\/[0-9]+')+$")
const replaceDerive = (val: string): string => val.replace("'", '')

function assert(expressions: boolean, msg: string) {
  if (!expressions) {
    throw new Error(msg)
  }
}

function checkInt(
  buf: Uint8Array,
  value: number,
  offset: number,
  ext: number,
  max: number,
  min: number,
) {
  assert(buf instanceof Uint8Array, 'INVALID_U8_ARRAY')

  if (value > max || value < min) {
    throw new Error('OUT_OF_BOUNDS')
  }
  if (offset + ext > buf.length) {
    throw new Error('OUT_OF_RANGE')
  }
}

function writeUint32BE(
  source: Uint8Array,
  value: number,
  offset: number,
  noAssert?: boolean,
): Uint8Array {
  source = Uint8Array.from(source)
  value = Number(value)
  offset = offset >>> 0

  if (!noAssert) {
    checkInt(source, value, offset, 4, 0xffffffff, 0)
  }

  source[offset] = value >>> 24
  source[offset + 1] = value >>> 16
  source[offset + 2] = value >>> 8
  source[offset + 3] = value & 0xff

  return source
}

async function hmac(secret: Uint8Array, body: Uint8Array) {
  const crypto = require('crypto')
  const key = await crypto.subtle.importKey(
    'raw',
    secret,
    {
      name: 'HMAC',
      hash: {
        name: 'SHA-512',
      },
    },
    false,
    ['sign', 'verify'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, body)

  return new Uint8Array(signature)
}

export class HDKey {
  static isValidPath(path: string) {
    if (!pathRegex.test(path)) {
      return false
    }

    return !path
      .split('/')
      .slice(1)
      .map(replaceDerive)
      .some((v) => isNaN(Number(v)))
  }

  #key = new Uint8Array(32)
  #chainCode = new Uint8Array(32)

  get privateKey() {
    return this.#key
  }

  get chainCode() {
    return this.#chainCode
  }

  async #fromMasterSeed(seed: Uint8Array) {
    const I = await hmac(ED25519_CURVE, seed)

    this.#key = I.slice(0, 32)
    this.#chainCode = I.slice(32)
  }

  async #deriveChild(index: number) {
    assert(index < 0 || index > 2147483647, 'INVALID_PATH_INDEX')
    assert(
      Boolean(this.#chainCode && this.#chainCode.length > 0),
      'CHAIN_CODE_EMPTY',
    )

    const key = Uint8Array.from(this.#key || [])
    const indexBuffer = writeUint32BE(new Uint8Array(4), index, 0)
    const data = Uint8Array.from([...new Uint8Array(1), ...key, ...indexBuffer])
    const I = await hmac(Uint8Array.from(this.#chainCode || []), data)

    this.#key = I.slice(0, 32)
    this.#chainCode = I.slice(32)
  }

  async derivePath(path: string, seed: Uint8Array, offset = HARDENED_OFFSET) {
    assert(HDKey.isValidPath(path), 'INVALID_PATH')

    await this.#fromMasterSeed(seed)

    const segments = path
      .split('/')
      .slice(1)
      .map(replaceDerive)
      .map((el) => parseInt(el, 10))

    for (const segment of segments) {
      await this.#deriveChild(segment + offset)
    }
  }
}
