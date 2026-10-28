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
import { DefaultEmailAliasService } from '../../../../../src/private/data/alias/defaultEmailAliasService'
import { GraphQLDataFactory } from '../../../data-factory/graphQL'
import { EntityDataFactory } from '../../../data-factory/entity'
import {
  ProvisionEmailAliasInput,
  UpdateEmailAliasInput,
  DeprovisionEmailAliasInput,
  EnableEmailAliasInput,
  DisableEmailAliasInput,
  ListEmailAliasesForOwnerInput,
} from '../../../../../src/private/domain/entities/alias/emailAliasService'
import {
  ProvisionEmailMaskInput as ProvisionEmailMaskRequest,
  UpdateEmailMaskInput as UpdateEmailMaskRequest,
  ListEmailMasksForOwnerInput as ListEmailMasksForOwnerRequest,
  EmailMaskStatus,
  EmailMaskRealAddressType,
} from '../../../../../src/gen/graphqlTypes'
import {
  EmailAliasEntityRealAddressType,
  EmailAliasEntityStatus,
} from '../../../../../src/private/domain/entities/alias/emailAliasEntity'
import {
  KeyNotFoundError,
  EncryptionAlgorithm,
} from '@sudoplatform/sudo-common'
import { secondsSinceEpoch } from '../../../../../src/private/util/date'

describe('DefaultEmailAliasService Test Suite', () => {
  const generatedPKDeviceKey = EntityDataFactory.deviceKey
  const userPKDeviceKey = {
    ...EntityDataFactory.deviceKey,
    data: 'dummyUserPublicKey',
  }
  const mockAppSync = mock<ApiClient>()
  const mockDeviceKeyWorker = mock<DeviceKeyWorker>()
  let instanceUnderTest: DefaultEmailAliasService

  beforeEach(() => {
    reset(mockAppSync)
    reset(mockDeviceKeyWorker)
    instanceUnderTest = new DefaultEmailAliasService(
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

  describe('provisionEmailAlias', () => {
    const input: ProvisionEmailAliasInput = {
      aliasAddress: 'test-alias@anonyome.com',
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
      await instanceUnderTest.provisionEmailAlias(input)

      verify(mockAppSync.provisionEmailMask(anything())).once()
      const [inputArgs] = capture(mockAppSync.provisionEmailMask).first()
      expect(inputArgs).toStrictEqual<ProvisionEmailMaskRequest>({
        maskAddress: input.aliasAddress,
        realAddress: input.realAddress,
        ownershipProofTokens: [input.ownershipProofToken],
        key: GraphQLDataFactory.provisionKeyInput,
      })
    })

    it('calls appSync correctly with metadata', async () => {
      const metadata = { test: 'test data' }
      const inputWithMetadata: ProvisionEmailAliasInput = {
        ...input,
        metadata: metadata,
      }

      when(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).thenResolve('keyId')
      when(mockDeviceKeyWorker.sealString(anything())).thenResolve('sealedData')

      await instanceUnderTest.provisionEmailAlias(inputWithMetadata)

      verify(mockAppSync.provisionEmailMask(anything())).once()
      verify(mockDeviceKeyWorker.sealString(anything())).once()
      const [inputArgs] = capture(mockAppSync.provisionEmailMask).first()
      expect(inputArgs).toStrictEqual<ProvisionEmailMaskRequest>({
        maskAddress: inputWithMetadata.aliasAddress,
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
      const inputWithExpiresAt: ProvisionEmailAliasInput = {
        ...input,
        expiresAt,
      }

      await instanceUnderTest.provisionEmailAlias(inputWithExpiresAt)

      verify(mockAppSync.provisionEmailMask(anything())).once()
      const [inputArgs] = capture(mockAppSync.provisionEmailMask).first()
      expect(inputArgs).toStrictEqual<ProvisionEmailMaskRequest>({
        maskAddress: inputWithExpiresAt.aliasAddress,
        realAddress: inputWithExpiresAt.realAddress,
        ownershipProofTokens: [inputWithExpiresAt.ownershipProofToken],
        expiresAtEpochSec: secondsSinceEpoch(expiresAt),
        key: GraphQLDataFactory.provisionKeyInput,
      })
    })

    it('calls appSync correctly with metadata and expiresAt', async () => {
      const metadata = { test: 'test data' }
      const expiresAt = DateTime.now().plus({ days: 1 }).toJSDate()
      const inputWithMetadataAndExpiresAt: ProvisionEmailAliasInput = {
        ...input,
        metadata: metadata,
        expiresAt,
      }

      when(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).thenResolve('keyId')
      when(mockDeviceKeyWorker.sealString(anything())).thenResolve('sealedData')

      await instanceUnderTest.provisionEmailAlias(inputWithMetadataAndExpiresAt)

      verify(mockAppSync.provisionEmailMask(anything())).once()
      verify(mockDeviceKeyWorker.sealString(anything())).once()
      const [inputArgs] = capture(mockAppSync.provisionEmailMask).first()
      expect(inputArgs).toStrictEqual<ProvisionEmailMaskRequest>({
        maskAddress: inputWithMetadataAndExpiresAt.aliasAddress,
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
      const result = await instanceUnderTest.provisionEmailAlias(input)

      expect(result).toStrictEqual(EntityDataFactory.emailAlias)
    })

    it('generates a symmetric key if one does not exist', async () => {
      const metadata = { test: 'test data' }
      const inputWithMetadata: ProvisionEmailAliasInput = {
        ...input,
        metadata: metadata,
      }
      when(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).thenResolve(
        undefined,
      )
      when(mockDeviceKeyWorker.generateCurrentSymmetricKey()).thenResolve(
        'keyId',
      )

      await instanceUnderTest.provisionEmailAlias(inputWithMetadata)

      verify(mockDeviceKeyWorker.generateCurrentSymmetricKey()).once()
    })

    it('generates Public Key when on provision', async () => {
      const result = await instanceUnderTest.provisionEmailAlias(input)

      expect(result).toStrictEqual(EntityDataFactory.emailAlias)

      verify(mockDeviceKeyWorker.generateKeyPair()).once()
      verify(mockDeviceKeyWorker.getSingletonKeyPair()).never()
    })

    it('gets singleton Public Key from keychain when enforced', async () => {
      const instanceUnderTest = new DefaultEmailAliasService(
        instance(mockAppSync),
        instance(mockDeviceKeyWorker),
        { enforceSingletonPublicKey: true },
      )
      const result = await instanceUnderTest.provisionEmailAlias(input)

      expect(result).toStrictEqual(EntityDataFactory.emailAlias)

      verify(mockDeviceKeyWorker.generateKeyPair()).never()
      verify(mockDeviceKeyWorker.getSingletonKeyPair()).once()
    })
  })

  describe('deprovisionEmailAlias', () => {
    const input: DeprovisionEmailAliasInput = {
      emailAliasId: 'testId',
    }

    beforeEach(() => {
      when(mockAppSync.deprovisionEmailMask(anything())).thenResolve(
        GraphQLDataFactory.emailMask,
      )
    })

    it('calls appSync correctly', async () => {
      await instanceUnderTest.deprovisionEmailAlias(input)

      verify(mockAppSync.deprovisionEmailMask(anything())).once()
      const [inputArgs] = capture(mockAppSync.deprovisionEmailMask).first()
      expect(inputArgs).toStrictEqual({ emailMaskId: input.emailAliasId })
    })

    it('returns correct entity', async () => {
      const result = await instanceUnderTest.deprovisionEmailAlias(input)

      expect(result).toStrictEqual(EntityDataFactory.emailAlias)
    })
  })

  describe('updateEmailAlias', () => {
    beforeEach(() => {
      when(mockAppSync.updateEmailMask(anything())).thenResolve(
        GraphQLDataFactory.emailMask,
      )
    })

    it('calls appSync correctly with no updates', async () => {
      const input: UpdateEmailAliasInput = {
        emailAliasId: 'testId',
      }

      await instanceUnderTest.updateEmailAlias(input)

      verify(mockAppSync.updateEmailMask(anything())).once()
      const [inputArgs] = capture(mockAppSync.updateEmailMask).first()
      expect(inputArgs).toStrictEqual<UpdateEmailMaskRequest>({
        id: input.emailAliasId,
      })
    })

    it('calls appSync correctly with metadata update', async () => {
      const metadata = { test: 'updated data' }
      const input: UpdateEmailAliasInput = {
        emailAliasId: 'testId',
        metadata: metadata,
      }

      when(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).thenResolve('keyId')
      when(mockDeviceKeyWorker.sealString(anything())).thenResolve('sealedData')

      await instanceUnderTest.updateEmailAlias(input)

      verify(mockAppSync.updateEmailMask(anything())).once()
      verify(mockDeviceKeyWorker.sealString(anything())).once()
      const [inputArgs] = capture(mockAppSync.updateEmailMask).first()
      expect(inputArgs).toStrictEqual<UpdateEmailMaskRequest>({
        id: input.emailAliasId,
        metadata: {
          keyId: 'keyId',
          base64EncodedSealedData: 'sealedData',
          plainTextType: 'json-string',
          algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding,
        },
      })
    })

    it('calls appSync correctly with null metadata to clear', async () => {
      const input: UpdateEmailAliasInput = {
        emailAliasId: 'testId',
        metadata: null,
      }

      await instanceUnderTest.updateEmailAlias(input)

      verify(mockAppSync.updateEmailMask(anything())).once()
      const [inputArgs] = capture(mockAppSync.updateEmailMask).first()
      expect(inputArgs).toStrictEqual<UpdateEmailMaskRequest>({
        id: input.emailAliasId,
        metadata: null,
      })
    })

    it('calls appSync correctly with expiresAt update', async () => {
      const expiresAt = DateTime.now().plus({ days: 1 }).toJSDate()
      const input: UpdateEmailAliasInput = {
        emailAliasId: 'testId',
        expiresAt,
      }

      await instanceUnderTest.updateEmailAlias(input)

      verify(mockAppSync.updateEmailMask(anything())).once()
      const [inputArgs] = capture(mockAppSync.updateEmailMask).first()
      expect(inputArgs).toStrictEqual<UpdateEmailMaskRequest>({
        id: input.emailAliasId,
        expiresAtEpochSec: secondsSinceEpoch(expiresAt),
      })
    })

    it('calls appSync correctly with null expiresAt to clear', async () => {
      const input: UpdateEmailAliasInput = {
        emailAliasId: 'testId',
        expiresAt: null,
      }

      await instanceUnderTest.updateEmailAlias(input)

      verify(mockAppSync.updateEmailMask(anything())).once()
      const [inputArgs] = capture(mockAppSync.updateEmailMask).first()
      expect(inputArgs).toStrictEqual<UpdateEmailMaskRequest>({
        id: input.emailAliasId,
        expiresAtEpochSec: null,
      })
    })

    it('calls appSync correctly with realAddress update', async () => {
      const realAddress = 'new@example.com'
      const input: UpdateEmailAliasInput = {
        emailAliasId: 'testId',
        realAddress,
      }

      await instanceUnderTest.updateEmailAlias(input)

      verify(mockAppSync.updateEmailMask(anything())).once()
      const [inputArgs] = capture(mockAppSync.updateEmailMask).first()
      expect(inputArgs).toStrictEqual<UpdateEmailMaskRequest>({
        id: input.emailAliasId,
        realAddress,
      })
    })

    it('calls appSync correctly with all updates', async () => {
      const realAddress = 'new@example.com'
      const metadata = { test: 'updated data' }
      const expiresAt = DateTime.now().plus({ days: 1 }).toJSDate()
      const input: UpdateEmailAliasInput = {
        emailAliasId: 'testId',
        metadata: metadata,
        expiresAt,
        realAddress,
      }

      when(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).thenResolve('keyId')
      when(mockDeviceKeyWorker.sealString(anything())).thenResolve('sealedData')

      await instanceUnderTest.updateEmailAlias(input)

      verify(mockAppSync.updateEmailMask(anything())).once()
      verify(mockDeviceKeyWorker.sealString(anything())).once()
      const [inputArgs] = capture(mockAppSync.updateEmailMask).first()
      expect(inputArgs).toStrictEqual<UpdateEmailMaskRequest>({
        id: input.emailAliasId,
        metadata: {
          keyId: 'keyId',
          base64EncodedSealedData: 'sealedData',
          plainTextType: 'json-string',
          algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding,
        },
        expiresAtEpochSec: secondsSinceEpoch(expiresAt),
        realAddress,
      })
    })

    it('returns correct entity', async () => {
      const input: UpdateEmailAliasInput = {
        emailAliasId: 'testId',
      }

      const result = await instanceUnderTest.updateEmailAlias(input)

      expect(result).toStrictEqual(EntityDataFactory.emailAlias)
    })

    it('generates a symmetric key if one does not exist', async () => {
      when(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).thenResolve(
        undefined,
      )
      when(mockDeviceKeyWorker.generateCurrentSymmetricKey()).thenResolve(
        'keyId',
      )
      const metadata = { test: 'test data' }
      const input: UpdateEmailAliasInput = {
        emailAliasId: 'testId',
        metadata: metadata as any,
      }

      await instanceUnderTest.updateEmailAlias(input)

      verify(mockDeviceKeyWorker.generateCurrentSymmetricKey()).once()
    })
  })

  describe('enableEmailAlias', () => {
    const input: EnableEmailAliasInput = {
      emailAliasId: 'testId',
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
      await instanceUnderTest.enableEmailAlias(input)

      verify(mockAppSync.enableEmailMask(anything())).once()
      const [inputArgs] = capture(mockAppSync.enableEmailMask).first()
      expect(inputArgs).toStrictEqual({ emailMaskId: input.emailAliasId })
    })

    it('returns correct entity', async () => {
      const result = await instanceUnderTest.enableEmailAlias(input)

      expect(result).toStrictEqual(EntityDataFactory.emailAlias)
    })
  })

  describe('disableEmailAlias', () => {
    const input: DisableEmailAliasInput = {
      emailAliasId: 'testId',
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
      await instanceUnderTest.disableEmailAlias(input)

      verify(mockAppSync.disableEmailMask(anything())).once()
      const [inputArgs] = capture(mockAppSync.disableEmailMask).first()
      expect(inputArgs).toStrictEqual({ emailMaskId: input.emailAliasId })
    })

    it('returns correct entity', async () => {
      const result = await instanceUnderTest.disableEmailAlias(input)

      expect(result).toStrictEqual(EntityDataFactory.emailAlias)
    })
  })

  describe('listEmailAliasesForOwner', () => {
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
      await instanceUnderTest.listEmailAliasesForOwner()

      verify(mockAppSync.listEmailMasksForOwner(anything())).once()
      const [inputArgs] = capture(mockAppSync.listEmailMasksForOwner).first()
      expect(inputArgs).toStrictEqual<ListEmailMasksForOwnerRequest>({
        limit: 10,
      })
    })

    it('calls appSync correctly with limit', async () => {
      const input: ListEmailAliasesForOwnerInput = {
        limit: 20,
      }

      await instanceUnderTest.listEmailAliasesForOwner(input)

      verify(mockAppSync.listEmailMasksForOwner(anything())).once()
      const [inputArgs] = capture(mockAppSync.listEmailMasksForOwner).first()
      expect(inputArgs).toStrictEqual<ListEmailMasksForOwnerRequest>({
        limit: 20,
      })
    })

    it('calls appSync correctly with nextToken', async () => {
      const input: ListEmailAliasesForOwnerInput = {
        nextToken: 'testToken',
      }

      await instanceUnderTest.listEmailAliasesForOwner(input)

      verify(mockAppSync.listEmailMasksForOwner(anything())).once()
      const [inputArgs] = capture(mockAppSync.listEmailMasksForOwner).first()
      expect(inputArgs).toStrictEqual<ListEmailMasksForOwnerRequest>({
        limit: 10,
        nextToken: 'testToken',
      })
    })

    it('calls appSync correctly with status filter', async () => {
      const input: ListEmailAliasesForOwnerInput = {
        filter: {
          status: {
            equal: EmailAliasEntityStatus.ENABLED,
          },
        },
      }

      await instanceUnderTest.listEmailAliasesForOwner(input)

      verify(mockAppSync.listEmailMasksForOwner(anything())).once()
      const [inputArgs] = capture(mockAppSync.listEmailMasksForOwner).first()
      expect(inputArgs.filter).toBeDefined()
      expect(inputArgs.filter?.status?.eq).toBe(EmailMaskStatus.Enabled)
    })

    it('calls appSync correctly with realAddressType filter', async () => {
      const input: ListEmailAliasesForOwnerInput = {
        filter: {
          realAddressType: {
            equal: EmailAliasEntityRealAddressType.INTERNAL,
          },
        },
      }

      await instanceUnderTest.listEmailAliasesForOwner(input)

      verify(mockAppSync.listEmailMasksForOwner(anything())).once()
      const [inputArgs] = capture(mockAppSync.listEmailMasksForOwner).first()
      expect(inputArgs.filter).toBeDefined()
      expect(inputArgs.filter?.realAddressType?.eq).toBe(
        EmailMaskRealAddressType.Internal,
      )
    })

    it('calls appSync correctly with limit, nextToken and both filters', async () => {
      const input: ListEmailAliasesForOwnerInput = {
        limit: 20,
        nextToken: 'testToken',
        filter: {
          status: {
            notOneOf: [
              EmailAliasEntityStatus.DISABLED,
              EmailAliasEntityStatus.LOCKED,
            ],
          },
          realAddressType: {
            oneOf: [EmailAliasEntityRealAddressType.INTERNAL],
          },
        },
      }

      await instanceUnderTest.listEmailAliasesForOwner(input)

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
      const result = await instanceUnderTest.listEmailAliasesForOwner()

      expect(result).toStrictEqual({
        emailAliases: [EntityDataFactory.emailAlias],
        nextToken: undefined,
      })
    })

    it('returns correct output with nextToken', async () => {
      when(mockAppSync.listEmailMasksForOwner(anything())).thenResolve({
        items: [GraphQLDataFactory.emailMask],
        nextToken: 'testNextToken',
      })

      const result = await instanceUnderTest.listEmailAliasesForOwner()

      expect(result).toStrictEqual({
        emailAliases: [EntityDataFactory.emailAlias],
        nextToken: 'testNextToken',
      })
    })

    it('returns empty array when no items', async () => {
      when(mockAppSync.listEmailMasksForOwner(anything())).thenResolve({
        items: [],
        nextToken: undefined,
      })

      const result = await instanceUnderTest.listEmailAliasesForOwner()

      expect(result).toStrictEqual({
        emailAliases: [],
        nextToken: undefined,
      })
    })

    it('returns empty array when items is undefined', async () => {
      when(mockAppSync.listEmailMasksForOwner(anything())).thenResolve({
        nextToken: undefined,
      } as any)

      const result = await instanceUnderTest.listEmailAliasesForOwner()

      expect(result).toStrictEqual({
        emailAliases: [],
        nextToken: undefined,
      })
    })
  })
})
