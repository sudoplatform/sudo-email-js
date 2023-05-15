/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
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

describe('DeprovisionEmailAccountUseCase Test Suite', () => {
  const mockEmailAccountService = mock<EmailAccountService>()

  let instanceUnderTest: DeprovisionEmailAccountUseCase

  beforeEach(() => {
    reset(mockEmailAccountService)
    instanceUnderTest = new DeprovisionEmailAccountUseCase(
      instance(mockEmailAccountService),
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
  })
})
