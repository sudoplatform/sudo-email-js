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
import { DeleteMessagesByFolderIdUseCase } from '../../../src/private/domain/use-cases/folder/deleteMessagesByFolderIdUseCase'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/folder/deleteMessagesByFolderIdUseCase',
)
const JestMockDeleteMessagesByFolderIdUseCase =
  DeleteMessagesByFolderIdUseCase as jest.MockedClass<
    typeof DeleteMessagesByFolderIdUseCase
  >

describe('SudoEmailClient.deleteMessagesForFolderId Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockDeleteMessagesByFolderIdUseCase =
    mock<DeleteMessagesByFolderIdUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockDeleteMessagesByFolderIdUseCase)
    JestMockDeleteMessagesByFolderIdUseCase.mockClear()

    JestMockDeleteMessagesByFolderIdUseCase.mockImplementation(() =>
      instance(mockDeleteMessagesByFolderIdUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockDeleteMessagesByFolderIdUseCase.execute(anything())).thenResolve(
      EntityDataFactory.emailFolder.id,
    )
  })
  it('generates use case', async () => {
    await instanceUnderTest.deleteMessagesForFolderId({
      emailAddressId: EntityDataFactory.emailFolder.emailAddressId,
      emailFolderId: EntityDataFactory.emailFolder.id,
    })
    expect(JestMockDeleteMessagesByFolderIdUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    await expect(
      instanceUnderTest.deleteMessagesForFolderId({
        emailAddressId: EntityDataFactory.emailFolder.emailAddressId,
        emailFolderId: EntityDataFactory.emailFolder.id,
      }),
    ).resolves.toEqual(EntityDataFactory.emailFolder.id)
    verify(mockDeleteMessagesByFolderIdUseCase.execute(anything())).once()
    const [inputArgs] = capture(
      mockDeleteMessagesByFolderIdUseCase.execute,
    ).first()
    expect(inputArgs).toStrictEqual<typeof inputArgs>({
      emailAddressId: EntityDataFactory.emailFolder.emailAddressId,
      emailFolderId: EntityDataFactory.emailFolder.id,
      hardDelete: undefined,
    })
  })

  it('passes hardDelete parameter properly', async () => {
    await expect(
      instanceUnderTest.deleteMessagesForFolderId({
        emailAddressId: EntityDataFactory.emailFolder.emailAddressId,
        emailFolderId: EntityDataFactory.emailFolder.id,
        hardDelete: false,
      }),
    ).resolves.toEqual(EntityDataFactory.emailFolder.id)
    verify(mockDeleteMessagesByFolderIdUseCase.execute(anything())).once()
    const [inputArgs] = capture(
      mockDeleteMessagesByFolderIdUseCase.execute,
    ).first()
    expect(inputArgs).toStrictEqual<typeof inputArgs>({
      emailAddressId: EntityDataFactory.emailFolder.emailAddressId,
      emailFolderId: EntityDataFactory.emailFolder.id,
      hardDelete: false,
    })
  })
})
