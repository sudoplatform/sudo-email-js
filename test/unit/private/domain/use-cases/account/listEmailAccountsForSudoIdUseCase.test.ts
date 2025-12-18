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
import { EmailAccountService } from '../../../../../../src/private/domain/entities/account/emailAccountService'
import { ListEmailAccountsForSudoIdUseCase } from '../../../../../../src/private/domain/use-cases/account/listEmailAccountsForSudoIdUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('ListEmailAccountsForSudoIdUseCase Test Suite', () => {
  const mockEmailAccountService = mock<EmailAccountService>()

  let instanceUnderTest: ListEmailAccountsForSudoIdUseCase

  beforeEach(() => {
    reset(mockEmailAccountService)
    instanceUnderTest = new ListEmailAccountsForSudoIdUseCase(
      instance(mockEmailAccountService),
    )
  })

  describe('execute', () => {
    it('completes successfully', async () => {
      const sudoId = v4()
      when(mockEmailAccountService.listForSudoId(anything())).thenResolve({
        emailAccounts: [EntityDataFactory.emailAccount],
      })
      const result = await instanceUnderTest.execute({
        sudoId,
      })
      verify(mockEmailAccountService.listForSudoId(anything())).once()
      const [inputArgs] = capture(mockEmailAccountService.listForSudoId).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        sudoId,
        limit: undefined,
        nextToken: undefined,
      })
      expect(result).toStrictEqual({
        emailAccounts: [EntityDataFactory.emailAccount],
      })
    })

    it('completes successfully with empty result items', async () => {
      const sudoId = v4()
      when(mockEmailAccountService.listForSudoId(anything())).thenResolve({
        emailAccounts: [],
      })
      const result = await instanceUnderTest.execute({
        sudoId,
      })
      verify(mockEmailAccountService.listForSudoId(anything())).once()
      const [inputArgs] = capture(mockEmailAccountService.listForSudoId).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        sudoId,
        limit: undefined,
        nextToken: undefined,
      })
      expect(result).toStrictEqual({
        emailAccounts: [],
      })
    })
  })
})
