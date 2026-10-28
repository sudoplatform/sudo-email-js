/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { anything, instance, mock, reset, verify, when } from 'ts-mockito'
import { EmailAliasService } from '../../../../../../src/private/domain/entities/alias/emailAliasService'
import { VerifyExternalEmailAddressUseCase } from '../../../../../../src/private/domain/use-cases/alias/verifyExternalEmailAddressUseCase'

describe('VerifyExternalEmailAddressUseCase Test Suite', () => {
  const mockEmailAliasService = mock<EmailAliasService>()
  let instanceUnderTest: VerifyExternalEmailAddressUseCase

  const firstInput = {
    emailAddress: 'example@domain.com',
    emailAliasId: '1',
  }

  const secondInput = { ...firstInput, verificationCode: '1' }

  beforeEach(() => {
    reset(mockEmailAliasService)
    instanceUnderTest = new VerifyExternalEmailAddressUseCase(
      instance(mockEmailAliasService),
    )
    when(
      mockEmailAliasService.verifyExternalEmailAddress(firstInput),
    ).thenResolve(undefined)

    when(
      mockEmailAliasService.verifyExternalEmailAddress(secondInput),
    ).thenResolve({ isVerified: true })
  })

  it('correctly verifies given a correct verification code', async () => {
    const initialResult = await instanceUnderTest.execute(firstInput)

    expect(initialResult).toBeFalsy
    verify(mockEmailAliasService.verifyExternalEmailAddress(anything())).once()

    const verifiedResult = await instanceUnderTest.execute(secondInput)

    expect(verifiedResult).toBeTruthy()
    expect(verifiedResult?.isVerified).toBeTruthy()
    verify(mockEmailAliasService.verifyExternalEmailAddress(anything())).twice()
  })
})
