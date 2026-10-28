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
import { UpdateEmailAliasUseCase } from '../../../../../../src/private/domain/use-cases/alias/updateEmailAliasUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'
import { InvalidArgumentError } from '../../../../../../src/public'

describe('UpdateEmailAliasUseCase Test Suite', () => {
  const mockEmailAliasService = mock<EmailAliasService>()
  let instanceUnderTest: UpdateEmailAliasUseCase

  beforeEach(() => {
    reset(mockEmailAliasService)
    instanceUnderTest = new UpdateEmailAliasUseCase(
      instance(mockEmailAliasService),
    )
    when(mockEmailAliasService.updateEmailAlias(anything())).thenResolve(
      EntityDataFactory.emailAlias,
    )
  })

  describe('execute', () => {
    it('updates email alias successfully with no changes', async () => {
      const emailAliasId = 'testAliasId'
      const result = await instanceUnderTest.execute({
        emailAliasId,
      })

      expect(result).toStrictEqual(EntityDataFactory.emailAlias)
      verify(mockEmailAliasService.updateEmailAlias(anything())).once()
      const [inputArgs] = capture(
        mockEmailAliasService.updateEmailAlias,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAliasId,
        metadata: undefined,
        expiresAt: undefined,
        realAddress: undefined,
      })
    })

    it('updates email alias successfully with metadata', async () => {
      const metadata = { test: 'updated data' }
      const input = {
        emailAliasId: 'testAliasId',
        metadata: metadata,
      }

      const result = await instanceUnderTest.execute(input)

      expect(result).toStrictEqual(EntityDataFactory.emailAlias)
      verify(mockEmailAliasService.updateEmailAlias(anything())).once()
      const [inputArgs] = capture(
        mockEmailAliasService.updateEmailAlias,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        ...input,
        expiresAt: undefined,
        realAddress: undefined,
      })
    })

    it('updates email alias successfully with null metadata to clear', async () => {
      const input = {
        emailAliasId: 'testAliasId',
        metadata: null,
      }
      const result = await instanceUnderTest.execute(input)

      expect(result).toStrictEqual(EntityDataFactory.emailAlias)
      verify(mockEmailAliasService.updateEmailAlias(anything())).once()
      const [inputArgs] = capture(
        mockEmailAliasService.updateEmailAlias,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        ...input,
        expiresAt: undefined,
        realAddress: undefined,
      })
    })

    it('updates email alias successfully with future expiresAt', async () => {
      const expiresAt = DateTime.now().plus({ days: 30 }).toJSDate()
      const input = {
        emailAliasId: 'testAliasId',
        expiresAt,
      }

      const result = await instanceUnderTest.execute(input)

      expect(result).toStrictEqual(EntityDataFactory.emailAlias)
      verify(mockEmailAliasService.updateEmailAlias(anything())).once()
      const [inputArgs] = capture(
        mockEmailAliasService.updateEmailAlias,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        ...input,
        metadata: undefined,
        realAddress: undefined,
      })
    })

    it('updates email alias successfully with null expiresAt to clear', async () => {
      const input = {
        emailAliasId: 'testAliasId',
        expiresAt: null,
      }

      const result = await instanceUnderTest.execute(input)

      expect(result).toStrictEqual(EntityDataFactory.emailAlias)
      verify(mockEmailAliasService.updateEmailAlias(anything())).once()
      const [inputArgs] = capture(
        mockEmailAliasService.updateEmailAlias,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        ...input,
        metadata: undefined,
        realAddress: undefined,
      })
    })

    it('updates email alias successfully with realAddress', async () => {
      const input = {
        emailAliasId: 'testAliasId',
        realAddress: 'new@example.com',
      }

      const result = await instanceUnderTest.execute(input)

      expect(result).toStrictEqual(EntityDataFactory.emailAlias)
      verify(mockEmailAliasService.updateEmailAlias(anything())).once()
      const [inputArgs] = capture(
        mockEmailAliasService.updateEmailAlias,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        ...input,
        metadata: undefined,
        expiresAt: undefined,
      })
    })

    it('updates email alias successfully with all parameters', async () => {
      const metadata = { test: 'updated data' }
      const expiresAt = DateTime.now().plus({ days: 30 }).toJSDate()
      const input = {
        emailAliasId: 'testAliasId',
        metadata: metadata,
        expiresAt,
        realAddress: 'new@example.com',
      }

      const result = await instanceUnderTest.execute(input)

      expect(result).toStrictEqual(EntityDataFactory.emailAlias)
      verify(mockEmailAliasService.updateEmailAlias(anything())).once()
      const [inputArgs] = capture(
        mockEmailAliasService.updateEmailAlias,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>(input)
    })

    it('throws InvalidArgumentError if expiresAt is in the past', async () => {
      const expiresAt = DateTime.now().minus({ days: 1 }).toJSDate()

      await expect(
        instanceUnderTest.execute({
          emailAliasId: 'testAliasId',
          expiresAt,
        }),
      ).rejects.toThrow(InvalidArgumentError)
      verify(mockEmailAliasService.updateEmailAlias(anything())).never()
    })

    it('throws InvalidArgumentError if expiresAt is now', async () => {
      const expiresAt = DateTime.now().toJSDate()

      await expect(
        instanceUnderTest.execute({
          emailAliasId: 'testAliasId',
          expiresAt,
        }),
      ).rejects.toThrow(InvalidArgumentError)
      verify(mockEmailAliasService.updateEmailAlias(anything())).never()
    })
  })
})
