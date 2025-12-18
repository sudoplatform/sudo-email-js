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
import { v4 } from 'uuid'
import { EmailMessageService } from '../../../../../../src/private/domain/entities/message/emailMessageService'
import { GetEmailMessageUseCase } from '../../../../../../src/private/domain/use-cases/message/getEmailMessageUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('GetEmailMessageUseCase', () => {
  const mockEmailMessageService = mock<EmailMessageService>()

  let instanceUnderTest: GetEmailMessageUseCase

  beforeEach(() => {
    reset(mockEmailMessageService)
    instanceUnderTest = new GetEmailMessageUseCase(
      instance(mockEmailMessageService),
    )
  })

  describe('execute', () => {
    it('completes successfully', async () => {
      const id = v4()
      when(mockEmailMessageService.getMessage(anything())).thenResolve(
        EntityDataFactory.emailMessage,
      )
      const result = await instanceUnderTest.execute({
        id,
      })
      verify(mockEmailMessageService.getMessage(anything())).once()
      const [inputArgs] = capture(mockEmailMessageService.getMessage).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        id,
      })
      expect(result).toStrictEqual(EntityDataFactory.emailMessage)
    })

    it('completes successfully with undefined result', async () => {
      const id = v4()
      when(mockEmailMessageService.getMessage(anything())).thenResolve(
        undefined,
      )
      const result = await instanceUnderTest.execute({
        id,
      })
      verify(mockEmailMessageService.getMessage(anything())).once()
      const [inputArgs] = capture(mockEmailMessageService.getMessage).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        id,
      })
      expect(result).toStrictEqual(undefined)
    })

    it('completes successfully with undefined keyId', async () => {
      const id = v4()
      when(mockEmailMessageService.getMessage(anything())).thenResolve(
        EntityDataFactory.emailMessage,
      )
      const result = await instanceUnderTest.execute({
        id,
      })
      verify(mockEmailMessageService.getMessage(anything())).once()
      const [inputArgs] = capture(mockEmailMessageService.getMessage).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        id,
      })
      expect(result).toStrictEqual(EntityDataFactory.emailMessage)
    })
  })
})
