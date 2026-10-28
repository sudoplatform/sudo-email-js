/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  anything,
  deepEqual,
  instance,
  mock,
  reset,
  verify,
  when,
} from 'ts-mockito'
import { MockedClass } from 'vitest'
import { SudoEmailClient } from '../../../src'
import { VerifyExternalEmailAddressUseCase } from '../../../src/private/domain/use-cases/alias/verifyExternalEmailAddressUseCase'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock(
  '../../../src/private/domain/use-cases/alias/verifyExternalEmailAddressUseCase',
)
const ViMockVerifyExternalEmailAddressUseCase =
  VerifyExternalEmailAddressUseCase as MockedClass<
    typeof VerifyExternalEmailAddressUseCase
  >

describe('SudoEmailClient.verifyExternalEmailAddress Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockVerifyExternalEmailAddressUseCase =
    mock<VerifyExternalEmailAddressUseCase>()

  const firstInput = {
    emailAddress: 'example@domain.com',
    emailAliasId: '1',
  }

  const secondInput = { ...firstInput, verificationCode: '1' }

  const defaultValidResult = { isVerified: true }
  const defaultInvalidResult = { isVerified: false, reason: 'reason' }

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockVerifyExternalEmailAddressUseCase)
    ViMockVerifyExternalEmailAddressUseCase.mockClear()
    ViMockVerifyExternalEmailAddressUseCase.mockImplementation(function () {
      return instance(mockVerifyExternalEmailAddressUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(
      mockVerifyExternalEmailAddressUseCase.execute(
        deepEqual({
          emailAddress: firstInput.emailAddress,
          emailAliasId: firstInput.emailAliasId,
          verificationCode: undefined,
        }),
      ),
    ).thenResolve(undefined)
    when(
      mockVerifyExternalEmailAddressUseCase.execute(
        deepEqual({
          emailAddress: secondInput.emailAddress,
          emailAliasId: secondInput.emailAliasId,
          verificationCode: secondInput.verificationCode,
        }),
      ),
    ).thenResolve(defaultValidResult)
  })

  it('generates use case', async () => {
    await instanceUnderTest.verifyExternalEmailAddress(firstInput)
    expect(ViMockVerifyExternalEmailAddressUseCase).toHaveBeenCalledTimes(1)
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
      mockVerifyExternalEmailAddressUseCase.execute(
        deepEqual({
          emailAddress: secondInput.emailAddress,
          emailAliasId: secondInput.emailAliasId,
          verificationCode: secondInput.verificationCode,
        }),
      ),
    ).thenResolve(defaultInvalidResult)
    const result =
      await instanceUnderTest.verifyExternalEmailAddress(secondInput)
    expect(result).toMatchObject(defaultInvalidResult)
  })
})
