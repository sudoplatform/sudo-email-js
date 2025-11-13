/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  anything,
  capture,
  instance,
  mock,
  reset,
  when,
  verify,
} from 'ts-mockito'
import { DateTime } from 'luxon'
import { ApiClient } from '../../../../../src/private/data/common/apiClient'
import { DeviceKeyWorker } from '../../../../../src/private/data/common/deviceKeyWorker'
import { DefaultEmailMaskService } from '../../../../../src/private/data/mask/defaultEmailMaskService'
import { GraphQLDataFactory } from '../../../data-factory/graphQL'
import { EntityDataFactory } from '../../../data-factory/entity'
import {
  ProvisionEmailMaskInput,
  UpdateEmailMaskInput,
  DeprovisionEmailMaskInput,
  EnableEmailMaskInput,
  DisableEmailMaskInput,
  ListEmailMasksForOwnerInput,
} from '../../../../../src/private/domain/entities/mask/emailMaskService'
import {
  ProvisionEmailMaskInput as ProvisionEmailMaskRequest,
  UpdateEmailMaskInput as UpdateEmailMaskRequest,
  ListEmailMasksForOwnerInput as ListEmailMasksForOwnerRequest,
  EmailMaskStatus,
  EmailMaskRealAddressType,
} from '../../../../../src/gen/graphqlTypes'
import {
  EmailMaskEntityRealAddressType,
  EmailMaskEntityStatus,
} from '../../../../../src/private/domain/entities/mask/emailMaskEntity'
import {
  KeyNotFoundError,
  EncryptionAlgorithm,
} from '@sudoplatform/sudo-common'
import { secondsSinceEpoch } from '../../../../../src/private/util/date'

describe('DefaultEmailMaskService Test Suite', () => {
  const generatedPKDeviceKey = EntityDataFactory.deviceKey
  const userPKDeviceKey = {
    ...EntityDataFactory.deviceKey,
    data: 'dummyUserPublicKey',
  }
  const mockAppSync = mock<ApiClient>()
  const mockDeviceKeyWorker = mock<DeviceKeyWorker>()
  let instanceUnderTest: DefaultEmailMaskService

  beforeEach(() => {
    reset(mockAppSync)
    reset(mockDeviceKeyWorker)
    instanceUnderTest = new DefaultEmailMaskService(
      instance(mockAppSync),
      instance(mockDeviceKeyWorker),
    )

    when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
      true,
    )
    when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(
      JSON.stringify({ test: 'test data' }),
    )
  })

  describe('provisionEmailMask', () => {
    const input: ProvisionEmailMaskInput = {
      maskAddress: 'test-mask@anonyome.com',
      realAddress: 'test-real@anonyome.com',
      ownershipProofToken: 'testToken',
    }

    beforeEach(() => {
      when(mockDeviceKeyWorker.generateKeyPair()).thenResolve(
        generatedPKDeviceKey,
      )
      when(mockDeviceKeyWorker.getSingletonKeyPair()).thenResolve(
        userPKDeviceKey,
      )
      when(mockAppSync.provisionEmailMask(anything())).thenResolve(
        GraphQLDataFactory.emailMask,
      )
    })

    it('calls appSync correctly with default arguments', async () => {
      await instanceUnderTest.provisionEmailMask(input)

      verify(mockAppSync.provisionEmailMask(anything())).once()
      const [inputArgs] = capture(mockAppSync.provisionEmailMask).first()
      expect(inputArgs).toStrictEqual<ProvisionEmailMaskRequest>({
        maskAddress: input.maskAddress,
        realAddress: input.realAddress,
        ownershipProofTokens: [input.ownershipProofToken],
        key: GraphQLDataFactory.provisionKeyInput,
      })
    })

    it('calls appSync correctly with metadata', async () => {
      const metadata = { test: 'test data' }
      const inputWithMetadata: ProvisionEmailMaskInput = {
        ...input,
        metadata: metadata,
      }

      when(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).thenResolve('keyId')
      when(mockDeviceKeyWorker.sealString(anything())).thenResolve('sealedData')

      await instanceUnderTest.provisionEmailMask(inputWithMetadata)

      verify(mockAppSync.provisionEmailMask(anything())).once()
      verify(mockDeviceKeyWorker.sealString(anything())).once()
      const [inputArgs] = capture(mockAppSync.provisionEmailMask).first()
      expect(inputArgs).toStrictEqual<ProvisionEmailMaskRequest>({
        maskAddress: inputWithMetadata.maskAddress,
        realAddress: inputWithMetadata.realAddress,
        ownershipProofTokens: [inputWithMetadata.ownershipProofToken],
        metadata: {
          keyId: 'keyId',
          base64EncodedSealedData: 'sealedData',
          plainTextType: 'json-string',
          algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding,
        },
        key: GraphQLDataFactory.provisionKeyInput,
      })
    })

    it('calls appSync correctly with expiresAt', async () => {
      const expiresAt = DateTime.now().plus({ days: 1 }).toJSDate()
      const inputWithExpiresAt: ProvisionEmailMaskInput = {
        ...input,
        expiresAt,
      }

      await instanceUnderTest.provisionEmailMask(inputWithExpiresAt)

      verify(mockAppSync.provisionEmailMask(anything())).once()
      const [inputArgs] = capture(mockAppSync.provisionEmailMask).first()
      expect(inputArgs).toStrictEqual<ProvisionEmailMaskRequest>({
        maskAddress: inputWithExpiresAt.maskAddress,
        realAddress: inputWithExpiresAt.realAddress,
        ownershipProofTokens: [inputWithExpiresAt.ownershipProofToken],
        expiresAtEpochSec: secondsSinceEpoch(expiresAt),
        key: GraphQLDataFactory.provisionKeyInput,
      })
    })

    it('calls appSync correctly with metadata and expiresAt', async () => {
      const metadata = { test: 'test data' }
      const expiresAt = DateTime.now().plus({ days: 1 }).toJSDate()
      const inputWithMetadataAndExpiresAt: ProvisionEmailMaskInput = {
        ...input,
        metadata: metadata,
        expiresAt,
      }

      when(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).thenResolve('keyId')
      when(mockDeviceKeyWorker.sealString(anything())).thenResolve('sealedData')

      await instanceUnderTest.provisionEmailMask(inputWithMetadataAndExpiresAt)

      verify(mockAppSync.provisionEmailMask(anything())).once()
      verify(mockDeviceKeyWorker.sealString(anything())).once()
      const [inputArgs] = capture(mockAppSync.provisionEmailMask).first()
      expect(inputArgs).toStrictEqual<ProvisionEmailMaskRequest>({
        maskAddress: inputWithMetadataAndExpiresAt.maskAddress,
        realAddress: inputWithMetadataAndExpiresAt.realAddress,
        ownershipProofTokens: [
          inputWithMetadataAndExpiresAt.ownershipProofToken,
        ],
        metadata: {
          keyId: 'keyId',
          base64EncodedSealedData: 'sealedData',
          plainTextType: 'json-string',
          algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding,
        },
        expiresAtEpochSec: secondsSinceEpoch(expiresAt),
        key: GraphQLDataFactory.provisionKeyInput,
      })
    })

    it('returns correct entity', async () => {
      const result = await instanceUnderTest.provisionEmailMask(input)

      expect(result).toStrictEqual(EntityDataFactory.emailMask)
    })

    it('generates a symmetric key if one does not exist', async () => {
      const metadata = { test: 'test data' }
      const inputWithMetadata: ProvisionEmailMaskInput = {
        ...input,
        metadata: metadata,
      }
      when(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).thenResolve(
        undefined,
      )
      when(mockDeviceKeyWorker.generateCurrentSymmetricKey()).thenResolve(
        'keyId',
      )

      await instanceUnderTest.provisionEmailMask(inputWithMetadata)

      verify(mockDeviceKeyWorker.generateCurrentSymmetricKey()).once()
    })

    it('generates Public Key when on provision', async () => {
      const result = await instanceUnderTest.provisionEmailMask(input)

      expect(result).toStrictEqual(EntityDataFactory.emailMask)

      verify(mockDeviceKeyWorker.generateKeyPair()).once()
      verify(mockDeviceKeyWorker.getSingletonKeyPair()).never()
    })

    it('gets singleton Public Key from keychain when enforced', async () => {
      const instanceUnderTest = new DefaultEmailMaskService(
        instance(mockAppSync),
        instance(mockDeviceKeyWorker),
        { enforceSingletonPublicKey: true },
      )
      const result = await instanceUnderTest.provisionEmailMask(input)

      expect(result).toStrictEqual(EntityDataFactory.emailMask)

      verify(mockDeviceKeyWorker.generateKeyPair()).never()
      verify(mockDeviceKeyWorker.getSingletonKeyPair()).once()
    })
  })

  describe('deprovisionEmailMask', () => {
    const input: DeprovisionEmailMaskInput = {
      emailMaskId: 'testId',
    }

    beforeEach(() => {
      when(mockAppSync.deprovisionEmailMask(anything())).thenResolve(
        GraphQLDataFactory.emailMask,
      )
    })

    it('calls appSync correctly', async () => {
      await instanceUnderTest.deprovisionEmailMask(input)

      verify(mockAppSync.deprovisionEmailMask(anything())).once()
      const [inputArgs] = capture(mockAppSync.deprovisionEmailMask).first()
      expect(inputArgs).toStrictEqual(input)
    })

    it('returns correct entity', async () => {
      const result = await instanceUnderTest.deprovisionEmailMask(input)

      expect(result).toStrictEqual(EntityDataFactory.emailMask)
    })
  })

  describe('updateEmailMask', () => {
    beforeEach(() => {
      when(mockAppSync.updateEmailMask(anything())).thenResolve(
        GraphQLDataFactory.emailMask,
      )
    })

    it('calls appSync correctly with no updates', async () => {
      const input: UpdateEmailMaskInput = {
        emailMaskId: 'testId',
      }

      await instanceUnderTest.updateEmailMask(input)

      verify(mockAppSync.updateEmailMask(anything())).once()
      const [inputArgs] = capture(mockAppSync.updateEmailMask).first()
      expect(inputArgs).toStrictEqual<UpdateEmailMaskRequest>({
        id: input.emailMaskId,
      })
    })

    it('calls appSync correctly with metadata update', async () => {
      const metadata = { test: 'updated data' }
      const input: UpdateEmailMaskInput = {
        emailMaskId: 'testId',
        metadata: metadata,
      }

      when(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).thenResolve('keyId')
      when(mockDeviceKeyWorker.sealString(anything())).thenResolve('sealedData')

      await instanceUnderTest.updateEmailMask(input)

      verify(mockAppSync.updateEmailMask(anything())).once()
      verify(mockDeviceKeyWorker.sealString(anything())).once()
      const [inputArgs] = capture(mockAppSync.updateEmailMask).first()
      expect(inputArgs).toStrictEqual<UpdateEmailMaskRequest>({
        id: input.emailMaskId,
        metadata: {
          keyId: 'keyId',
          base64EncodedSealedData: 'sealedData',
          plainTextType: 'json-string',
          algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding,
        },
      })
    })

    it('calls appSync correctly with null metadata to clear', async () => {
      const input: UpdateEmailMaskInput = {
        emailMaskId: 'testId',
        metadata: null,
      }

      await instanceUnderTest.updateEmailMask(input)

      verify(mockAppSync.updateEmailMask(anything())).once()
      const [inputArgs] = capture(mockAppSync.updateEmailMask).first()
      expect(inputArgs).toStrictEqual<UpdateEmailMaskRequest>({
        id: input.emailMaskId,
        metadata: null,
      })
    })

    it('calls appSync correctly with expiresAt update', async () => {
      const expiresAt = DateTime.now().plus({ days: 1 }).toJSDate()
      const input: UpdateEmailMaskInput = {
        emailMaskId: 'testId',
        expiresAt,
      }

      await instanceUnderTest.updateEmailMask(input)

      verify(mockAppSync.updateEmailMask(anything())).once()
      const [inputArgs] = capture(mockAppSync.updateEmailMask).first()
      expect(inputArgs).toStrictEqual<UpdateEmailMaskRequest>({
        id: input.emailMaskId,
        expiresAtEpochSec: secondsSinceEpoch(expiresAt),
      })
    })

    it('calls appSync correctly with null expiresAt to clear', async () => {
      const input: UpdateEmailMaskInput = {
        emailMaskId: 'testId',
        expiresAt: null,
      }

      await instanceUnderTest.updateEmailMask(input)

      verify(mockAppSync.updateEmailMask(anything())).once()
      const [inputArgs] = capture(mockAppSync.updateEmailMask).first()
      expect(inputArgs).toStrictEqual<UpdateEmailMaskRequest>({
        id: input.emailMaskId,
        expiresAtEpochSec: null,
      })
    })

    it('calls appSync correctly with both metadata and expiresAt updates', async () => {
      const metadata = { test: 'updated data' }
      const expiresAt = DateTime.now().plus({ days: 1 }).toJSDate()
      const input: UpdateEmailMaskInput = {
        emailMaskId: 'testId',
        metadata: metadata,
        expiresAt,
      }

      when(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).thenResolve('keyId')
      when(mockDeviceKeyWorker.sealString(anything())).thenResolve('sealedData')

      await instanceUnderTest.updateEmailMask(input)

      verify(mockAppSync.updateEmailMask(anything())).once()
      verify(mockDeviceKeyWorker.sealString(anything())).once()
      const [inputArgs] = capture(mockAppSync.updateEmailMask).first()
      expect(inputArgs).toStrictEqual<UpdateEmailMaskRequest>({
        id: input.emailMaskId,
        metadata: {
          keyId: 'keyId',
          base64EncodedSealedData: 'sealedData',
          plainTextType: 'json-string',
          algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding,
        },
        expiresAtEpochSec: secondsSinceEpoch(expiresAt),
      })
    })

    it('returns correct entity', async () => {
      const input: UpdateEmailMaskInput = {
        emailMaskId: 'testId',
      }

      const result = await instanceUnderTest.updateEmailMask(input)

      expect(result).toStrictEqual(EntityDataFactory.emailMask)
    })

    it('generates a symmetric key if one does not exist', async () => {
      when(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).thenResolve(
        undefined,
      )
      when(mockDeviceKeyWorker.generateCurrentSymmetricKey()).thenResolve(
        'keyId',
      )
      const metadata = { test: 'test data' }
      const input: UpdateEmailMaskInput = {
        emailMaskId: 'testId',
        metadata: metadata as any,
      }

      await instanceUnderTest.updateEmailMask(input)

      verify(mockDeviceKeyWorker.generateCurrentSymmetricKey()).once()
    })
  })

  describe('enableEmailMask', () => {
    const input: EnableEmailMaskInput = {
      emailMaskId: 'testId',
    }

    beforeEach(() => {
      when(mockAppSync.enableEmailMask(anything())).thenResolve(
        GraphQLDataFactory.emailMask,
      )
      when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
        true,
      )
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(
        JSON.stringify({ test: 'test data' }),
      )
    })

    it('calls appSync correctly', async () => {
      await instanceUnderTest.enableEmailMask(input)

      verify(mockAppSync.enableEmailMask(anything())).once()
      const [inputArgs] = capture(mockAppSync.enableEmailMask).first()
      expect(inputArgs).toStrictEqual(input)
    })

    it('returns correct entity', async () => {
      const result = await instanceUnderTest.enableEmailMask(input)

      expect(result).toStrictEqual(EntityDataFactory.emailMask)
    })
  })

  describe('disableEmailMask', () => {
    const input: DisableEmailMaskInput = {
      emailMaskId: 'testId',
    }

    beforeEach(() => {
      when(mockAppSync.disableEmailMask(anything())).thenResolve(
        GraphQLDataFactory.emailMask,
      )
      when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
        true,
      )
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(
        JSON.stringify({ test: 'test data' }),
      )
    })

    it('calls appSync correctly', async () => {
      await instanceUnderTest.disableEmailMask(input)

      verify(mockAppSync.disableEmailMask(anything())).once()
      const [inputArgs] = capture(mockAppSync.disableEmailMask).first()
      expect(inputArgs).toStrictEqual(input)
    })

    it('returns correct entity', async () => {
      const result = await instanceUnderTest.disableEmailMask(input)

      expect(result).toStrictEqual(EntityDataFactory.emailMask)
    })
  })

  describe('listEmailMasksForOwner', () => {
    beforeEach(() => {
      when(mockAppSync.listEmailMasksForOwner(anything())).thenResolve(
        GraphQLDataFactory.emailMaskConnection,
      )
      when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
        true,
      )
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(
        JSON.stringify({ test: 'test data' }),
      )
    })

    it('calls appSync correctly with no input', async () => {
      await instanceUnderTest.listEmailMasksForOwner()

      verify(mockAppSync.listEmailMasksForOwner(anything())).once()
      const [inputArgs] = capture(mockAppSync.listEmailMasksForOwner).first()
      expect(inputArgs).toStrictEqual<ListEmailMasksForOwnerRequest>({
        limit: 10,
      })
    })

    it('calls appSync correctly with limit', async () => {
      const input: ListEmailMasksForOwnerInput = {
        limit: 20,
      }

      await instanceUnderTest.listEmailMasksForOwner(input)

      verify(mockAppSync.listEmailMasksForOwner(anything())).once()
      const [inputArgs] = capture(mockAppSync.listEmailMasksForOwner).first()
      expect(inputArgs).toStrictEqual<ListEmailMasksForOwnerRequest>({
        limit: 20,
      })
    })

    it('calls appSync correctly with nextToken', async () => {
      const input: ListEmailMasksForOwnerInput = {
        nextToken: 'testToken',
      }

      await instanceUnderTest.listEmailMasksForOwner(input)

      verify(mockAppSync.listEmailMasksForOwner(anything())).once()
      const [inputArgs] = capture(mockAppSync.listEmailMasksForOwner).first()
      expect(inputArgs).toStrictEqual<ListEmailMasksForOwnerRequest>({
        limit: 10,
        nextToken: 'testToken',
      })
    })

    it('calls appSync correctly with status filter', async () => {
      const input: ListEmailMasksForOwnerInput = {
        filter: {
          status: {
            equal: EmailMaskEntityStatus.ENABLED,
          },
        },
      }

      await instanceUnderTest.listEmailMasksForOwner(input)

      verify(mockAppSync.listEmailMasksForOwner(anything())).once()
      const [inputArgs] = capture(mockAppSync.listEmailMasksForOwner).first()
      expect(inputArgs.filter).toBeDefined()
      expect(inputArgs.filter?.status?.eq).toBe(EmailMaskStatus.Enabled)
    })

    it('calls appSync correctly with realAddressType filter', async () => {
      const input: ListEmailMasksForOwnerInput = {
        filter: {
          realAddressType: {
            equal: EmailMaskEntityRealAddressType.INTERNAL,
          },
        },
      }

      await instanceUnderTest.listEmailMasksForOwner(input)

      verify(mockAppSync.listEmailMasksForOwner(anything())).once()
      const [inputArgs] = capture(mockAppSync.listEmailMasksForOwner).first()
      expect(inputArgs.filter).toBeDefined()
      expect(inputArgs.filter?.realAddressType?.eq).toBe(
        EmailMaskRealAddressType.Internal,
      )
    })

    it('calls appSync correctly with limit, nextToken and both filters', async () => {
      const input: ListEmailMasksForOwnerInput = {
        limit: 20,
        nextToken: 'testToken',
        filter: {
          status: {
            notOneOf: [
              EmailMaskEntityStatus.DISABLED,
              EmailMaskEntityStatus.LOCKED,
            ],
          },
          realAddressType: {
            oneOf: [EmailMaskEntityRealAddressType.INTERNAL],
          },
        },
      }

      await instanceUnderTest.listEmailMasksForOwner(input)

      verify(mockAppSync.listEmailMasksForOwner(anything())).once()
      const [inputArgs] = capture(mockAppSync.listEmailMasksForOwner).first()
      expect(inputArgs).toStrictEqual<ListEmailMasksForOwnerRequest>({
        limit: 20,
        nextToken: 'testToken',
        filter: {
          status: {
            notIn: [EmailMaskStatus.Disabled, EmailMaskStatus.Locked],
          },
          realAddressType: {
            in: [EmailMaskRealAddressType.Internal],
          },
        },
      })
    })

    it('returns correct output with items', async () => {
      const result = await instanceUnderTest.listEmailMasksForOwner()

      expect(result).toStrictEqual({
        emailMasks: [EntityDataFactory.emailMask],
        nextToken: undefined,
      })
    })

    it('returns correct output with nextToken', async () => {
      when(mockAppSync.listEmailMasksForOwner(anything())).thenResolve({
        items: [GraphQLDataFactory.emailMask],
        nextToken: 'testNextToken',
      })

      const result = await instanceUnderTest.listEmailMasksForOwner()

      expect(result).toStrictEqual({
        emailMasks: [EntityDataFactory.emailMask],
        nextToken: 'testNextToken',
      })
    })

    it('returns empty array when no items', async () => {
      when(mockAppSync.listEmailMasksForOwner(anything())).thenResolve({
        items: [],
        nextToken: undefined,
      })

      const result = await instanceUnderTest.listEmailMasksForOwner()

      expect(result).toStrictEqual({
        emailMasks: [],
        nextToken: undefined,
      })
    })

    it('returns empty array when items is undefined', async () => {
      when(mockAppSync.listEmailMasksForOwner(anything())).thenResolve({
        nextToken: undefined,
      } as any)

      const result = await instanceUnderTest.listEmailMasksForOwner()

      expect(result).toStrictEqual({
        emailMasks: [],
        nextToken: undefined,
      })
    })
  })
})
