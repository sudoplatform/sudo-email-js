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
import { EmailAccountService } from '../../../../../../src/private/domain/entities/account/emailAccountService'
import { ListEmailAccountsUseCase } from '../../../../../../src/private/domain/use-cases/account/listEmailAccountsUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('ListEmailAccountsUseCase Test Suite', () => {
  const mockEmailAccountService = mock<EmailAccountService>()

  let instanceUnderTest: ListEmailAccountsUseCase

  beforeEach(() => {
    reset(mockEmailAccountService)
    instanceUnderTest = new ListEmailAccountsUseCase(
      instance(mockEmailAccountService),
    )
  })

  describe('execute', () => {
    it('completes successfully', async () => {
      when(mockEmailAccountService.list(anything())).thenResolve({
        emailAccounts: [EntityDataFactory.emailAccount],
      })
      const result = await instanceUnderTest.execute({
        limit: 100,
        nextToken: 'nextToken',
      })
      verify(mockEmailAccountService.list(anything())).once()
      const [inputArgs] = capture(mockEmailAccountService.list).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        limit: 100,
        nextToken: 'nextToken',
      })
      expect(result).toStrictEqual({
        emailAccounts: [EntityDataFactory.emailAccount],
      })
    })

    it('completes successfully with empty result items', async () => {
      when(mockEmailAccountService.list(anything())).thenResolve({
        emailAccounts: [EntityDataFactory.emailAccount],
      })
      const result = await instanceUnderTest.execute({
        limit: 100,
        nextToken: 'nextToken',
      })
      verify(mockEmailAccountService.list(anything())).once()
      const [inputArgs] = capture(mockEmailAccountService.list).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        limit: 100,
        nextToken: 'nextToken',
      })
      expect(result).toStrictEqual({
        emailAccounts: [EntityDataFactory.emailAccount],
      })
    })
  })
})
