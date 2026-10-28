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
import { EmailAliasService } from '../../../../../../src/private/domain/entities/alias/emailAliasService'
import { EnableEmailAliasUseCase } from '../../../../../../src/private/domain/use-cases/alias/enableEmailAliasUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('EnableEmailAliasUseCase Test Suite', () => {
  const mockEmailAliasService = mock<EmailAliasService>()
  let instanceUnderTest: EnableEmailAliasUseCase

  beforeEach(() => {
    reset(mockEmailAliasService)
    instanceUnderTest = new EnableEmailAliasUseCase(
      instance(mockEmailAliasService),
    )
    when(mockEmailAliasService.enableEmailAlias(anything())).thenResolve(
      EntityDataFactory.emailAlias,
    )
  })

  describe('execute', () => {
    it('enables email alias successfully', async () => {
      const emailAliasId = 'testAliasId'
      const result = await instanceUnderTest.execute({
        emailAliasId,
      })

      expect(result).toStrictEqual(EntityDataFactory.emailAlias)
      verify(mockEmailAliasService.enableEmailAlias(anything())).once()
      const [inputArgs] = capture(
        mockEmailAliasService.enableEmailAlias,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAliasId,
      })
    })
  })
})
