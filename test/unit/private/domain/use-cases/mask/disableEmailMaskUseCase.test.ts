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
import { DisableEmailMaskUseCase } from '../../../../../../src/private/domain/use-cases/mask/disableEmailMaskUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('DisableEmailMaskUseCase Test Suite', () => {
  const mockEmailMaskService = mock<EmailMaskService>()
  let instanceUnderTest: DisableEmailMaskUseCase

  beforeEach(() => {
    reset(mockEmailMaskService)
    instanceUnderTest = new DisableEmailMaskUseCase(
      instance(mockEmailMaskService),
    )
    when(mockEmailMaskService.disableEmailMask(anything())).thenResolve(
      EntityDataFactory.emailMask,
    )
  })

  describe('execute', () => {
    it('disables email mask successfully', async () => {
      const emailMaskId = 'testMaskId'
      const result = await instanceUnderTest.execute({
        emailMaskId,
      })

      expect(result).toStrictEqual(EntityDataFactory.emailMask)
      verify(mockEmailMaskService.disableEmailMask(anything())).once()
      const [inputArgs] = capture(mockEmailMaskService.disableEmailMask).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailMaskId,
      })
    })
  })
})
