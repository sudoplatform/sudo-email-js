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
import { DeleteCustomEmailFolderUseCase } from '../../../../../../src/private/domain/use-cases/folder/deleteCustomEmailFolderUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('DeleteCustomEmailFolderUseCase Test Suite', () => {
  const mockEmailFolderService = mock<EmailFolderService>()

  let instanceUnderTest: DeleteCustomEmailFolderUseCase

  beforeEach(() => {
    reset(mockEmailFolderService)
    instanceUnderTest = new DeleteCustomEmailFolderUseCase(
      instance(mockEmailFolderService),
    )
    when(
      mockEmailFolderService.deleteCustomEmailFolderForEmailAddressId(
        anything(),
      ),
    ).thenResolve(EntityDataFactory.emailFolderWithCustomEmailFolderName)
  })

  describe('execute', () => {
    it('returns deleted folder on success', async () => {
      const result = await instanceUnderTest.execute({
        emailFolderId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
        emailAddressId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.emailAddressId,
      })

      verify(
        mockEmailFolderService.deleteCustomEmailFolderForEmailAddressId(
          anything(),
        ),
      ).once()
      const [inputArgs] = capture(
        mockEmailFolderService.deleteCustomEmailFolderForEmailAddressId,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailFolderId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
        emailAddressId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.emailAddressId,
      })
      expect(result).toStrictEqual(
        EntityDataFactory.emailFolderWithCustomEmailFolderName,
      )
    })

    it('accepts and returns undefined from service', async () => {
      when(
        mockEmailFolderService.deleteCustomEmailFolderForEmailAddressId(
          anything(),
        ),
      ).thenResolve(undefined)

      const result = await instanceUnderTest.execute({
        emailFolderId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
        emailAddressId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.emailAddressId,
      })

      verify(
        mockEmailFolderService.deleteCustomEmailFolderForEmailAddressId(
          anything(),
        ),
      ).once()
      const [inputArgs] = capture(
        mockEmailFolderService.deleteCustomEmailFolderForEmailAddressId,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailFolderId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.id,
        emailAddressId:
          EntityDataFactory.emailFolderWithCustomEmailFolderName.emailAddressId,
      })
      expect(result).toStrictEqual(undefined)
    })
  })
})
