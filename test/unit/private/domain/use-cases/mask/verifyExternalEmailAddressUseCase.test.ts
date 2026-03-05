/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { anything, instance, mock, reset, verify, when } from 'ts-mockito'
import { EmailMaskService } from '../../../../../../src/private/domain/entities/mask/emailMaskService'
import { VerifyExternalEmailAddressUseCase } from '../../../../../../src/private/domain/use-cases/mask/verifyExternalEmailAddressUseCase'

describe('VerifyExternalEmailAddressUseCase Test Suite', () => {
  const mockEmailMaskService = mock<EmailMaskService>()
  let instanceUnderTest: VerifyExternalEmailAddressUseCase

  const firstInput = {
    emailAddress: 'example@domain.com',
    emailMaskId: '1',
  }

  const secondInput = { ...firstInput, verificationCode: '1' }

  beforeEach(() => {
    reset(mockEmailMaskService)
    instanceUnderTest = new VerifyExternalEmailAddressUseCase(
      instance(mockEmailMaskService),
    )
    when(
      mockEmailMaskService.verifyExternalEmailAddress(firstInput),
    ).thenResolve(undefined)

    when(
      mockEmailMaskService.verifyExternalEmailAddress(secondInput),
    ).thenResolve({ isVerified: true })
  })

  it('correctly verifies given a correct verification code', async () => {
    const initialResult = await instanceUnderTest.execute(firstInput)

    expect(initialResult).toBeFalsy
    verify(mockEmailMaskService.verifyExternalEmailAddress(anything())).once()

    const verifiedResult = await instanceUnderTest.execute(secondInput)

    expect(verifiedResult).toBeTruthy()
    expect(verifiedResult?.isVerified).toBeTruthy()
    verify(mockEmailMaskService.verifyExternalEmailAddress(anything())).twice()
  })
})
