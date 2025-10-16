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
import { EmailMaskService } from '../../../../../../src/private/domain/entities/mask/emailMaskService'
import { DeprovisionEmailMaskUseCase } from '../../../../../../src/private/domain/use-cases/mask/deprovisionEmailMaskUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('DeprovisionEmailMaskUseCase Test Suite', () => {
  const mockEmailMaskService = mock<EmailMaskService>()
  let instanceUnderTest: DeprovisionEmailMaskUseCase

  beforeEach(() => {
    reset(mockEmailMaskService)
    instanceUnderTest = new DeprovisionEmailMaskUseCase(
      instance(mockEmailMaskService),
    )
    when(mockEmailMaskService.deprovisionEmailMask(anything())).thenResolve(
      EntityDataFactory.emailMask,
    )
  })

  describe('execute', () => {
    it('deprovisions email mask successfully', async () => {
      const emailMaskId = 'testMaskId'
      const result = await instanceUnderTest.execute({
        emailMaskId,
      })

      expect(result).toStrictEqual(EntityDataFactory.emailMask)
      verify(mockEmailMaskService.deprovisionEmailMask(anything())).once()
      const [inputArgs] = capture(
        mockEmailMaskService.deprovisionEmailMask,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailMaskId,
      })
    })
  })
})
