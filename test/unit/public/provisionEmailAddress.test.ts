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
import { v4 } from 'uuid'
import { SudoEmailClient } from '../../../src'
import { ProvisionEmailAccountUseCase } from '../../../src/private/domain/use-cases/account/provisionEmailAccountUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/account/provisionEmailAccountUseCase',
)
const JestMockProvisionEmailAccountUseCase =
  ProvisionEmailAccountUseCase as jest.MockedClass<
    typeof ProvisionEmailAccountUseCase
  >

describe('SudoEmailClient.provisionEmailAddress Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockProvisionEmailAccountUseCase = mock<ProvisionEmailAccountUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockProvisionEmailAccountUseCase)
    JestMockProvisionEmailAccountUseCase.mockClear()
    JestMockProvisionEmailAccountUseCase.mockImplementation(() =>
      instance(mockProvisionEmailAccountUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockProvisionEmailAccountUseCase.execute(anything())).thenResolve(
      EntityDataFactory.emailAccount,
    )
  })
  it('generates use case', async () => {
    await instanceUnderTest.provisionEmailAddress({
      emailAddress: '',
      ownershipProofToken: '',
    })
    expect(JestMockProvisionEmailAccountUseCase).toHaveBeenCalledTimes(1)
  })
  it('calls use case as expected', async () => {
    const emailAddress = v4()
    const ownershipProofToken = v4()
    await instanceUnderTest.provisionEmailAddress({
      emailAddress,
      ownershipProofToken,
    })
    verify(mockProvisionEmailAccountUseCase.execute(anything())).once()
    const [args] = capture(mockProvisionEmailAccountUseCase.execute).first()
    expect(args).toEqual({
      emailAddressEntity: { emailAddress },
      ownershipProofToken: ownershipProofToken,
    })
  })

  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.provisionEmailAddress({
        emailAddress: '',
        ownershipProofToken: '',
      }),
    ).resolves.toEqual(APIDataFactory.emailAddress)
  })
})
