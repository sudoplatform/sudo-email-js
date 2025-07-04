/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CachePolicy,
  DecodeError,
  EncryptionAlgorithm,
  KeyNotFoundError,
} from '@sudoplatform/sudo-common'
import {
  anything,
  capture,
  instance,
  mock,
  reset,
  verify,
  when,
} from 'ts-mockito'
import { v4 } from 'uuid'
import { ApiClient } from '../../../../../src/private/data/common/apiClient'
import { DefaultEmailFolderService } from '../../../../../src/private/data/folder/defaultEmailFolderService'
import { EntityDataFactory } from '../../../data-factory/entity'
import { GraphQLDataFactory } from '../../../data-factory/graphQL'
import { DeviceKeyWorker } from '../../../../../src/private/data/common/deviceKeyWorker'

describe('DefaultEmailFolderService Test Suite', () => {
  const mockAppSync = mock<ApiClient>()
  const mockDeviceKeyWorker = mock<DeviceKeyWorker>()
  let instanceUnderTest: DefaultEmailFolderService

  beforeEach(() => {
    reset(mockAppSync)
    reset(mockDeviceKeyWorker)
    instanceUnderTest = new DefaultEmailFolderService(
      instance(mockAppSync),
      instance(mockDeviceKeyWorker),
    )
    when(
      mockAppSync.listEmailFoldersForEmailAddressId(
        anything(),
        anything(),
        anything(),
        anything(),
      ),
    ).thenResolve(GraphQLDataFactory.emailFolderConnection)

    when(mockAppSync.createCustomEmailFolder(anything())).thenResolve(
      GraphQLDataFactory.emailFolderWithCustomFolderName,
    )
  })

  describe('listEmailFoldersForEmailAddressId', () => {
    it('calls appSync correctly', async () => {
      const emailAddressId = v4()
      await instanceUnderTest.listEmailFoldersForEmailAddressId({
        emailAddressId,
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(
        mockAppSync.listEmailFoldersForEmailAddressId(
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).once()
      const [inputArgs, policyArg] = capture(
        mockAppSync.listEmailFoldersForEmailAddressId,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>(emailAddressId)
      expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
    })

    it.each`
      cachePolicy               | test
      ${CachePolicy.CacheOnly}  | ${'cache'}
      ${CachePolicy.RemoteOnly} | ${'remote'}
    `(
      'returns transformed result when calling $test',
      async ({ cachePolicy }) => {
        const emailAddressId = v4()
        await expect(
          instanceUnderTest.listEmailFoldersForEmailAddressId({
            emailAddressId,
            cachePolicy,
          }),
        ).resolves.toStrictEqual({
          folders: [EntityDataFactory.emailFolder],
          nextToken: undefined,
        })
        verify(
          mockAppSync.listEmailFoldersForEmailAddressId(
            anything(),
            anything(),
            anything(),
            anything(),
          ),
        ).once()
      },
    )
  })

  describe('createCustomEmailFolderForEmailAddressId', () => {
    it('calls appSync correctly', async () => {
      when(mockAppSync.createCustomEmailFolder(anything())).thenResolve(
        GraphQLDataFactory.emailFolderWithCustomFolderName,
      )

      when(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).thenResolve('keyId')
      when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
        true,
      )
      when(mockDeviceKeyWorker.sealString(anything())).thenResolve(
        'TxsJ3delkBH2I1t0qQDscg==',
      )
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve('CUSTOM')

      const result =
        await instanceUnderTest.createCustomEmailFolderForEmailAddressId({
          emailAddressId: 'testEmailAddressId',
          customFolderName: 'CUSTOM',
        })

      expect(result).toStrictEqual({
        ...EntityDataFactory.emailFolderWithCustomEmailFolderName,
      })

      verify(mockAppSync.createCustomEmailFolder(anything())).once()
      const [inputArgs] = capture(mockAppSync.createCustomEmailFolder).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId: EntityDataFactory.emailFolder.emailAddressId,
        customFolderName: {
          algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding,
          keyId: 'keyId',
          plainTextType: 'string',
          base64EncodedSealedData: 'TxsJ3delkBH2I1t0qQDscg==',
        },
      })
    })
    it('failed result with KeyNotFoundError if symmetric key does not exist and allowSymmeticKeyGeneration false', async () => {
      when(mockAppSync.createCustomEmailFolder(anything())).thenResolve(
        GraphQLDataFactory.emailFolderWithCustomFolderName,
      )

      when(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).thenResolve(
        undefined,
      )
      when(mockDeviceKeyWorker.generateCurrentSymmetricKey()).thenResolve(
        'keyId',
      )
      when(mockDeviceKeyWorker.sealString(anything())).thenResolve(
        'TxsJ3delkBH2I1t0qQDscg==',
      )

      await expect(
        instanceUnderTest.createCustomEmailFolderForEmailAddressId({
          emailAddressId: EntityDataFactory.emailFolder.emailAddressId,
          customFolderName: 'CUSTOM',
          allowSymmetricKeyGeneration: false,
        }),
      ).rejects.toThrow(new KeyNotFoundError())

      verify(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).once()
      verify(mockDeviceKeyWorker.generateCurrentSymmetricKey()).never()
      verify(mockAppSync.createCustomEmailFolder(anything())).never()
    })

    it('succeeds and generates new key if no key id found', async () => {
      when(mockAppSync.createCustomEmailFolder(anything())).thenResolve(
        GraphQLDataFactory.emailFolderWithCustomFolderName,
      )

      when(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).thenResolve(
        undefined,
      )
      when(mockDeviceKeyWorker.generateCurrentSymmetricKey()).thenResolve(
        'keyId',
      )
      when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
        false,
      )
      when(mockDeviceKeyWorker.sealString(anything())).thenResolve(
        'TxsJ3delkBH2I1t0qQDscg==',
      )

      const result =
        await instanceUnderTest.createCustomEmailFolderForEmailAddressId({
          emailAddressId: EntityDataFactory.emailFolder.emailAddressId,
          customFolderName: 'CUSTOM',
        })

      expect(result).toStrictEqual({
        ...EntityDataFactory.emailFolder,
        status: { type: 'Failed', cause: new KeyNotFoundError() },
      })

      verify(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).once()
      verify(mockDeviceKeyWorker.generateCurrentSymmetricKey()).once()
      verify(mockAppSync.createCustomEmailFolder(anything())).once()

      const [inputArgs] = capture(mockAppSync.createCustomEmailFolder).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId: EntityDataFactory.emailFolder.emailAddressId,
        customFolderName: {
          algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding,
          keyId: 'keyId',
          plainTextType: 'string',
          base64EncodedSealedData: 'TxsJ3delkBH2I1t0qQDscg==',
        },
      })
    })

    it('decoding error should be tolerated and return empty value for customFolderName ', async () => {
      when(mockAppSync.createCustomEmailFolder(anything())).thenResolve(
        GraphQLDataFactory.emailFolderWithCustomFolderName,
      )
      when(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).thenResolve('keyId')
      when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
        true,
      )
      when(mockDeviceKeyWorker.sealString(anything())).thenResolve(
        'TxsJ3delkBH2I1t0qQDscg==',
      )
      when(mockDeviceKeyWorker.unsealString(anything())).thenReject(
        new DecodeError('Error decoding custom folder name'),
      )

      const result =
        await instanceUnderTest.createCustomEmailFolderForEmailAddressId({
          emailAddressId: EntityDataFactory.emailFolder.emailAddressId,
          customFolderName: 'CUSTOM',
        })

      expect(result).toStrictEqual({
        ...EntityDataFactory.emailFolder,
        customFolderName: '',
      })

      const [inputArgs] = capture(mockAppSync.createCustomEmailFolder).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId: EntityDataFactory.emailFolder.emailAddressId,
        customFolderName: {
          algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding,
          keyId: 'keyId',
          plainTextType: 'string',
          base64EncodedSealedData: 'TxsJ3delkBH2I1t0qQDscg==',
        },
      })

      verify(mockAppSync.createCustomEmailFolder(anything())).once()
      verify(mockDeviceKeyWorker.unsealString(anything())).once()
    })
  })

  describe('deleteCustomEmailFolderForEmailAddressId', () => {
    it('calls appSync correctly', async () => {
      when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
        true,
      )
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve('CUSTOM')
      when(mockAppSync.deleteCustomEmailFolder(anything())).thenResolve(
        GraphQLDataFactory.emailFolderWithCustomFolderName,
      )

      const result =
        await instanceUnderTest.deleteCustomEmailFolderForEmailAddressId({
          emailFolderId:
            EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
          emailAddressId:
            EntityDataFactory.emailFolderWithCustomEmailFolderName
              .emailAddressId,
        })

      expect(result).toStrictEqual({
        ...EntityDataFactory.emailFolderWithCustomEmailFolderName,
      })

      verify(mockAppSync.deleteCustomEmailFolder(anything())).once()
      const [inputArgs] = capture(mockAppSync.deleteCustomEmailFolder).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.emailAddressId,
        emailFolderId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
      })
    })

    it('accepts and returns undefined from appSync', async () => {
      when(mockAppSync.deleteCustomEmailFolder(anything())).thenResolve(
        undefined,
      )

      const result =
        await instanceUnderTest.deleteCustomEmailFolderForEmailAddressId({
          emailFolderId:
            EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
          emailAddressId:
            EntityDataFactory.emailFolderWithCustomEmailFolderName
              .emailAddressId,
        })

      expect(result).toStrictEqual(undefined)

      verify(mockAppSync.deleteCustomEmailFolder(anything())).once()
      const [inputArgs] = capture(mockAppSync.deleteCustomEmailFolder).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.emailAddressId,
        emailFolderId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
      })
    })
  })

  describe('updateCustomEmailFolderForEmailAddressId', () => {
    it('calls appSync correctly', async () => {
      when(mockAppSync.updateCustomEmailFolder(anything())).thenResolve(
        GraphQLDataFactory.emailFolderWithCustomFolderName,
      )

      when(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).thenResolve('keyId')
      when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
        true,
      )
      when(mockDeviceKeyWorker.sealString(anything())).thenResolve(
        'TxsJ3delkBH2I1t0qQDscg==',
      )
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve('CUSTOM')

      const result =
        await instanceUnderTest.updateCustomEmailFolderForEmailAddressId({
          emailAddressId:
            EntityDataFactory.emailFolderWithCustomEmailFolderName
              .emailAddressId,
          emailFolderId:
            EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
          values: { customFolderName: 'CUSTOM-UPDATED' },
        })

      expect(result).toStrictEqual({
        ...EntityDataFactory.emailFolderWithCustomEmailFolderName,
      })

      verify(mockAppSync.updateCustomEmailFolder(anything())).once()
      const [inputArgs] = capture(mockAppSync.updateCustomEmailFolder).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId: EntityDataFactory.emailFolder.emailAddressId,
        emailFolderId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
        values: {
          customFolderName: {
            algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding,
            keyId: 'keyId',
            plainTextType: 'string',
            base64EncodedSealedData: 'TxsJ3delkBH2I1t0qQDscg==',
          },
        },
      })
    })

    it('failed result with KeyNotFoundError if symmetric key does not exist and allowSymmeticKeyGeneration false', async () => {
      when(mockAppSync.updateCustomEmailFolder(anything())).thenResolve(
        GraphQLDataFactory.emailFolderWithCustomFolderName,
      )

      when(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).thenResolve(
        undefined,
      )
      when(mockDeviceKeyWorker.generateCurrentSymmetricKey()).thenResolve(
        'keyId',
      )
      when(mockDeviceKeyWorker.sealString(anything())).thenResolve(
        'TxsJ3delkBH2I1t0qQDscg==',
      )

      await expect(
        instanceUnderTest.updateCustomEmailFolderForEmailAddressId({
          emailAddressId:
            EntityDataFactory.emailFolderWithCustomEmailFolderName
              .emailAddressId,
          emailFolderId:
            EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
          values: { customFolderName: 'CUSTOM-UPDATED' },
          allowSymmetricKeyGeneration: false,
        }),
      ).rejects.toThrow(new KeyNotFoundError())

      verify(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).once()
      verify(mockDeviceKeyWorker.generateCurrentSymmetricKey()).never()
      verify(mockAppSync.createCustomEmailFolder(anything())).never()
    })

    it('succeeds and generates new key if no key id found', async () => {
      when(mockAppSync.updateCustomEmailFolder(anything())).thenResolve(
        GraphQLDataFactory.emailFolderWithCustomFolderName,
      )

      when(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).thenResolve(
        undefined,
      )
      when(mockDeviceKeyWorker.generateCurrentSymmetricKey()).thenResolve(
        'keyId',
      )
      when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
        false,
      )
      when(mockDeviceKeyWorker.sealString(anything())).thenResolve(
        'TxsJ3delkBH2I1t0qQDscg==',
      )

      const result =
        await instanceUnderTest.updateCustomEmailFolderForEmailAddressId({
          emailAddressId:
            EntityDataFactory.emailFolderWithCustomEmailFolderName
              .emailAddressId,
          emailFolderId:
            EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
          values: { customFolderName: 'CUSTOM-UPDATED' },
        })

      expect(result).toStrictEqual({
        ...EntityDataFactory.emailFolder,
        status: { type: 'Failed', cause: new KeyNotFoundError() },
      })

      verify(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).once()
      verify(mockDeviceKeyWorker.generateCurrentSymmetricKey()).once()
      verify(mockAppSync.updateCustomEmailFolder(anything())).once()

      const [inputArgs] = capture(mockAppSync.updateCustomEmailFolder).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId: EntityDataFactory.emailFolder.emailAddressId,
        emailFolderId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
        values: {
          customFolderName: {
            algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding,
            keyId: 'keyId',
            plainTextType: 'string',
            base64EncodedSealedData: 'TxsJ3delkBH2I1t0qQDscg==',
          },
        },
      })
    })

    it('decoding error should be tolerated and return empty value for customFolderName ', async () => {
      when(mockAppSync.updateCustomEmailFolder(anything())).thenResolve(
        GraphQLDataFactory.emailFolderWithCustomFolderName,
      )
      when(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).thenResolve('keyId')
      when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
        true,
      )
      when(mockDeviceKeyWorker.sealString(anything())).thenResolve(
        'TxsJ3delkBH2I1t0qQDscg==',
      )
      when(mockDeviceKeyWorker.unsealString(anything())).thenReject(
        new DecodeError('Error decoding custom folder name'),
      )

      const result =
        await instanceUnderTest.updateCustomEmailFolderForEmailAddressId({
          emailAddressId:
            EntityDataFactory.emailFolderWithCustomEmailFolderName
              .emailAddressId,
          emailFolderId:
            EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
          values: { customFolderName: 'CUSTOM-UPDATED' },
        })

      expect(result).toStrictEqual({
        ...EntityDataFactory.emailFolder,
        customFolderName: '',
      })

      const [inputArgs] = capture(mockAppSync.updateCustomEmailFolder).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId: EntityDataFactory.emailFolder.emailAddressId,
        emailFolderId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
        values: {
          customFolderName: {
            algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding,
            keyId: 'keyId',
            plainTextType: 'string',
            base64EncodedSealedData: 'TxsJ3delkBH2I1t0qQDscg==',
          },
        },
      })

      verify(mockAppSync.updateCustomEmailFolder(anything())).once()
      verify(mockDeviceKeyWorker.unsealString(anything())).once()
    })
  })

  describe('deleteMessagesByFolderId', () => {
    it('calls appSync correctly', async () => {
      when(mockAppSync.deleteMessagesByFolderId(anything())).thenResolve(
        GraphQLDataFactory.emailFolder.id,
      )

      const result = await instanceUnderTest.deleteMessagesByFolderId({
        emailAddressId: EntityDataFactory.emailFolder.emailAddressId,
        emailFolderId: EntityDataFactory.emailFolder.id,
      })

      expect(result).toEqual(GraphQLDataFactory.emailFolder.id)

      verify(mockAppSync.deleteMessagesByFolderId(anything())).once()
      const [inputArgs] = capture(mockAppSync.deleteMessagesByFolderId).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId: EntityDataFactory.emailFolder.emailAddressId,
        folderId: EntityDataFactory.emailFolder.id,
        hardDelete: undefined,
      })
    })

    it('passes hardDelete parameter properly', async () => {
      when(mockAppSync.deleteMessagesByFolderId(anything())).thenResolve(
        GraphQLDataFactory.emailFolder.id,
      )

      const result = await instanceUnderTest.deleteMessagesByFolderId({
        emailAddressId: EntityDataFactory.emailFolder.emailAddressId,
        emailFolderId: EntityDataFactory.emailFolder.id,
        hardDelete: false,
      })

      expect(result).toEqual(GraphQLDataFactory.emailFolder.id)

      verify(mockAppSync.deleteMessagesByFolderId(anything())).once()
      const [inputArgs] = capture(mockAppSync.deleteMessagesByFolderId).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId: EntityDataFactory.emailFolder.emailAddressId,
        folderId: EntityDataFactory.emailFolder.id,
        hardDelete: false,
      })
    })
  })
})
