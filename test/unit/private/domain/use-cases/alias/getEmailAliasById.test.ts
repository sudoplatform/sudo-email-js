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
import { EmailAliasService } from '../../../../../../src/private/domain/entities/alias/emailAliasService'
import { GetEmailAliasByIdUseCase } from '../../../../../../src/private/domain/use-cases/alias/getEmailAliasByIdUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'
import { EmailAliasNotFoundError } from '../../../../../../src'

describe('GetEmailAliasUseCase', () => {
  const mockEmailAliasService = mock<EmailAliasService>()

  let instanceUnderTest: GetEmailAliasByIdUseCase

  beforeEach(() => {
    reset(mockEmailAliasService)
    instanceUnderTest = new GetEmailAliasByIdUseCase(
      instance(mockEmailAliasService),
    )
  })

  describe('execute', () => {
    it('completes successfully', async () => {
      const id = v4()
      when(mockEmailAliasService.getEmailAliasById(anything())).thenResolve(
        EntityDataFactory.emailAlias,
      )
      const result = await instanceUnderTest.execute({
        id,
      })
      verify(mockEmailAliasService.getEmailAliasById(anything())).once()
      const [inputArgs] = capture(
        mockEmailAliasService.getEmailAliasById,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        id,
      })
      expect(result).toStrictEqual(EntityDataFactory.emailAlias)
    })

    it('throws EmailAliasNotFoundError if thrown by service', async () => {
      const id = v4()
      when(mockEmailAliasService.getEmailAliasById(anything())).thenReject(
        new EmailAliasNotFoundError(),
      )
      await expect(
        instanceUnderTest.execute({
          id,
        }),
      ).rejects.toBeInstanceOf(EmailAliasNotFoundError)

      verify(mockEmailAliasService.getEmailAliasById(anything())).once()
      const [inputArgs] = capture(
        mockEmailAliasService.getEmailAliasById,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        id,
      })
    })
  })
})
