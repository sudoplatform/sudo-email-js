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
  verify,
  when,
} from 'ts-mockito'
import { DateTime } from 'luxon'
import { EmailAliasService } from '../../../../../../src/private/domain/entities/alias/emailAliasService'
import { ProvisionEmailAliasUseCase } from '../../../../../../src/private/domain/use-cases/alias/provisionEmailAliasUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'
import { InvalidArgumentError } from '../../../../../../src/public'

describe('ProvisionEmailAliasUseCase Test Suite', () => {
  const mockEmailAliasService = mock<EmailAliasService>()
  let instanceUnderTest: ProvisionEmailAliasUseCase

  beforeEach(() => {
    reset(mockEmailAliasService)
    instanceUnderTest = new ProvisionEmailAliasUseCase(
      instance(mockEmailAliasService),
    )
    when(mockEmailAliasService.provisionEmailAlias(anything())).thenResolve(
      EntityDataFactory.emailAlias,
    )
  })

  describe('execute', () => {
    it('provisions email alias successfully without optional fields', async () => {
      const input = {
        aliasAddress: 'test-alias@anonyome.com',
        realAddress: 'test-real@anonyome.com',
        ownershipProofToken: 'testToken',
      }

      const result = await instanceUnderTest.execute(input)

      expect(result).toStrictEqual(EntityDataFactory.emailAlias)
      verify(mockEmailAliasService.provisionEmailAlias(anything())).once()
      const [inputArgs] = capture(
        mockEmailAliasService.provisionEmailAlias,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        ...input,
        metadata: undefined,
        expiresAt: undefined,
      })
    })

    it('provisions email alias successfully with metadata', async () => {
      const metadata = { test: 'data' }
      const input = {
        aliasAddress: 'test-alias@anonyome.com',
        realAddress: 'test-real@anonyome.com',
        ownershipProofToken: 'testToken',
        metadata,
      }

      const result = await instanceUnderTest.execute(input)

      expect(result).toStrictEqual(EntityDataFactory.emailAlias)
      verify(mockEmailAliasService.provisionEmailAlias(anything())).once()
      const [inputArgs] = capture(
        mockEmailAliasService.provisionEmailAlias,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        ...input,
        expiresAt: undefined,
      })
    })

    it('provisions email alias successfully with future expiresAt', async () => {
      const expiresAt = DateTime.now().plus({ days: 30 }).toJSDate()
      const input = {
        aliasAddress: 'test-alias@anonyome.com',
        realAddress: 'test-real@anonyome.com',
        ownershipProofToken: 'testToken',
        expiresAt,
      }

      const result = await instanceUnderTest.execute(input)

      expect(result).toStrictEqual(EntityDataFactory.emailAlias)
      verify(mockEmailAliasService.provisionEmailAlias(anything())).once()
      const [inputArgs] = capture(
        mockEmailAliasService.provisionEmailAlias,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        ...input,
        metadata: undefined,
      })
    })

    it('provisions email alias successfully with all fields', async () => {
      const metadata = { test: 'data' }
      const expiresAt = DateTime.now().plus({ days: 30 }).toJSDate()
      const input = {
        aliasAddress: 'test-alias@anonyome.com',
        realAddress: 'test-real@anonyome.com',
        ownershipProofToken: 'testToken',
        metadata,
        expiresAt,
      }

      const result = await instanceUnderTest.execute(input)

      expect(result).toStrictEqual(EntityDataFactory.emailAlias)
      verify(mockEmailAliasService.provisionEmailAlias(anything())).once()
      const [inputArgs] = capture(
        mockEmailAliasService.provisionEmailAlias,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>(input)
    })

    it('throws InvalidArgumentError if expiresAt is in the past', async () => {
      const expiresAt = DateTime.now().minus({ days: 1 }).toJSDate()

      await expect(
        instanceUnderTest.execute({
          aliasAddress: 'test-alias@anonyome.com',
          realAddress: 'test-real@anonyome.com',
          ownershipProofToken: 'testToken',
          expiresAt,
        }),
      ).rejects.toThrow(InvalidArgumentError)
      verify(mockEmailAliasService.provisionEmailAlias(anything())).never()
    })

    it('throws InvalidArgumentError if expiresAt is now', async () => {
      const expiresAt = DateTime.now().toJSDate()

      await expect(
        instanceUnderTest.execute({
          aliasAddress: 'test-alias@anonyome.com',
          realAddress: 'test-real@anonyome.com',
          ownershipProofToken: 'testToken',
          expiresAt,
        }),
      ).rejects.toThrow(InvalidArgumentError)
      verify(mockEmailAliasService.provisionEmailAlias(anything())).never()
    })
  })
})
