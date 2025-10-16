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
import { EnableEmailMaskUseCase } from '../../../../../../src/private/domain/use-cases/mask/enableEmailMaskUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('EnableEmailMaskUseCase Test Suite', () => {
  const mockEmailMaskService = mock<EmailMaskService>()
  let instanceUnderTest: EnableEmailMaskUseCase

  beforeEach(() => {
    reset(mockEmailMaskService)
    instanceUnderTest = new EnableEmailMaskUseCase(
      instance(mockEmailMaskService),
    )
    when(mockEmailMaskService.enableEmailMask(anything())).thenResolve(
      EntityDataFactory.emailMask,
    )
  })

  describe('execute', () => {
    it('enables email mask successfully', async () => {
      const emailMaskId = 'testMaskId'
      const result = await instanceUnderTest.execute({
        emailMaskId,
      })

      expect(result).toStrictEqual(EntityDataFactory.emailMask)
      verify(mockEmailMaskService.enableEmailMask(anything())).once()
      const [inputArgs] = capture(mockEmailMaskService.enableEmailMask).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailMaskId,
      })
    })
  })
})
