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
import { DeprovisionEmailAliasUseCase } from '../../../../../../src/private/domain/use-cases/alias/deprovisionEmailAliasUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('DeprovisionEmailAliasUseCase Test Suite', () => {
  const mockEmailAliasService = mock<EmailAliasService>()
  let instanceUnderTest: DeprovisionEmailAliasUseCase

  beforeEach(() => {
    reset(mockEmailAliasService)
    instanceUnderTest = new DeprovisionEmailAliasUseCase(
      instance(mockEmailAliasService),
    )
    when(mockEmailAliasService.deprovisionEmailAlias(anything())).thenResolve(
      EntityDataFactory.emailAlias,
    )
  })

  describe('execute', () => {
    it('deprovisions email alias successfully', async () => {
      const emailAliasId = 'testAliasId'
      const result = await instanceUnderTest.execute({
        emailAliasId,
      })

      expect(result).toStrictEqual(EntityDataFactory.emailAlias)
      verify(mockEmailAliasService.deprovisionEmailAlias(anything())).once()
      const [inputArgs] = capture(
        mockEmailAliasService.deprovisionEmailAlias,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAliasId,
      })
    })
  })
})
