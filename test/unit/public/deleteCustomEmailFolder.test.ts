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
import { SudoEmailClient } from '../../../src'
import { DeleteCustomEmailFolderUseCase } from '../../../src/private/domain/use-cases/folder/deleteCustomEmailFolderUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/folder/deleteCustomEmailFolderUseCase',
)
const JestMockDeleteCustomEmailFolderUseCase =
  DeleteCustomEmailFolderUseCase as jest.MockedClass<
    typeof DeleteCustomEmailFolderUseCase
  >

describe('SudoEmailClient.deleteCustomEmailFolder Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockDeleteCustomEmailFolderUseCase =
    mock<DeleteCustomEmailFolderUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockDeleteCustomEmailFolderUseCase)

    JestMockDeleteCustomEmailFolderUseCase.mockClear()

    JestMockDeleteCustomEmailFolderUseCase.mockImplementation(() =>
      instance(mockDeleteCustomEmailFolderUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockDeleteCustomEmailFolderUseCase.execute(anything())).thenResolve(
      EntityDataFactory.emailFolderWithCustomEmailFolderName,
    )
  })
  it('generates use case', async () => {
    await instanceUnderTest.deleteCustomEmailFolder({
      emailFolderId: '',
      emailAddressId: '',
    })
    expect(JestMockDeleteCustomEmailFolderUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    await instanceUnderTest.deleteCustomEmailFolder({
      emailFolderId: EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
      emailAddressId:
        EntityDataFactory.emailFolderWithCustomEmailFolderName.emailAddressId,
    })
    verify(mockDeleteCustomEmailFolderUseCase.execute(anything())).once()
    const [args] = capture(mockDeleteCustomEmailFolderUseCase.execute).first()
    expect(args).toEqual({
      emailFolderId: EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
      emailAddressId:
        EntityDataFactory.emailFolderWithCustomEmailFolderName.emailAddressId,
    })
  })

  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.deleteCustomEmailFolder({
        emailFolderId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
        emailAddressId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.emailAddressId,
      }),
    ).resolves.toEqual(APIDataFactory.emailFolderWithCustomFolderName)
  })

  it('accepts and returns undefined as a result', async () => {
    when(mockDeleteCustomEmailFolderUseCase.execute(anything())).thenResolve(
      undefined,
    )
    await expect(
      instanceUnderTest.deleteCustomEmailFolder({
        emailFolderId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
        emailAddressId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.emailAddressId,
      }),
    ).resolves.toEqual(undefined)
  })
})
