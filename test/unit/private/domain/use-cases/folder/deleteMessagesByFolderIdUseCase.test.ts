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
import { EmailFolderService } from '../../../../../../src/private/domain/entities/folder/emailFolderService'
import { DeleteMessagesByFolderIdUseCase } from '../../../../../../src/private/domain/use-cases/folder/deleteMessagesByFolderIdUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('DeleteMessagesByFolderIdUseCase Test Suite', () => {
  const mockEmailFolderService = mock<EmailFolderService>()

  let instanceUnderTest: DeleteMessagesByFolderIdUseCase

  beforeEach(() => {
    reset(mockEmailFolderService)
    instanceUnderTest = new DeleteMessagesByFolderIdUseCase(
      instance(mockEmailFolderService),
    )
    when(
      mockEmailFolderService.deleteMessagesByFolderId(anything()),
    ).thenResolve(EntityDataFactory.emailFolder.id)
  })

  describe('execute', () => {
    it('completes successfully', async () => {
      const result = await instanceUnderTest.execute({
        emailAddressId: EntityDataFactory.emailFolder.emailAddressId,
        emailFolderId: EntityDataFactory.emailFolder.id,
      })

      expect(result).toEqual(EntityDataFactory.emailFolder.id)
      verify(mockEmailFolderService.deleteMessagesByFolderId(anything())).once()
      const [inputArgs] = capture(
        mockEmailFolderService.deleteMessagesByFolderId,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId: EntityDataFactory.emailFolder.emailAddressId,
        emailFolderId: EntityDataFactory.emailFolder.id,
        hardDelete: undefined,
      })
    })

    it('passes hardDelete parameter properly', async () => {
      const result = await instanceUnderTest.execute({
        emailAddressId: EntityDataFactory.emailFolder.emailAddressId,
        emailFolderId: EntityDataFactory.emailFolder.id,
        hardDelete: false,
      })

      expect(result).toEqual(EntityDataFactory.emailFolder.id)
      verify(mockEmailFolderService.deleteMessagesByFolderId(anything())).once()
      const [inputArgs] = capture(
        mockEmailFolderService.deleteMessagesByFolderId,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId: EntityDataFactory.emailFolder.emailAddressId,
        emailFolderId: EntityDataFactory.emailFolder.id,
        hardDelete: false,
      })
    })
  })
})
