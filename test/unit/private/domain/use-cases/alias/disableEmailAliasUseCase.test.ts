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
import { DisableEmailAliasUseCase } from '../../../../../../src/private/domain/use-cases/alias/disableEmailAliasUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('DisableEmailAliasUseCase Test Suite', () => {
  const mockEmailAliasService = mock<EmailAliasService>()
  let instanceUnderTest: DisableEmailAliasUseCase

  beforeEach(() => {
    reset(mockEmailAliasService)
    instanceUnderTest = new DisableEmailAliasUseCase(
      instance(mockEmailAliasService),
    )
    when(mockEmailAliasService.disableEmailAlias(anything())).thenResolve(
      EntityDataFactory.emailAlias,
    )
  })

  describe('execute', () => {
    it('disables email alias successfully', async () => {
      const emailAliasId = 'testAliasId'
      const result = await instanceUnderTest.execute({
        emailAliasId,
      })

      expect(result).toStrictEqual(EntityDataFactory.emailAlias)
      verify(mockEmailAliasService.disableEmailAlias(anything())).once()
      const [inputArgs] = capture(
        mockEmailAliasService.disableEmailAlias,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAliasId,
      })
    })
  })
})
