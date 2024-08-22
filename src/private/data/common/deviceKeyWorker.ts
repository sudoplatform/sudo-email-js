/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DecodeError,
  DefaultLogger,
  EncryptionAlgorithm,
  KeyNotFoundError,
  Logger,
  PublicKey,
  SudoKeyManager,
  SymmetricEncryptionOptions,
} from '@sudoplatform/sudo-common'
import { v4 } from 'uuid'
import { InternalError } from '../../../public/errors'
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

/**
 * Input used to seal a string with a cryptograhic key
 * @property {ArrayBuffer} payload The payload to be sealed
 * @property {string} keyId The id of the key to use in sealing
 * @property {KeyType} keyType The type of key to use in sealing
 * @property {EncryptionAlgorithm} algorithm The cryptographic algorithm to seal with (optional)
 */
export interface SealInput {
  payload: ArrayBuffer
  keyId: string
  keyType: KeyType
  algorithm?: EncryptionAlgorithm
}

/**
 * Input used to seal a string with multiple KeyPair ids
 * @property {ArrayBuffer} payload The payload to be sealed
 * @property {string[]} keyIds An array of the KeyPair ids to seal with as strings
 * @property {ArrayBuffer} iv The IV used to seal (optional)
 */
export interface SealWithKeyPairIdsInput {
  payload: ArrayBuffer
  keyIds: string[]
  iv?: ArrayBuffer
}

/**
 * The result of a `sealStringWithKeyPairIds` operation
 * @property {ArrayBuffer} sealedPayload The sealed payload
 * @property {ArrayBuffer[]} sealedCiperKeys An array containing the result of sealing the cipher key, used to seal the payload, with each KeyPair and the KeyPair id
 */
export interface SealWithKeyPairIdsOutput {
  sealedPayload: ArrayBuffer
  sealedCipherKeys: { sealedValue: ArrayBuffer; keyId: string }[]
}

export interface UnsealWithKeyPairIdInput {
  sealedPayload: ArrayBuffer
  sealedCipherKey: ArrayBuffer
  keyPairId: string
  iv?: ArrayBuffer
}

/**
 * Input used to encrypt the data with the input symmetric key.
 *
 * @property {ArrayBuffer} key The symmetric key used to encrypt the data.
 * @property {ArrayBuffer} data Data to encrypted.
 * @property {ArrayBuffer} iv (Optional) The initialization vector. Must be 128 bit in size for AES-CBC and 96 for AES-GCM.
 */
export interface EncryptWithSymmetricKeyInput {
  key: ArrayBuffer
  data: ArrayBuffer
  iv?: ArrayBuffer
}

/**
 * Input used to encrypt the data with the input public key.
 *
 * @property {ArrayBuffer} key The public key used to encrypt the data.
 * @property {ArrayBuffer} data Data to encrypted.
 * @property {EncryptionAlgorithm} algorithm Algorithm used to encrypt the data.
 */
export interface EncryptWithPublicKeyInput {
  key: ArrayBuffer
  data: ArrayBuffer
  algorithm: EncryptionAlgorithm
}

export const SYMMETRIC_KEY_ID = 'email-symmetric-key'
const RSA_KEY_SIZE = 256
const SINGLETON_PUBLIC_KEY_ID = 'singleton-key-id'

export interface DeviceKeyWorker {
  generateRandomData(size: number): Promise<ArrayBuffer>

  generateKeyPair(): Promise<DeviceKey>

  getSingletonKeyPair(): Promise<DeviceKey>

  generateRandomSymmetricKey(): Promise<ArrayBuffer>

  generateCurrentSymmetricKey(): Promise<string>

  getCurrentSymmetricKeyId(): Promise<string | undefined>

  keyExists(id: string, type: KeyType): Promise<boolean>

  removeKey(id: string, type: KeyType): Promise<void>

  /**
   * Seals the given string using the provided key and algorithm.
   * @param {SealInput} input
   * @returns {string} The sealed string
   */
  sealString(input: SealInput): Promise<string>

  sealWithKeyPairIds(
    input: SealWithKeyPairIdsInput,
  ): Promise<SealWithKeyPairIdsOutput>

  encryptWithSymmetricKey(
    input: EncryptWithSymmetricKeyInput,
  ): Promise<ArrayBuffer>

  encryptWithPublicKey(input: EncryptWithPublicKeyInput): Promise<ArrayBuffer>

  unsealString(input: UnsealInput): Promise<string>

  unsealWithKeyPairId(input: UnsealWithKeyPairIdInput): Promise<ArrayBuffer>
}

export class DefaultDeviceKeyWorker implements DeviceKeyWorker {
  private log: Logger

  readonly Defaults = {
    Algorithm: 'RSAEncryptionOAEPAESCBC',
  }
  constructor(private readonly keyManager: SudoKeyManager) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  private async formatDeviceKey(
    keyPairId: string,
    publicKey: PublicKey,
  ): Promise<DeviceKey> {
    const publicKeyFormat =
      new PublicKeyFormatTransformer().toDeviceKeyWorkerKeyFormat(
        publicKey.keyFormat,
      )
    const publicKeyData = btoa(
      String.fromCharCode(...new Uint8Array(publicKey.keyData)),
    )
    return {
      id: keyPairId,
      algorithm: this.Defaults.Algorithm,
      data: publicKeyData,
      format: publicKeyFormat,
    }
  }

  async generateRandomData(size: number): Promise<ArrayBuffer> {
    return await this.keyManager.generateRandomData(size)
  }

  /**
   * Generates a new Public Key pair and returns as formatted Device Key.
   */
  async generateKeyPair(): Promise<DeviceKey> {
    const keyId = v4()
    await this.keyManager.generateKeyPair(keyId)

    const publicKey = await this.keyManager.getPublicKey(keyId)
    if (publicKey === undefined) {
      throw new InternalError('Could not generate public key pair')
    }

    const deviceKey = await this.formatDeviceKey(keyId, publicKey)
    return deviceKey
  }

  /**
   * Returns the current singleton Public Key from Key Manager.
   * A new key will be generated and returned if none exists.
   */
  async getSingletonKeyPair(): Promise<DeviceKey> {
    let keyIdBits = await this.keyManager.getPassword(SINGLETON_PUBLIC_KEY_ID)
    let keyId = new TextDecoder().decode(keyIdBits)

    // If key id doesn't exist, generate new key and store
    if (!keyId.length) {
      keyId = v4()
      keyIdBits = new TextEncoder().encode(keyId)
      await this.keyManager.addPassword(
        (keyIdBits as Uint8Array).buffer,
        SINGLETON_PUBLIC_KEY_ID,
      )
      await this.keyManager.generateKeyPair(keyId)
    }

    // Get public key with singleton key id
    const publicKey = await this.keyManager.getPublicKey(keyId)
    if (publicKey === undefined) {
      throw new InternalError('Could not generate public key pair')
    }

    const deviceKey = await this.formatDeviceKey(keyId, publicKey)
    return deviceKey
  }

  /**
   * Generates a new symmetric key and returns its bytes. Does not store it in the
   * device.
   * @returns {ArrayBuffer} The symmetric key.
   */
  async generateRandomSymmetricKey(): Promise<ArrayBuffer> {
    const keyId = v4()
    const message = 'Failed to generate symmetric key'
    try {
      await this.keyManager.generateSymmetricKey(keyId)
      const symmetricKey = await this.keyManager.getSymmetricKey(keyId)
      if (!symmetricKey) {
        throw new InternalError(message)
      }
      await this.keyManager.deleteSymmetricKey(keyId)
      return symmetricKey
    } catch (err) {
      this.log.error(message, { err })
      throw new InternalError(message)
    }
  }

  async generateCurrentSymmetricKey(): Promise<string> {
    const keyId = v4()
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
    const symmetricKey = await this.keyManager.getSymmetricKey(keyId)
    if (!symmetricKey) {
      return undefined
    }
    return keyId
  }

  async keyExists(id: string, type: KeyType): Promise<boolean> {
    switch (type) {
      case KeyType.SymmetricKey:
        return await this.keyManager.doesSymmetricKeyExist(id)
      case KeyType.KeyPair:
        return await this.keyManager.doesPrivateKeyExist(id)
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

  async sealString({
    keyId,
    keyType,
    payload,
    algorithm,
  }: SealInput): Promise<string> {
    switch (keyType) {
      case KeyType.KeyPair:
        const { sealedPayload, sealedCipherKeys } =
          await this.sealWithKeyPairIds({
            keyIds: [keyId],
            payload,
          })
        return this.concatArrayBuffersToString(
          sealedCipherKeys[0].sealedValue,
          sealedPayload,
        )
      case KeyType.SymmetricKey:
        return await this.sealWithSymmetricKeyId({
          keyId,
          encrypted: payload,
          algorithm,
        })
    }
  }

  async sealWithKeyPairIds(
    input: SealWithKeyPairIdsInput,
  ): Promise<SealWithKeyPairIdsOutput> {
    const symmetricKey = await this.generateRandomSymmetricKey()
    const sealedPayload = await this.keyManager.encryptWithSymmetricKey(
      symmetricKey,
      input.payload,
      { algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding, iv: input.iv },
    )
    const sealedCipherKeys = await Promise.all(
      input.keyIds.map(async (keyPairId) => {
        const sealedValue = await this.keyManager.encryptWithPublicKey(
          keyPairId,
          symmetricKey,
          {
            algorithm: EncryptionAlgorithm.RsaOaepSha1, // Same as default
          },
        )
        return { sealedValue, keyId: keyPairId }
      }),
    )
    return { sealedPayload, sealedCipherKeys }
  }

  async encryptWithSymmetricKey(
    input: EncryptWithSymmetricKeyInput,
  ): Promise<ArrayBuffer> {
    try {
      return await this.keyManager.encryptWithSymmetricKey(
        input.key,
        input.data,
        { algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding, iv: input.iv },
      )
    } catch (err) {
      const message = 'Failed to encrypt with symmetric key'
      this.log.error(message, { err })
      throw new InternalError(message)
    }
  }

  async encryptWithPublicKey(
    input: EncryptWithPublicKeyInput,
  ): Promise<ArrayBuffer> {
    try {
      return await this.keyManager.encryptWithPublicKey(input.key, input.data, {
        algorithm: input.algorithm,
      })
    } catch (err) {
      const message = 'Failed to encrypt with public key'
      this.log.error(message, { err })
      throw new InternalError(message)
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

  async unsealWithKeyPairId(
    input: UnsealWithKeyPairIdInput,
  ): Promise<ArrayBuffer> {
    try {
      const unsealedCipherKey = await this.keyManager.decryptWithPrivateKey(
        input.keyPairId,
        input.sealedCipherKey,
        { algorithm: EncryptionAlgorithm.RsaOaepSha1 },
      )

      if (!unsealedCipherKey) {
        throw new DecodeError('Could not unseal cipher key')
      }

      return await this.decryptWithSymmetricKey(
        unsealedCipherKey,
        input.sealedPayload,
        { iv: input.iv },
      )
    } catch (e) {
      console.error('error decrypting', { e })
      throw e
    }
  }

  private async decryptWithSymmetricKey(
    key: ArrayBuffer,
    data: ArrayBuffer,
    options: SymmetricEncryptionOptions,
  ): Promise<ArrayBuffer> {
    return this.keyManager.decryptWithSymmetricKey(key, data, options)
  }

  /**
   * Appends `buffer2` to the end of `buffer1` and returns the result as a string
   * @param {ArrayBuffer} buffer1
   * @param {ArrayBuffer} buffer2
   * @returns {string} The resulting string
   */
  private concatArrayBuffersToString(
    buffer1: ArrayBuffer,
    buffer2: ArrayBuffer,
  ): string {
    const transitoryBuffer = new Uint8Array(
      buffer1.byteLength + buffer2.byteLength,
    )
    transitoryBuffer.set(new Uint8Array(buffer1), 0)
    transitoryBuffer.set(new Uint8Array(buffer2), buffer1.byteLength)
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
