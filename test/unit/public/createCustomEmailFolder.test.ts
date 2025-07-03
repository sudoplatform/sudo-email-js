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
import { CreateCustomEmailFolderUseCase } from '../../../src/private/domain/use-cases/folder/createCustomEmailFolderUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/folder/createCustomEmailFolderUseCase',
)
const JestMockCreateCustomEmailFolderUseCase =
  CreateCustomEmailFolderUseCase as jest.MockedClass<
    typeof CreateCustomEmailFolderUseCase
  >

describe('SudoEmailClient.createCustomEmailFolder Test Suite', () => {
  let instanceUnderTest: SudoEmailClient

  const mockCreateCustomEmailFolderUseCase =
    mock<CreateCustomEmailFolderUseCase>()

  beforeEach(() => {
    const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
    sudoEmailClientTestsBase.resetMocks()
    reset(mockCreateCustomEmailFolderUseCase)

    JestMockCreateCustomEmailFolderUseCase.mockClear()

    JestMockCreateCustomEmailFolderUseCase.mockImplementation(() =>
      instance(mockCreateCustomEmailFolderUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockCreateCustomEmailFolderUseCase.execute(anything())).thenResolve(
      EntityDataFactory.emailFolderWithCustomEmailFolderName,
    )
  })

  it('generates use case', async () => {
    await instanceUnderTest.createCustomEmailFolder({
      emailAddressId: '',
      customFolderName: '',
    })
    expect(JestMockCreateCustomEmailFolderUseCase).toHaveBeenCalledTimes(1)
  })
  it('calls use case as expected', async () => {
    const emailAddressId = v4()
    const customFolderName = 'CUSTOM'

    await instanceUnderTest.createCustomEmailFolder({
      emailAddressId,
      customFolderName,
    })
    verify(mockCreateCustomEmailFolderUseCase.execute(anything())).once()
    const [args] = capture(mockCreateCustomEmailFolderUseCase.execute).first()
    expect(args).toEqual<typeof args>({
      emailAddressId: emailAddressId,
      customFolderName: customFolderName,
      allowSymmetricKeyGeneration: true,
    })
  })

  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.createCustomEmailFolder({
        emailAddressId: '',
        customFolderName: '',
      }),
    ).resolves.toEqual(APIDataFactory.emailFolderWithCustomFolderName)
  })

  it('passes allowSymmetricKeyGeneration properly', async () => {
    const emailAddressId = v4()
    const customFolderName = 'CUSTOM'

    await instanceUnderTest.createCustomEmailFolder({
      emailAddressId,
      customFolderName,
      allowSymmetricKeyGeneration: false,
    })
    verify(mockCreateCustomEmailFolderUseCase.execute(anything())).once()
    const [args] = capture(mockCreateCustomEmailFolderUseCase.execute).first()
    expect(args).toEqual<typeof args>({
      emailAddressId: emailAddressId,
      customFolderName: customFolderName,
      allowSymmetricKeyGeneration: false,
    })
  })
})
