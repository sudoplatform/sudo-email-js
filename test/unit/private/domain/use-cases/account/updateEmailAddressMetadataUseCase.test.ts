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
import { UpdateEmailAccountMetadataUseCase } from '../../../../../../src/private/domain/use-cases/account/updateEmailAccountMetadataUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('UpdateEmailAccountMetadataUseCase Test Suite', () => {
  const mockEmailAccountService = mock<EmailAccountService>()

  let instanceUnderTest: UpdateEmailAccountMetadataUseCase

  beforeEach(() => {
    reset(mockEmailAccountService)
    instanceUnderTest = new UpdateEmailAccountMetadataUseCase(
      instance(mockEmailAccountService),
    )
  })

  describe('execute', () => {
    it('updateEmailAccountMetadataAccount use case with valid input succeeds', async () => {
      when(mockEmailAccountService.updateMetadata(anything())).thenResolve(
        EntityDataFactory.emailAccount.id,
      )
      const result = await instanceUnderTest.execute({
        id: EntityDataFactory.emailAccount.id,
        values: {
          alias: 'alias',
        },
      })
      expect(result).toStrictEqual(EntityDataFactory.emailAccount.id)
      const [inputArgs] = capture(
        mockEmailAccountService.updateMetadata,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        id: EntityDataFactory.emailAccount.id,
        values: {
          alias: 'alias',
        },
      })
      verify(mockEmailAccountService.updateMetadata(anything())).once()
    })
  })
})
