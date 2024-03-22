/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DecodeError,
  KeyNotFoundError,
  PublicKeyFormat,
  SudoKeyManager,
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
import { InternalError } from '../../../../../src/public/errors'
import { ab2str, b64str2str, str2ab } from '../../../../util/buffer'
import { EntityDataFactory } from '../../../data-factory/entity'

describe('DeviceKeyWorker Test Suite', () => {
  const mockKeyManager = mock<SudoKeyManager>()
  let instanceUnderTest: DefaultDeviceKeyWorker

  beforeEach(() => {
    reset(mockKeyManager)
    instanceUnderTest = new DefaultDeviceKeyWorker(instance(mockKeyManager))
    when(mockKeyManager.getPassword(anyString())).thenResolve(str2ab('aa'))
    when(mockKeyManager.getPublicKey(anything())).thenResolve({
      keyData: str2ab('bb'),
      keyFormat: PublicKeyFormat.RSAPublicKey,
    })
    when(
      mockKeyManager.decryptWithPrivateKey(anything(), anything()),
    ).thenResolve(str2ab('decryptedPriv'))
    when(
      mockKeyManager.decryptWithSymmetricKey(
        anything(),
        anything(),
        anything(),
      ),
    ).thenResolve(str2ab('decryptedSym'))
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
      when(mockKeyManager.getPassword(anything())).thenResolve(str2ab(v4()))
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
        str2ab('currentSymmKeyId'),
      )
    })
    it('returns undefined if keyid is empty', async () => {
      when(mockKeyManager.getPassword(anything())).thenResolve(str2ab(''))
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
      when(mockKeyManager.getSymmetricKey(anything())).thenResolve(str2ab('aa'))
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
          new DecodeError('Could not unseal sealed payload'),
        )
      })
      it('calls through everything expected', async () => {
        when(
          mockKeyManager.decryptWithPrivateKey(anything(), anything()),
        ).thenResolve(str2ab('cipherKey'))
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
        const expectedBuffer = Uint8Array.from(
          `${new Array(256 + 1).join('0')}`,
          (c) => c.charCodeAt(0),
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
        expect(cipherKey).toStrictEqual(str2ab('cipherKey'))
        const expectedEncryptedData = Uint8Array.from('aabbccddeeff', (c) =>
          c.charCodeAt(0),
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
        ).thenResolve(str2ab('aa'))
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
        expect(ab2str(actualEncryptedB64)).toStrictEqual('encrypted')
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
  describe('sealString', () => {
    beforeEach(() => {
      when(mockKeyManager.getSymmetricKey(anything())).thenResolve(str2ab(''))
      when(
        mockKeyManager.encryptWithSymmetricKey(anything(), anything()),
      ).thenResolve(str2ab(''))
      when(
        mockKeyManager.encryptWithPublicKey(anything(), anything()),
      ).thenResolve(str2ab(''))
    })
    describe('keyType == PublicKey', () => {
      it('generates, gets and deletes a symmetric key from the manager', async () => {
        await instanceUnderTest.sealString({
          keyId: v4(),
          keyType: KeyType.KeyPair,
          payload: str2ab(''),
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
            payload: str2ab(''),
          }),
        ).rejects.toThrow(
          new InternalError('Failed to create cipher key for sealing payload'),
        )
      })
      it('encrypts the payload with the generated cipher key', async () => {
        const cipherKey = str2ab('cipherKey')
        when(mockKeyManager.getSymmetricKey(anything())).thenResolve(cipherKey)
        const payload = str2ab('payload')
        await instanceUnderTest.sealString({
          keyId: v4(),
          keyType: KeyType.KeyPair,
          payload,
        })
        verify(
          mockKeyManager.encryptWithSymmetricKey(anything(), anything()),
        ).once()
        const [actualKey, actualPayload] = capture(
          mockKeyManager.encryptWithSymmetricKey,
        ).first()
        expect(actualKey).toStrictEqual(cipherKey)
        expect(actualPayload).toStrictEqual(payload)
      })
      it('returns in format <encrypted-cipherkey><encrypted-payload>', async () => {
        const encryptedPayload = str2ab(v4())
        const encryptedCipherKey = str2ab(v4())
        when(
          mockKeyManager.encryptWithSymmetricKey(anything(), anything()),
        ).thenResolve(encryptedPayload)
        when(
          mockKeyManager.encryptWithPublicKey(anything(), anything()),
        ).thenResolve(encryptedCipherKey)
        const result = await instanceUnderTest.sealString({
          keyId: v4(),
          keyType: KeyType.KeyPair,
          payload: str2ab(''),
        })
        const decodedResult = b64str2str(result)
        expect(decodedResult).toStrictEqual(
          `${ab2str(encryptedCipherKey)}${ab2str(encryptedPayload)}`,
        )
      })
    })
    describe('keyType == SymmetricKey', () => {
      it('calls keyManager.encryptWithSymmetricKeyName correctly', async () => {
        await instanceUnderTest.sealString({
          keyId: 'keyId',
          keyType: KeyType.SymmetricKey,
          payload: str2ab('payload'),
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
        expect(ab2str(actualPayload)).toStrictEqual('payload')
      })
      it('returns the correct output', async () => {
        when(
          mockKeyManager.encryptWithSymmetricKeyName(
            anything(),
            anything(),
            anything(),
          ),
        ).thenResolve(str2ab('encryptedBuffer'))
        const result = await instanceUnderTest.sealString({
          keyId: '',
          keyType: KeyType.SymmetricKey,
          payload: str2ab(''),
        })
        expect(atob(result)).toStrictEqual('encryptedBuffer')
      })
    })
  })
})
