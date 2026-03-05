/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { anything, instance, mock, reset, verify, when } from 'ts-mockito'
import { SudoEmailClient } from '../../../src'
import { VerifyExternalEmailAddressUseCase } from '../../../src/private/domain/use-cases/mask/verifyExternalEmailAddressUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/mask/verifyExternalEmailAddressUseCase',
)
const JestMockVerifyExternalEmailAddressUseCase =
  VerifyExternalEmailAddressUseCase as jest.MockedClass<
    typeof VerifyExternalEmailAddressUseCase
  >

describe('SudoEmailClient.verifyExternalEmailAddress Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockVerifyExternalEmailAddressUseCase =
    mock<VerifyExternalEmailAddressUseCase>()

  const firstInput = {
    emailAddress: 'example@domain.com',
    emailMaskId: '1',
  }

  const secondInput = { ...firstInput, verificationCode: '1' }

  const defaultValidResult = { isVerified: true }
  const defaultInvalidResult = { isVerified: false, reason: 'reason' }

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockVerifyExternalEmailAddressUseCase)
    JestMockVerifyExternalEmailAddressUseCase.mockClear()
    JestMockVerifyExternalEmailAddressUseCase.mockImplementation(() =>
      instance(mockVerifyExternalEmailAddressUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockVerifyExternalEmailAddressUseCase.execute(firstInput)).thenResolve(
      undefined,
    )
    when(
      mockVerifyExternalEmailAddressUseCase.execute(secondInput),
    ).thenResolve(defaultValidResult)
  })

  it('generates use case', async () => {
    await instanceUnderTest.verifyExternalEmailAddress(firstInput)
    expect(JestMockVerifyExternalEmailAddressUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    await instanceUnderTest.verifyExternalEmailAddress(firstInput)
    verify(mockVerifyExternalEmailAddressUseCase.execute(anything())).once()
  })

  it('returns expected result when no verification code is provided', async () => {
    const result =
      await instanceUnderTest.verifyExternalEmailAddress(firstInput)
    expect(result).toBeFalsy()
  })

  it('returns expected result when verification code is provided', async () => {
    const result =
      await instanceUnderTest.verifyExternalEmailAddress(secondInput)
    expect(result).toBeTruthy()
  })

  it('returns expected result when verification with code fails', async () => {
    when(
      mockVerifyExternalEmailAddressUseCase.execute(secondInput),
    ).thenResolve(defaultInvalidResult)
    const result =
      await instanceUnderTest.verifyExternalEmailAddress(secondInput)
    expect(result).toMatchObject(defaultInvalidResult)
  })
})
