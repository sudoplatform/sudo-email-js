/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DecodeError,
  EncryptionAlgorithm,
  KeyNotFoundError,
  PublicKeyFormat,
  SudoKeyManager,
  Buffer as BufferUtil,
} from '@sudoplatform/sudo-common'
import {
  anyString,
  anything,
  capture,
  instance,
  mock,
  reset,
  verify,
  when,
} from 'ts-mockito'
import { v4 } from 'uuid'
import {
  DefaultDeviceKeyWorker,
  DeviceKey,
  DeviceKeyWorkerKeyFormat,
  KeyType,
  SYMMETRIC_KEY_ID,
} from '../../../../../src/private/data/common/deviceKeyWorker'
import {
  arrayBufferToString,
  base64StringToString,
  stringToArrayBuffer,
} from '../../../../../src/private/util/buffer'
import { InternalError } from '../../../../../src/public/errors'
import { EntityDataFactory } from '../../../data-factory/entity'

describe('DeviceKeyWorker Test Suite', () => {
  const mockKeyManager = mock<SudoKeyManager>()
  let instanceUnderTest: DefaultDeviceKeyWorker

  beforeEach(() => {
    reset(mockKeyManager)
    instanceUnderTest = new DefaultDeviceKeyWorker(instance(mockKeyManager))
    when(mockKeyManager.getPassword(anyString())).thenResolve(
      stringToArrayBuffer('aa'),
    )
    when(mockKeyManager.getPublicKey(anything())).thenResolve({
      keyData: stringToArrayBuffer('bb'),
      keyFormat: PublicKeyFormat.RSAPublicKey,
    })
    when(
      mockKeyManager.decryptWithPrivateKey(anything(), anything(), anything()),
    ).thenResolve(stringToArrayBuffer('decryptedPriv'))
    when(
      mockKeyManager.decryptWithSymmetricKey(
        anything(),
        anything(),
        anything(),
      ),
    ).thenResolve(stringToArrayBuffer('decryptedSym'))
    when(mockKeyManager.getSymmetricKey(anything())).thenResolve(
      stringToArrayBuffer('symmetricKey'),
    )
    when(mockKeyManager.generateRandomData(anything())).thenResolve(
      stringToArrayBuffer(v4()),
    )
  })

  describe('generateRandomData', () => {
    it('calls the keyManager function properly and returns the result', async () => {
      const size = 256
      const result = await instanceUnderTest.generateRandomData(size)

      verify(mockKeyManager.generateRandomData(anything())).once()
      const [actualSize] = capture(mockKeyManager.generateRandomData).first()
      expect(actualSize).toEqual(size)
      expect(new TextDecoder().decode(result)).toMatch(
        /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      )
    })
  })

  describe('generateKeyPair', () => {
    it('throws InternalError if public key returns undefined after generation', async () => {
      when(mockKeyManager.getPublicKey(anything())).thenResolve(undefined)
      await expect(instanceUnderTest.generateKeyPair()).rejects.toStrictEqual(
        new InternalError('Could not generate public key pair'),
      )
      verify(mockKeyManager.getPublicKey(anything())).once()
      verify(mockKeyManager.generateKeyPair(anything())).once()
    })

    it('generates keyPair successfully', async () => {
      const deviceKey = await instanceUnderTest.generateKeyPair()
      expect(deviceKey).toMatchObject<DeviceKey>({
        id: expect.stringMatching(EntityDataFactory.uuidV4Regex),
        algorithm: 'RSAEncryptionOAEPAESCBC',
        data: 'YmI=',
        format: DeviceKeyWorkerKeyFormat.RsaPublicKey,
      })
    })
  })

  describe('getSingletonKeyPair', () => {
    it('throws InternalError if public key returns undefined after generation', async () => {
      when(mockKeyManager.getPublicKey(anything())).thenResolve(undefined)
      await expect(
        instanceUnderTest.getSingletonKeyPair(),
      ).rejects.toStrictEqual(
        new InternalError('Could not generate public key pair'),
      )
      verify(mockKeyManager.getPublicKey(anything())).once()
    })

    it('retrieves existing keyPair successfully', async () => {
      when(mockKeyManager.getPassword(anything())).thenResolve(
        stringToArrayBuffer(v4()),
      )
      const deviceKey = await instanceUnderTest.getSingletonKeyPair()
      expect(deviceKey).toMatchObject<DeviceKey>({
        id: expect.stringMatching(EntityDataFactory.uuidV4Regex),
        algorithm: 'RSAEncryptionOAEPAESCBC',
        data: 'YmI=',
        format: DeviceKeyWorkerKeyFormat.RsaPublicKey,
      })
      verify(mockKeyManager.getPublicKey(anything())).once()
    })
  })

  describe('generateRandomSymmetricKey', () => {
    it('generates a new symmetric key successfully', async () => {
      await expect(
        instanceUnderTest.generateRandomSymmetricKey(),
      ).resolves.not.toThrow()
      verify(mockKeyManager.generateSymmetricKey(anything())).once()
      const [actualSymmKeyId] = capture(
        mockKeyManager.generateSymmetricKey,
      ).first()
      expect(actualSymmKeyId).toMatch(
        /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      )
      verify(mockKeyManager.getSymmetricKey(actualSymmKeyId)).once()
      const [actualSymmKeyInput] = capture(
        mockKeyManager.getSymmetricKey,
      ).first()
      expect(actualSymmKeyInput).toStrictEqual(actualSymmKeyId)
      verify(mockKeyManager.deleteSymmetricKey(actualSymmKeyId)).once()
      const [actualDeleteSymmKeyInout] = capture(
        mockKeyManager.getSymmetricKey,
      ).first()
      expect(actualDeleteSymmKeyInout).toStrictEqual(actualSymmKeyId)
    })
    it('should throw an internal error when the symmetric key cannot be found', async () => {
      when(mockKeyManager.getSymmetricKey(anything())).thenResolve(undefined)
      await expect(
        instanceUnderTest.generateRandomSymmetricKey(),
      ).rejects.toThrow(new InternalError('Failed to generate symmetric key'))
      verify(mockKeyManager.generateSymmetricKey(anything())).once()
      const [actualSymmKeyId] = capture(
        mockKeyManager.generateSymmetricKey,
      ).first()
      expect(actualSymmKeyId).toMatch(
        /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      )
      verify(mockKeyManager.getSymmetricKey(actualSymmKeyId)).once()
      const [actualSymmKeyInput] = capture(
        mockKeyManager.getSymmetricKey,
      ).first()
      expect(actualSymmKeyInput).toStrictEqual(actualSymmKeyId)
    })
  })

  describe('generateCurrentSymmetricKey', () => {
    it('adds the keyId to the password vault and generates the key', async () => {
      await expect(
        instanceUnderTest.generateCurrentSymmetricKey(),
      ).resolves.not.toThrow()
      verify(mockKeyManager.addPassword(anything(), anything())).once()
      const [actualPasswordBuffer, actualKeyName] = capture(
        mockKeyManager.addPassword,
      ).first()
      expect(new TextDecoder().decode(actualPasswordBuffer)).toMatch(
        /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i,
      )
      expect(actualKeyName).toStrictEqual(SYMMETRIC_KEY_ID)
      verify(mockKeyManager.generateSymmetricKey(anything())).once()
      const [actualSymmKeyName] = capture(
        mockKeyManager.generateSymmetricKey,
      ).first()
      expect(actualSymmKeyName).toStrictEqual(
        new TextDecoder().decode(actualPasswordBuffer),
      )
    })
    it('deletes any previous key before adding a new key', async () => {
      await expect(
        instanceUnderTest.generateCurrentSymmetricKey(),
      ).resolves.not.toThrow()
      verify(mockKeyManager.deletePassword(anything())).once()
      const [actualPassword] = capture(mockKeyManager.deletePassword).first()
      expect(actualPassword).toStrictEqual(SYMMETRIC_KEY_ID)
    })
  })

  describe('getCurrentSymmetricKeyId', () => {
    beforeEach(() => {
      when(mockKeyManager.getPassword(anything())).thenResolve(
        stringToArrayBuffer('currentSymmKeyId'),
      )
    })
    it('returns undefined if keyid is empty', async () => {
      when(mockKeyManager.getPassword(anything())).thenResolve(
        stringToArrayBuffer(''),
      )
      await expect(
        instanceUnderTest.getCurrentSymmetricKeyId(),
      ).resolves.toBeUndefined()
    })
    it('returns undefined if symmKey is undefined', async () => {
      when(mockKeyManager.getSymmetricKey(anything())).thenResolve(undefined)
      await expect(
        instanceUnderTest.getCurrentSymmetricKeyId(),
      ).resolves.toBeUndefined()
    })
    it('returns keyId if key is found', async () => {
      when(mockKeyManager.getSymmetricKey(anything())).thenResolve(
        stringToArrayBuffer('aa'),
      )
      await expect(
        instanceUnderTest.getCurrentSymmetricKeyId(),
      ).resolves.toStrictEqual('currentSymmKeyId')
    })
    it('calls getPassword correctly', async () => {
      await instanceUnderTest.getCurrentSymmetricKeyId()
      verify(mockKeyManager.getPassword(anything()))
      const [actualPasswordKeyName] = capture(
        mockKeyManager.getPassword,
      ).first()
      expect(actualPasswordKeyName).toStrictEqual(SYMMETRIC_KEY_ID)
    })
  })

  describe('removeKey', () => {
    it('removes symmetric key correctly', async () => {
      await instanceUnderTest.removeKey('dummy_id', KeyType.SymmetricKey)
      verify(mockKeyManager.deleteSymmetricKey('dummy_id')).once()
      verify(mockKeyManager.deleteKeyPair(anything())).never()
    })
    it('removes key pair correctly', async () => {
      await instanceUnderTest.removeKey('dummy_id', KeyType.KeyPair)
      verify(mockKeyManager.deleteKeyPair('dummy_id')).once()
      verify(mockKeyManager.deleteSymmetricKey(anything())).never()
    })
  })

  describe('sealString', () => {
    beforeEach(() => {
      when(mockKeyManager.getSymmetricKey(anything())).thenResolve(
        stringToArrayBuffer(''),
      )
      when(
        mockKeyManager.encryptWithSymmetricKey(
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(stringToArrayBuffer(''))
      when(
        mockKeyManager.encryptWithPublicKey(anything(), anything(), anything()),
      ).thenResolve(stringToArrayBuffer(''))
    })
    describe('keyType == PublicKey', () => {
      it('generates, gets and deletes a symmetric key from the manager', async () => {
        await instanceUnderTest.sealString({
          keyId: v4(),
          keyType: KeyType.KeyPair,
          payload: stringToArrayBuffer(''),
        })
        verify(mockKeyManager.generateSymmetricKey(anything())).once()
        const [cipherKeyId] = capture(
          mockKeyManager.generateSymmetricKey,
        ).first()
        verify(mockKeyManager.getSymmetricKey(anything())).once()
        const [actualCipherKeyId] = capture(
          mockKeyManager.getSymmetricKey,
        ).first()
        expect(actualCipherKeyId).toStrictEqual(cipherKeyId)
        verify(mockKeyManager.deleteSymmetricKey(anything())).once()
        const [deletedCipherKeyId] = capture(
          mockKeyManager.deleteSymmetricKey,
        ).first()
        expect(deletedCipherKeyId).toStrictEqual(cipherKeyId)
      })
      it('throws an error when created symmetric key failed to be found', async () => {
        when(mockKeyManager.getSymmetricKey(anything())).thenResolve(undefined)
        await expect(
          instanceUnderTest.sealString({
            keyId: '',
            keyType: KeyType.KeyPair,
            payload: stringToArrayBuffer(''),
          }),
        ).rejects.toThrow(new InternalError('Failed to generate symmetric key'))
      })
      it('encrypts the payload with the generated cipher key', async () => {
        const cipherKey = stringToArrayBuffer('cipherKey')
        when(mockKeyManager.getSymmetricKey(anything())).thenResolve(cipherKey)
        const payload = stringToArrayBuffer('payload')
        await instanceUnderTest.sealString({
          keyId: v4(),
          keyType: KeyType.KeyPair,
          payload,
        })
        verify(
          mockKeyManager.encryptWithSymmetricKey(
            anything(),
            anything(),
            anything(),
          ),
        ).once()
        const [actualKey, actualPayload] = capture(
          mockKeyManager.encryptWithSymmetricKey,
        ).first()
        expect(actualKey).toStrictEqual(cipherKey)
        expect(actualPayload).toStrictEqual(payload)
      })
      it('returns in format <encrypted-cipherkey><encrypted-payload>', async () => {
        const encryptedPayload = stringToArrayBuffer(v4())
        const encryptedCipherKey = stringToArrayBuffer(v4())
        when(
          mockKeyManager.encryptWithSymmetricKey(
            anything(),
            anything(),
            anything(),
          ),
        ).thenResolve(encryptedPayload)
        when(
          mockKeyManager.encryptWithPublicKey(
            anything(),
            anything(),
            anything(),
          ),
        ).thenResolve(encryptedCipherKey)
        const result = await instanceUnderTest.sealString({
          keyId: v4(),
          keyType: KeyType.KeyPair,
          payload: stringToArrayBuffer(''),
        })
        const decodedResult = base64StringToString(result)
        expect(decodedResult).toStrictEqual(
          `${arrayBufferToString(encryptedCipherKey)}${arrayBufferToString(
            encryptedPayload,
          )}`,
        )
      })
    })
    describe('keyType == SymmetricKey', () => {
      it('calls keyManager.encryptWithSymmetricKeyName correctly', async () => {
        await instanceUnderTest.sealString({
          keyId: 'keyId',
          keyType: KeyType.SymmetricKey,
          payload: stringToArrayBuffer('payload'),
        })
        verify(
          mockKeyManager.encryptWithSymmetricKeyName(
            anything(),
            anything(),
            anything(),
          ),
        ).once()
        const [actualKeyName, actualPayload] = capture(
          mockKeyManager.encryptWithSymmetricKeyName,
        ).first()
        expect(actualKeyName).toStrictEqual('keyId')
        expect(arrayBufferToString(actualPayload)).toStrictEqual('payload')
      })
      it('returns the correct output', async () => {
        when(
          mockKeyManager.encryptWithSymmetricKeyName(
            anything(),
            anything(),
            anything(),
          ),
        ).thenResolve(stringToArrayBuffer('encryptedBuffer'))
        const result = await instanceUnderTest.sealString({
          keyId: '',
          keyType: KeyType.SymmetricKey,
          payload: stringToArrayBuffer(''),
        })
        expect(atob(result)).toStrictEqual('encryptedBuffer')
      })
    })
  })

  describe('sealWithKeyPairIds', () => {
    let keyIds: string[]
    let payload: ArrayBuffer
    let iv: ArrayBuffer
    let encryptedData: ArrayBuffer
    beforeEach(() => {
      keyIds = [v4(), v4()]
      payload = stringToArrayBuffer(v4())
      iv = stringToArrayBuffer(v4())
      encryptedData = stringToArrayBuffer(v4())
      when(
        mockKeyManager.encryptWithSymmetricKey(
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(encryptedData)
      when(
        mockKeyManager.encryptWithPublicKey(anything(), anything(), anything()),
      ).thenResolve(stringToArrayBuffer(v4()))
    })

    it('generates cipher key and encrypts data using it', async () => {
      await instanceUnderTest.sealWithKeyPairIds({
        keyIds,
        payload,
        iv,
      })

      verify(mockKeyManager.generateSymmetricKey(anything())).once()
      verify(mockKeyManager.getSymmetricKey(anything())).once()
      verify(mockKeyManager.deleteSymmetricKey(anything())).once()
      verify(
        mockKeyManager.encryptWithSymmetricKey(
          anything(),
          anything(),
          anything(),
        ),
      ).once()
      const [symmetricKeyArg, payloadArg, optionsArg] = capture(
        mockKeyManager.encryptWithSymmetricKey,
      ).first()
      expect(arrayBufferToString(symmetricKeyArg)).toEqual('symmetricKey')
      expect(arrayBufferToString(payloadArg)).toEqual(
        arrayBufferToString(payload),
      )
      expect(arrayBufferToString(optionsArg?.iv!)).toEqual(
        arrayBufferToString(iv),
      )
    })

    it('encrypts the symmetric key with each public key and returns the results', async () => {
      const result = await instanceUnderTest.sealWithKeyPairIds({
        keyIds,
        payload,
        iv,
      })

      verify(
        mockKeyManager.encryptWithPublicKey(anything(), anything(), anything()),
      ).times(keyIds.length)
      const [keyPairIdArg, payloadArg] = capture(
        mockKeyManager.encryptWithPublicKey,
      ).first()
      expect(keyPairIdArg).toEqual(keyIds[0])
      expect(arrayBufferToString(payloadArg)).toEqual('symmetricKey')
      expect(arrayBufferToString(result.sealedPayload)).toEqual(
        arrayBufferToString(encryptedData),
      )
      expect(result.sealedCipherKeys).toHaveLength(keyIds.length)
    })
  })

  describe('encryptWithSymmetricKey', () => {
    it('encrypts payload with symmetric key successfully', async () => {
      const key = stringToArrayBuffer(v4())
      const payload = stringToArrayBuffer(v4())
      const iv = stringToArrayBuffer(v4())
      const encryptedData = stringToArrayBuffer(v4())
      when(
        mockKeyManager.encryptWithSymmetricKey(
          anything(),
          anything(),
          anything(),
        ),
      ).thenResolve(encryptedData)
      await expect(
        instanceUnderTest.encryptWithSymmetricKey({
          key,
          data: payload,
          iv: iv,
        }),
      ).resolves.toEqual(encryptedData)
      verify(
        mockKeyManager.encryptWithSymmetricKey(anything(), anything(), {
          algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding,
          iv: anything(),
        }),
      )
      const [symmetricKeyArg, payloadArg, optionsArg] = capture(
        mockKeyManager.encryptWithSymmetricKey,
      ).first()
      expect(symmetricKeyArg).toEqual(key)
      expect(payloadArg).toEqual(payload)
      expect(optionsArg?.iv!).toEqual(iv)
    })
  })

  describe('encryptWithPublicKey', () => {
    it('encrypts payload with public key successfully', async () => {
      const key = stringToArrayBuffer(v4())
      const payload = stringToArrayBuffer(v4())
      const encryptedData = stringToArrayBuffer(v4())
      when(
        mockKeyManager.encryptWithPublicKey(anything(), anything(), anything()),
      ).thenResolve(encryptedData)
      expect(
        await instanceUnderTest.encryptWithPublicKey({
          key,
          data: payload,
          format: PublicKeyFormat.RSAPublicKey,
          algorithm: EncryptionAlgorithm.RsaOaepSha1,
        }),
      ).toEqual(encryptedData)
      verify(
        mockKeyManager.encryptWithPublicKey(anything(), anything(), anything()),
      ).once()
      const [keyArg, payloadArg] = capture(
        mockKeyManager.encryptWithPublicKey,
      ).first()
      expect(keyArg).toEqual(key)
      expect(payloadArg).toEqual(payload)
    })
  })

  describe('unsealString', () => {
    describe('keyType == KeyPair', () => {
      it('throws KeyNotFoundError if currentPublicKey returns undefined', async () => {
        const keyId = v4()
        when(mockKeyManager.getPrivateKey(anything())).thenResolve(undefined)
        await expect(
          instanceUnderTest.unsealString({
            encrypted: '',
            keyType: KeyType.KeyPair,
            keyId,
          }),
        ).rejects.toStrictEqual(
          new KeyNotFoundError(`Key pair id not found: ${keyId}`),
        )
      })

      it('throws DecodeError when decrypt fails', async () => {
        when(
          mockKeyManager.decryptWithPrivateKey(anything(), anything()),
        ).thenReject(new Error('error'))
        await expect(
          instanceUnderTest.unsealString({
            encrypted: '',
            keyType: KeyType.KeyPair,
            keyId: '',
          }),
        ).rejects.toStrictEqual(
          new DecodeError('Could not decrypt AES key from sealed string'),
        )
      })
      it('throws DecodeError when decrypt private key returns undefined', async () => {
        when(
          mockKeyManager.decryptWithPrivateKey(anything(), anything()),
        ).thenResolve(undefined)
        await expect(
          instanceUnderTest.unsealString({
            encrypted: '',
            keyType: KeyType.KeyPair,
            keyId: '',
          }),
        ).rejects.toStrictEqual(
          new DecodeError('Could not extract AES key from sealed string'),
        )
      })
      it('throws DecodeError when decrypt symmetric key fails', async () => {
        when(
          mockKeyManager.decryptWithSymmetricKey(
            anything(),
            anything(),
            anything(),
          ),
        ).thenReject(new Error('error'))
        await expect(
          instanceUnderTest.unsealString({
            encrypted: '',
            keyType: KeyType.KeyPair,
            keyId: '',
          }),
        ).rejects.toStrictEqual(
          new DecodeError('Could not extract AES key from sealed string'),
        )
      })
      it('calls through everything expected', async () => {
        const mockCipherKey = BufferUtil.fromString('cipherKey')
        when(
          mockKeyManager.decryptWithPrivateKey(anything(), anything()),
        ).thenResolve(mockCipherKey)
        await expect(
          instanceUnderTest.unsealString({
            encrypted: btoa(`${new Array(256 + 1).join('0')}aabbccddeeff`),
            keyType: KeyType.KeyPair,
            keyId: 'keyId',
          }),
        ).resolves.toStrictEqual('decryptedSym')
        verify(
          mockKeyManager.decryptWithPrivateKey(anything(), anything()),
        ).once()
        const [inputKeyId, encrypted] = capture(
          mockKeyManager.decryptWithPrivateKey,
        ).first()
        expect(inputKeyId).toStrictEqual('keyId')
        const expectedBuffer = BufferUtil.toArrayBuffer(
          Uint8Array.from(`${new Array(256 + 1).join('0')}`, (c) =>
            c.charCodeAt(0),
          ),
        )
        // This is expected due to the way buffers need to be converted from Buffer -> ArrayBuffer
        expect(encrypted).toStrictEqual(expectedBuffer)
        verify(
          mockKeyManager.decryptWithSymmetricKey(
            anything(),
            anything(),
            anything(),
          ),
        ).once()
        const [cipherKey, encryptedData] = capture(
          mockKeyManager.decryptWithSymmetricKey,
        ).first()
        expect(cipherKey).toStrictEqual(mockCipherKey)
        const expectedEncryptedData = BufferUtil.toArrayBuffer(
          Uint8Array.from('aabbccddeeff', (c) => c.charCodeAt(0)),
        )
        expect(encryptedData).toStrictEqual(expectedEncryptedData)
      })
    })
    describe('keyType == SymmetricKey', () => {
      beforeEach(() => {
        when(
          mockKeyManager.decryptWithSymmetricKeyName(
            anything(),
            anything(),
            anything(),
          ),
        ).thenResolve(stringToArrayBuffer('aa'))
      })
      it('calls keyManager.decryptWithSymmetricKeyName correctly', async () => {
        await instanceUnderTest.unsealString({
          keyId: 'keyId',
          encrypted: btoa('encrypted'),
          keyType: KeyType.SymmetricKey,
        })
        verify(
          mockKeyManager.decryptWithSymmetricKeyName(
            anything(),
            anything(),
            anything(),
          ),
        ).once()
        const [actualKeyId, actualEncryptedB64] = capture(
          mockKeyManager.decryptWithSymmetricKeyName,
        ).first()
        expect(actualKeyId).toStrictEqual('keyId')
        expect(arrayBufferToString(actualEncryptedB64)).toStrictEqual(
          'encrypted',
        )
      })
      it('throws an DecodeError if keyManager.decryptWithSymmetricKeyName throws an error', async () => {
        when(
          mockKeyManager.decryptWithSymmetricKeyName(
            anything(),
            anything(),
            anything(),
          ),
        ).thenReject(new Error('Failed'))
        await expect(
          instanceUnderTest.unsealString({
            keyId: 'keyId',
            encrypted: btoa('encrypted'),
            keyType: KeyType.SymmetricKey,
          }),
        ).rejects.toThrow(new DecodeError('Could not unseal sealed payload'))
      })
    })
  })

  describe('unsealWithKeyPairId', () => {
    it('decrypts the cipher key then uses that to decrypt the data', async () => {
      const keyPairId = v4()
      const sealedCipherKey = stringToArrayBuffer(v4())
      const sealedPayload = stringToArrayBuffer(v4())
      const iv = stringToArrayBuffer(v4())
      const result = await instanceUnderTest.unsealWithKeyPairId({
        keyPairId,
        sealedCipherKey,
        sealedPayload,
        iv,
      })

      verify(
        mockKeyManager.decryptWithPrivateKey(
          anything(),
          anything(),
          anything(),
        ),
      ).once()
      const [keyPairIdArg, encryptedKeyArg] = capture(
        mockKeyManager.decryptWithPrivateKey,
      ).first()
      expect(keyPairIdArg).toEqual(keyPairId)
      expect(arrayBufferToString(encryptedKeyArg)).toEqual(
        arrayBufferToString(sealedCipherKey),
      )

      verify(
        mockKeyManager.decryptWithSymmetricKey(
          anything(),
          anything(),
          anything(),
        ),
      ).once()
      const [cipherKeyArg, sealedPayloadArg, optionsArg] = capture(
        mockKeyManager.decryptWithSymmetricKey,
      ).first()

      expect(arrayBufferToString(cipherKeyArg)).toEqual('decryptedPriv')
      expect(arrayBufferToString(sealedPayloadArg)).toEqual(
        arrayBufferToString(sealedPayload),
      )
      expect(arrayBufferToString(optionsArg?.iv!)).toEqual(
        arrayBufferToString(iv),
      )

      expect(arrayBufferToString(result)).toEqual('decryptedSym')
    })
  })
})
