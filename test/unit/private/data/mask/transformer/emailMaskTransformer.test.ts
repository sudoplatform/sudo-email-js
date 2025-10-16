/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { anything, capture, instance, mock, reset, when } from 'ts-mockito'
import { KeyNotFoundError } from '@sudoplatform/sudo-common'
import { EmailMaskTransformer } from '../../../../../../src/private/data/mask/transformer/emailMaskTransformer'
import { DeviceKeyWorker } from '../../../../../../src/private/data/common/deviceKeyWorker'
import { GraphQLDataFactory } from '../../../../data-factory/graphQL'
import { EntityDataFactory } from '../../../../data-factory/entity'
import { APIDataFactory } from '../../../../data-factory/api'

describe('EmailMaskTransformer Test Suite', () => {
  const mockDeviceKeyWorker = mock<DeviceKeyWorker>()
  let instanceUnderTest: EmailMaskTransformer

  beforeEach(() => {
    reset(mockDeviceKeyWorker)
    instanceUnderTest = new EmailMaskTransformer(instance(mockDeviceKeyWorker))
  })

  describe('graphQLToEntity', () => {
    it('transforms graphQL to entity without metadata', async () => {
      const graphQLData = {
        ...GraphQLDataFactory.emailMask,
        metadata: undefined,
      }

      const result = await instanceUnderTest.graphQLToEntity(graphQLData)

      expect(result).toMatchObject({
        id: graphQLData.id,
        owner: graphQLData.owner,
        owners: graphQLData.owners,
        identityId: graphQLData.identityId,
        maskAddress: graphQLData.maskAddress,
        realAddress: graphQLData.realAddress,
        inboundReceived: graphQLData.inboundReceived,
        inboundDelivered: graphQLData.inboundDelivered,
        outboundReceived: graphQLData.outboundReceived,
        outboundDelivered: graphQLData.outboundDelivered,
        spamCount: graphQLData.spamCount,
        virusCount: graphQLData.virusCount,
        version: graphQLData.version,
        createdAt: new Date(graphQLData.createdAtEpochMs),
        updatedAt: new Date(graphQLData.updatedAtEpochMs),
      })
      expect(result.metadata).toBeUndefined()
    })

    it('transforms graphQL to entity with unsealed metadata', async () => {
      const metadataValue = { test: 'test data' }
      when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
        true,
      )
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(
        JSON.stringify(metadataValue),
      )

      const result = await instanceUnderTest.graphQLToEntity(
        GraphQLDataFactory.emailMask,
      )

      expect(result).toStrictEqual(EntityDataFactory.emailMask)
      expect(result.metadata).toEqual(metadataValue)
    })

    it('transforms graphQL to entity with expiresAt', async () => {
      const graphQLData = {
        ...GraphQLDataFactory.emailMask,
        metadata: undefined,
      }

      const result = await instanceUnderTest.graphQLToEntity(graphQLData)

      expect(result.expiresAt).toBeDefined()
      expect(result.expiresAt).toBeInstanceOf(Date)
    })

    it('transforms graphQL to entity without expiresAt', async () => {
      const graphQLData = {
        ...GraphQLDataFactory.emailMask,
        expiresAtEpochSec: undefined,
        metadata: undefined,
      }

      const result = await instanceUnderTest.graphQLToEntity(graphQLData)

      expect(result.expiresAt).toBeUndefined()
    })

    it('handles KeyNotFoundError when unsealing metadata', async () => {
      when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
        false,
      )

      const result = await instanceUnderTest.graphQLToEntity(
        GraphQLDataFactory.emailMask,
      )

      expect(result.metadata).toBeInstanceOf(Error)
      expect(result.metadata).toBeInstanceOf(KeyNotFoundError)
    })

    it('handles unseal failure gracefully', async () => {
      when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
        true,
      )
      when(mockDeviceKeyWorker.unsealString(anything())).thenReject(
        new Error('Decoding error'),
      )

      const result = await instanceUnderTest.graphQLToEntity(
        GraphQLDataFactory.emailMask,
      )

      expect(result.metadata).toEqual({})
    })

    it('calls deviceKeyWorker with correct parameters when unsealing', async () => {
      const metadataValue = { test: 'test data' }
      when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
        true,
      )
      when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(
        JSON.stringify(metadataValue),
      )

      await instanceUnderTest.graphQLToEntity(GraphQLDataFactory.emailMask)

      const [keyExistsArgs] = capture(mockDeviceKeyWorker.keyExists).first()
      expect(keyExistsArgs).toEqual('keyId')

      const [unsealArgs] = capture(mockDeviceKeyWorker.unsealString).first()
      expect(unsealArgs).toMatchObject({
        encrypted: 'dummySealedData',
        keyId: 'keyId',
      })
    })
  })

  describe('entityToApi', () => {
    it('transforms entity to API', async () => {
      const result = await EmailMaskTransformer.entityToApi(
        EntityDataFactory.emailMask,
      )

      expect(result).toStrictEqual(APIDataFactory.emailMask)
    })

    it('transforms entity to API with metadata', async () => {
      const entityWithMetadata = {
        ...EntityDataFactory.emailMask,
        metadata: {
          customKey: 'customValue',
          nested: { value: 123 },
        },
      }

      const result = await EmailMaskTransformer.entityToApi(entityWithMetadata)

      expect(result.metadata).toEqual(entityWithMetadata.metadata)
    })

    it('transforms entity to API without metadata', async () => {
      const entityWithoutMetadata = {
        ...EntityDataFactory.emailMask,
        metadata: undefined,
      }

      const result = await EmailMaskTransformer.entityToApi(
        entityWithoutMetadata,
      )

      expect(result.metadata).toBeUndefined()
    })

    it('transforms entity to API without expiresAt', async () => {
      const entityWithoutExpiry = {
        ...EntityDataFactory.emailMask,
        expiresAt: undefined,
      }

      const result = await EmailMaskTransformer.entityToApi(entityWithoutExpiry)

      expect(result.expiresAt).toBeUndefined()
    })

    it('transforms all entity fields correctly', async () => {
      const result = await EmailMaskTransformer.entityToApi(
        EntityDataFactory.emailMask,
      )

      expect(result.id).toEqual(EntityDataFactory.emailMask.id)
      expect(result.owner).toEqual(EntityDataFactory.emailMask.owner)
      expect(result.owners).toEqual(EntityDataFactory.emailMask.owners)
      expect(result.identityId).toEqual(EntityDataFactory.emailMask.identityId)
      expect(result.maskAddress).toEqual(
        EntityDataFactory.emailMask.maskAddress,
      )
      expect(result.realAddress).toEqual(
        EntityDataFactory.emailMask.realAddress,
      )
      expect(result.inboundReceived).toEqual(
        EntityDataFactory.emailMask.inboundReceived,
      )
      expect(result.inboundDelivered).toEqual(
        EntityDataFactory.emailMask.inboundDelivered,
      )
      expect(result.outboundReceived).toEqual(
        EntityDataFactory.emailMask.outboundReceived,
      )
      expect(result.outboundDelivered).toEqual(
        EntityDataFactory.emailMask.outboundDelivered,
      )
      expect(result.spamCount).toEqual(EntityDataFactory.emailMask.spamCount)
      expect(result.virusCount).toEqual(EntityDataFactory.emailMask.virusCount)
      expect(result.version).toEqual(EntityDataFactory.emailMask.version)
      expect(result.createdAt).toEqual(EntityDataFactory.emailMask.createdAt)
      expect(result.updatedAt).toEqual(EntityDataFactory.emailMask.updatedAt)
    })
  })
})
