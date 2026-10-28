/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { anything, capture, instance, mock, reset, when } from 'ts-mockito'
import { KeyNotFoundError } from '@sudoplatform/sudo-common'
import { EmailAliasTransformer } from '../../../../../../src/private/data/alias/transformer/emailAliasTransformer'
import { DeviceKeyWorker } from '../../../../../../src/private/data/common/deviceKeyWorker'
import { GraphQLDataFactory } from '../../../../data-factory/graphQL'
import { EntityDataFactory } from '../../../../data-factory/entity'
import { APIDataFactory } from '../../../../data-factory/api'

describe('EmailAliasTransformer Test Suite', () => {
  const mockDeviceKeyWorker = mock<DeviceKeyWorker>()
  let instanceUnderTest: EmailAliasTransformer

  beforeEach(() => {
    reset(mockDeviceKeyWorker)
    instanceUnderTest = new EmailAliasTransformer(instance(mockDeviceKeyWorker))
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
        aliasAddress: graphQLData.maskAddress,
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

      expect(result).toStrictEqual(EntityDataFactory.emailAlias)
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
      const result = await EmailAliasTransformer.entityToApi(
        EntityDataFactory.emailAlias,
      )

      expect(result).toStrictEqual(APIDataFactory.emailAlias)
    })

    it('transforms entity to API with metadata', async () => {
      const entityWithMetadata = {
        ...EntityDataFactory.emailAlias,
        metadata: {
          customKey: 'customValue',
          nested: { value: 123 },
        },
      }

      const result = await EmailAliasTransformer.entityToApi(entityWithMetadata)

      expect(result.metadata).toEqual(entityWithMetadata.metadata)
    })

    it('transforms entity to API without metadata', async () => {
      const entityWithoutMetadata = {
        ...EntityDataFactory.emailAlias,
        metadata: undefined,
      }

      const result = await EmailAliasTransformer.entityToApi(
        entityWithoutMetadata,
      )

      expect(result.metadata).toBeUndefined()
    })

    it('transforms entity to API without expiresAt', async () => {
      const entityWithoutExpiry = {
        ...EntityDataFactory.emailAlias,
        expiresAt: undefined,
      }

      const result =
        await EmailAliasTransformer.entityToApi(entityWithoutExpiry)

      expect(result.expiresAt).toBeUndefined()
    })

    it('transforms all entity fields correctly', async () => {
      const result = await EmailAliasTransformer.entityToApi(
        EntityDataFactory.emailAlias,
      )

      expect(result.id).toEqual(EntityDataFactory.emailAlias.id)
      expect(result.owner).toEqual(EntityDataFactory.emailAlias.owner)
      expect(result.owners).toEqual(EntityDataFactory.emailAlias.owners)
      expect(result.identityId).toEqual(EntityDataFactory.emailAlias.identityId)
      expect(result.aliasAddress).toEqual(
        EntityDataFactory.emailAlias.aliasAddress,
      )
      expect(result.realAddress).toEqual(
        EntityDataFactory.emailAlias.realAddress,
      )
      expect(result.inboundReceived).toEqual(
        EntityDataFactory.emailAlias.inboundReceived,
      )
      expect(result.inboundDelivered).toEqual(
        EntityDataFactory.emailAlias.inboundDelivered,
      )
      expect(result.outboundReceived).toEqual(
        EntityDataFactory.emailAlias.outboundReceived,
      )
      expect(result.outboundDelivered).toEqual(
        EntityDataFactory.emailAlias.outboundDelivered,
      )
      expect(result.spamCount).toEqual(EntityDataFactory.emailAlias.spamCount)
      expect(result.virusCount).toEqual(EntityDataFactory.emailAlias.virusCount)
      expect(result.version).toEqual(EntityDataFactory.emailAlias.version)
      expect(result.createdAt).toEqual(EntityDataFactory.emailAlias.createdAt)
      expect(result.updatedAt).toEqual(EntityDataFactory.emailAlias.updatedAt)
    })
  })
})
