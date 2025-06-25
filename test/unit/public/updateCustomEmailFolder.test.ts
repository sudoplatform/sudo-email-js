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
import { UpdateCustomEmailFolderUseCase } from '../../../src/private/domain/use-cases/folder/updateCustomEmailFolderUseCase'
import { APIDataFactory } from '../data-factory/api'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/folder/updateCustomEmailFolderUseCase',
)
const JestMockUpdateCustomEmailFolderUseCase =
  UpdateCustomEmailFolderUseCase as jest.MockedClass<
    typeof UpdateCustomEmailFolderUseCase
  >

describe('SudoEmailClient.updateCustomEmailFolder Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockUpdateCustomEmailFolderUseCase =
    mock<UpdateCustomEmailFolderUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockUpdateCustomEmailFolderUseCase)

    JestMockUpdateCustomEmailFolderUseCase.mockClear()

    JestMockUpdateCustomEmailFolderUseCase.mockImplementation(() =>
      instance(mockUpdateCustomEmailFolderUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockUpdateCustomEmailFolderUseCase.execute(anything())).thenResolve(
      EntityDataFactory.emailFolderWithCustomEmailFolderName,
    )
  })

  it('generates use case', async () => {
    await instanceUnderTest.updateCustomEmailFolder({
      emailFolderId: '',
      emailAddressId: '',
      values: { customFolderName: 'CUSTOM' },
    })
    expect(JestMockUpdateCustomEmailFolderUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    await instanceUnderTest.updateCustomEmailFolder({
      emailFolderId: EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
      emailAddressId:
        EntityDataFactory.emailFolderWithCustomEmailFolderName.emailAddressId,
      values: { customFolderName: 'CUSTOM' },
    })
    verify(mockUpdateCustomEmailFolderUseCase.execute(anything())).once()
    const [args] = capture(mockUpdateCustomEmailFolderUseCase.execute).first()
    expect(args).toEqual({
      emailFolderId: EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
      emailAddressId:
        EntityDataFactory.emailFolderWithCustomEmailFolderName.emailAddressId,
      values: { customFolderName: 'CUSTOM' },
    })
  })

  it('returns expected result', async () => {
    await expect(
      instanceUnderTest.updateCustomEmailFolder({
        emailFolderId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
        emailAddressId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.emailAddressId,
        values: { customFolderName: 'CUSTOM' },
      }),
    ).resolves.toEqual(APIDataFactory.emailFolderWithCustomFolderName)
  })
})
