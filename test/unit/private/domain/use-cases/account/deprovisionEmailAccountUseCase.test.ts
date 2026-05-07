/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
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
import { EmailAccountService } from '../../../../../../src/private/domain/entities/account/emailAccountService'
import { DeprovisionEmailAccountUseCase } from '../../../../../../src/private/domain/use-cases/account/deprovisionEmailAccountUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'
import { EmailMessageBodyCache } from '../../../../../../src/private/domain/entities/message/emailMessageBodyCache'

describe('DeprovisionEmailAccountUseCase Test Suite', () => {
  const mockEmailAccountService = mock<EmailAccountService>()
  const mockCache = mock<EmailMessageBodyCache>()

  let instanceUnderTest: DeprovisionEmailAccountUseCase

  beforeEach(() => {
    reset(mockEmailAccountService)
    reset(mockCache)
    when(mockCache.flush(anything())).thenResolve()
    instanceUnderTest = new DeprovisionEmailAccountUseCase(
      instance(mockEmailAccountService),
      instance(mockCache),
    )
  })

  describe('execute', () => {
    it('deprovisionEmailAccount use case with valid input succeeds', async () => {
      when(mockEmailAccountService.delete(anything())).thenResolve(
        EntityDataFactory.emailAccount,
      )
      const result = await instanceUnderTest.execute(
        EntityDataFactory.emailAccount.id,
      )
      expect(result).toStrictEqual(EntityDataFactory.emailAccount)
      const [inputArgs] = capture(mockEmailAccountService.delete).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId: EntityDataFactory.emailAccount.id,
      })
      verify(mockEmailAccountService.delete(anything())).once()
    })

    it('calls cache.flush with emailAddressId after successful deprovision', async () => {
      when(mockEmailAccountService.delete(anything())).thenResolve(
        EntityDataFactory.emailAccount,
      )
      await instanceUnderTest.execute(EntityDataFactory.emailAccount.id)

      verify(mockCache.flush(anything())).once()
      const [flushInput] = capture(mockCache.flush).first()
      expect(flushInput).toStrictEqual({
        emailAddressId: EntityDataFactory.emailAccount.id,
      })
    })
  })
})
