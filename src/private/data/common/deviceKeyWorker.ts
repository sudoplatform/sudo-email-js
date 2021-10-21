import {
  DecodeError,
  DefaultLogger,
  EncryptionAlgorithm,
  KeyNotFoundError,
  SudoKeyManager,
} from '@sudoplatform/sudo-common'
import * as uuid from 'uuid'
import { InternalError } from '../../..'
import { PublicKeyFormatTransformer } from './transformer/publicKeyFormatTransformer'

export enum DeviceKeyWorkerKeyFormat {
  RsaPublicKey = 'RSA_PUBLIC_KEY',
  Spki = 'SPKI',
}
export interface DeviceKey {
  id: string
  algorithm: string
  data: string
  format: DeviceKeyWorkerKeyFormat
}

export enum KeyType {
  KeyPair,
  SymmetricKey,
}

export interface UnsealInput {
  encrypted: string
  keyId: string
  keyType: KeyType
  algorithm?: EncryptionAlgorithm
}

export interface SealInput {
  payload: ArrayBuffer
  keyId: string
  keyType: KeyType
  algorithm?: EncryptionAlgorithm
}

export const SYMMETRIC_KEY_ID = 'email-symmetric-key'
const RSA_KEY_SIZE = 256

export interface DeviceKeyWorker {
  generateKeyPair(): Promise<DeviceKey>

  generateCurrentSymmetricKey(): Promise<string>

  getCurrentSymmetricKeyId(): Promise<string | undefined>

  keyExists(id: string, type: KeyType): Promise<boolean>

  removeKey(id: string, type: KeyType): Promise<void>

  unsealString(input: UnsealInput): Promise<string>

  sealString(input: SealInput): Promise<string>
}

export class DefaultDeviceKeyWorker implements DeviceKeyWorker {
  private log = new DefaultLogger(this.constructor.name)

  readonly Defaults = {
    Algorithm: 'RSAEncryptionOAEPAESCBC',
  }
  constructor(private readonly keyManager: SudoKeyManager) {}

  async generateKeyPair(): Promise<DeviceKey> {
    const keyPairId = uuid.v4()

    await this.keyManager.generateKeyPair(keyPairId)
    const publicKey = await this.keyManager.getPublicKey(keyPairId)
    if (publicKey === undefined) {
      throw new InternalError('Could not generate public key pair')
    }
    const publicKeyFormat =
      new PublicKeyFormatTransformer().toDeviceKeyWorkerKeyFormat(
        publicKey?.keyFormat,
      )
    const publicKeyData = btoa(
      String.fromCharCode(...new Uint8Array(publicKey?.keyData)),
    )
    return {
      id: keyPairId,
      algorithm: this.Defaults.Algorithm,
      data: publicKeyData,
      format: publicKeyFormat,
    }
  }

  async generateCurrentSymmetricKey(): Promise<string> {
    const keyId = uuid.v4()
    const keyIdBits = new TextEncoder().encode(keyId)
    // We need to delete any old key id information before adding a new key.
    await this.keyManager.deletePassword(SYMMETRIC_KEY_ID)
    await this.keyManager.addPassword(keyIdBits.buffer, SYMMETRIC_KEY_ID)
    await this.keyManager.generateSymmetricKey(keyId)
    return keyId
  }

  async getCurrentSymmetricKeyId(): Promise<string | undefined> {
    const keyIdBits = await this.keyManager.getPassword(SYMMETRIC_KEY_ID)
    const keyId = new TextDecoder().decode(keyIdBits)
    if (!keyId.length) {
      return undefined
    }
    const symmKey = await this.keyManager.getSymmetricKey(keyId)
    if (!symmKey) {
      return undefined
    }
    return keyId
  }

  async keyExists(id: string, type: KeyType): Promise<boolean> {
    let key: ArrayBuffer | undefined
    switch (type) {
      case KeyType.SymmetricKey:
        key = await this.keyManager.getSymmetricKey(id)
        return key !== undefined
      case KeyType.KeyPair:
        key = await this.keyManager.getPrivateKey(id)
        return key !== undefined
    }
  }

  async removeKey(id: string, type: KeyType): Promise<void> {
    switch (type) {
      case KeyType.SymmetricKey:
        await this.keyManager.deleteSymmetricKey(id)
        break
      case KeyType.KeyPair:
        await this.keyManager.deleteKeyPair(id)
    }
  }

  async unsealString({
    keyId,
    keyType,
    encrypted,
    algorithm,
  }: UnsealInput): Promise<string> {
    switch (keyType) {
      case KeyType.KeyPair:
        return await this.unsealStringWithKeyPairId({
          keyPairId: keyId,
          encrypted,
        })
      case KeyType.SymmetricKey:
        return await this.unsealWithSymmetricKeyId({
          symmetricKeyId: keyId,
          encrypted,
          algorithm,
        })
    }
  }

  async sealString({
    keyId,
    keyType,
    payload,
    algorithm,
  }: SealInput): Promise<string> {
    switch (keyType) {
      case KeyType.KeyPair:
        return await this.sealWithKeyPairId({
          keyPairId: keyId,
          encrypted: payload,
        })
      case KeyType.SymmetricKey:
        return await this.sealWithSymmetricKeyId({
          keyId,
          encrypted: payload,
          algorithm,
        })
    }
  }

  private async sealWithKeyPairId({
    keyPairId,
    encrypted,
  }: {
    keyPairId: string
    encrypted: ArrayBuffer
  }): Promise<string> {
    const cipherKeyId = uuid.v4()
    await this.keyManager.generateSymmetricKey(cipherKeyId)
    const cipherKey = await this.keyManager.getSymmetricKey(cipherKeyId)
    if (!cipherKey) {
      throw new InternalError('Failed to create cipher key for sealing payload')
    }
    // Need to remove symmetric key as we don't want to save it on device
    await this.keyManager.deleteSymmetricKey(cipherKeyId)
    const sealedPayload = await this.keyManager.encryptWithSymmetricKey(
      cipherKey,
      encrypted,
    )
    const encryptedCipherKey = await this.keyManager.encryptWithPublicKey(
      keyPairId,
      cipherKey,
    )
    const transitoryBuffer = new Uint8Array(
      encryptedCipherKey.byteLength + sealedPayload.byteLength,
    )
    transitoryBuffer.set(new Uint8Array(encryptedCipherKey), 0)
    transitoryBuffer.set(
      new Uint8Array(sealedPayload),
      encryptedCipherKey.byteLength,
    )
    let string = ''
    transitoryBuffer.forEach((b) => {
      const x = String.fromCharCode(b)
      string = string + x
    })
    return btoa(string)
  }

  private async sealWithSymmetricKeyId({
    keyId,
    encrypted,
    algorithm,
  }: {
    keyId: string
    encrypted: ArrayBuffer
    algorithm?: EncryptionAlgorithm
  }): Promise<string> {
    const options = algorithm ? { algorithm } : {}

    const sealed = await this.keyManager.encryptWithSymmetricKeyName(
      keyId,
      encrypted,
      options,
    )
    let string = ''
    new Uint8Array(sealed).forEach((b) => {
      const x = String.fromCharCode(b)
      string = string + x
    })
    return btoa(string)
  }

  private async unsealWithSymmetricKeyId({
    symmetricKeyId,
    encrypted,
    algorithm,
  }: {
    symmetricKeyId: string
    encrypted: string
    algorithm?: EncryptionAlgorithm
  }): Promise<string> {
    const decodeEncrypted = Uint8Array.from(atob(encrypted), (c) =>
      c.charCodeAt(0),
    )
    let unsealedBuffer: ArrayBuffer
    try {
      const options = algorithm ? { algorithm } : {}
      unsealedBuffer = await this.keyManager.decryptWithSymmetricKeyName(
        symmetricKeyId,
        decodeEncrypted,
        options,
      )
    } catch (err) {
      const message = 'Could not unseal sealed payload'
      this.log.error(message, { err })
      throw new DecodeError(message)
    }
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(unsealedBuffer)
    } catch (err) {
      const message = 'Could not decode unsealed payload as UTF-8'
      this.log.error(message, { err })
      throw new DecodeError(message)
    }
  }

  private async unsealStringWithKeyPairId({
    keyPairId,
    encrypted,
  }: {
    keyPairId: string
    encrypted: string
  }): Promise<string> {
    const decodeEncrypted = Uint8Array.from(atob(encrypted), (c) =>
      c.charCodeAt(0),
    )
    const encryptedCipherKeyB64 = decodeEncrypted.slice(0, RSA_KEY_SIZE)
    const encryptedData = decodeEncrypted.slice(RSA_KEY_SIZE)
    if ((await this.keyManager.getPrivateKey(keyPairId)) === undefined) {
      throw new KeyNotFoundError(`Key pair id not found: ${keyPairId}`)
    }
    let cipherKey: ArrayBuffer | undefined
    try {
      cipherKey = await this.keyManager.decryptWithPrivateKey(
        keyPairId,
        encryptedCipherKeyB64,
      )
    } catch (err) {
      const message = 'Could not decrypt AES key from sealed string'
      this.log.error(message, { err })
      throw new DecodeError(message)
    }
    if (!cipherKey) {
      throw new DecodeError('Could not extract AES key from sealed string')
    }
    let unsealedBuffer: ArrayBuffer
    try {
      unsealedBuffer = await this.keyManager.decryptWithSymmetricKey(
        cipherKey,
        encryptedData,
        { algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding },
      )
    } catch (err) {
      const message = 'Could not unseal sealed payload'
      this.log.error(message, { err })
      throw new DecodeError(message)
    } finally {
      // zero out our copy of the cipher key
      new Uint8Array(cipherKey).fill(0)
    }
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(unsealedBuffer)
    } catch (err) {
      const message = 'Could not decode unsealed payload as UTF-8'
      this.log.error(message, { err })
      throw new DecodeError('Could not decode unsealed payload as UTF-8')
    }
  }
}
