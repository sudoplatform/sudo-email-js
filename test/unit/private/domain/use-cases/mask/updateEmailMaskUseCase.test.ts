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
import { EmailMaskService } from '../../../../../../src/private/domain/entities/mask/emailMaskService'
import { UpdateEmailMaskUseCase } from '../../../../../../src/private/domain/use-cases/mask/updateEmailMaskUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'
import { InvalidArgumentError } from '../../../../../../src/public'

describe('UpdateEmailMaskUseCase Test Suite', () => {
  const mockEmailMaskService = mock<EmailMaskService>()
  let instanceUnderTest: UpdateEmailMaskUseCase

  beforeEach(() => {
    reset(mockEmailMaskService)
    instanceUnderTest = new UpdateEmailMaskUseCase(
      instance(mockEmailMaskService),
    )
    when(mockEmailMaskService.updateEmailMask(anything())).thenResolve(
      EntityDataFactory.emailMask,
    )
  })

  describe('execute', () => {
    it('updates email mask successfully with no changes', async () => {
      const emailMaskId = 'testMaskId'
      const result = await instanceUnderTest.execute({
        emailMaskId,
      })

      expect(result).toStrictEqual(EntityDataFactory.emailMask)
      verify(mockEmailMaskService.updateEmailMask(anything())).once()
      const [inputArgs] = capture(mockEmailMaskService.updateEmailMask).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailMaskId,
        metadata: undefined,
        expiresAt: undefined,
      })
    })

    it('updates email mask successfully with metadata', async () => {
      const metadata = { test: 'updated data' }
      const input = {
        emailMaskId: 'testMaskId',
        metadata: metadata,
      }

      const result = await instanceUnderTest.execute(input)

      expect(result).toStrictEqual(EntityDataFactory.emailMask)
      verify(mockEmailMaskService.updateEmailMask(anything())).once()
      const [inputArgs] = capture(mockEmailMaskService.updateEmailMask).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        ...input,
        expiresAt: undefined,
      })
    })

    it('updates email mask successfully with null metadata to clear', async () => {
      const input = {
        emailMaskId: 'testMaskId',
        metadata: null,
      }
      const result = await instanceUnderTest.execute(input)

      expect(result).toStrictEqual(EntityDataFactory.emailMask)
      verify(mockEmailMaskService.updateEmailMask(anything())).once()
      const [inputArgs] = capture(mockEmailMaskService.updateEmailMask).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        ...input,
        expiresAt: undefined,
      })
    })

    it('updates email mask successfully with future expiresAt', async () => {
      const expiresAt = DateTime.now().plus({ days: 30 }).toJSDate()
      const input = {
        emailMaskId: 'testMaskId',
        expiresAt,
      }

      const result = await instanceUnderTest.execute(input)

      expect(result).toStrictEqual(EntityDataFactory.emailMask)
      verify(mockEmailMaskService.updateEmailMask(anything())).once()
      const [inputArgs] = capture(mockEmailMaskService.updateEmailMask).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        ...input,
        metadata: undefined,
      })
    })

    it('updates email mask successfully with null expiresAt to clear', async () => {
      const input = {
        emailMaskId: 'testMaskId',
        expiresAt: null,
      }

      const result = await instanceUnderTest.execute(input)

      expect(result).toStrictEqual(EntityDataFactory.emailMask)
      verify(mockEmailMaskService.updateEmailMask(anything())).once()
      const [inputArgs] = capture(mockEmailMaskService.updateEmailMask).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        ...input,
        metadata: undefined,
      })
    })

    it('updates email mask successfully with both metadata and expiresAt', async () => {
      const metadata = { test: 'updated data' }
      const expiresAt = DateTime.now().plus({ days: 30 }).toJSDate()
      const input = {
        emailMaskId: 'testMaskId',
        metadata: metadata,
        expiresAt,
      }

      const result = await instanceUnderTest.execute(input)

      expect(result).toStrictEqual(EntityDataFactory.emailMask)
      verify(mockEmailMaskService.updateEmailMask(anything())).once()
      const [inputArgs] = capture(mockEmailMaskService.updateEmailMask).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>(input)
    })

    it('throws InvalidArgumentError if expiresAt is in the past', async () => {
      const expiresAt = DateTime.now().minus({ days: 1 }).toJSDate()

      await expect(
        instanceUnderTest.execute({
          emailMaskId: 'testMaskId',
          expiresAt,
        }),
      ).rejects.toThrow(InvalidArgumentError)
      verify(mockEmailMaskService.updateEmailMask(anything())).never()
    })

    it('throws InvalidArgumentError if expiresAt is now', async () => {
      const expiresAt = DateTime.now().toJSDate()

      await expect(
        instanceUnderTest.execute({
          emailMaskId: 'testMaskId',
          expiresAt,
        }),
      ).rejects.toThrow(InvalidArgumentError)
      verify(mockEmailMaskService.updateEmailMask(anything())).never()
    })
  })
})
