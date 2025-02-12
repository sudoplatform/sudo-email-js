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
import { EmailFolderService } from '../../../../../../src/private/domain/entities/folder/emailFolderService'
import { UpdateCustomEmailFolderUseCase } from '../../../../../../src/private/domain/use-cases/folder/updateCustomEmailFolderUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('UpdateEmailFolderUseCase Test Suite', () => {
  const mockEmailFolderService = mock<EmailFolderService>()

  let instanceUnderTest: UpdateCustomEmailFolderUseCase

  beforeEach(() => {
    reset(mockEmailFolderService)
    instanceUnderTest = new UpdateCustomEmailFolderUseCase(
      instance(mockEmailFolderService),
    )
  })

  describe('execute', () => {
    it('completes successfully', async () => {
      const emailAddressId = v4()
      const emailFolderId = v4()
      const customFolderName = 'CUSTOM'
      when(
        mockEmailFolderService.updateCustomEmailFolderForEmailAddressId(
          anything(),
        ),
      ).thenResolve(EntityDataFactory.emailFolderWithCustomEmailFolderName)
      const result = await instanceUnderTest.execute({
        emailAddressId,
        emailFolderId,
        values: { customFolderName },
      })
      verify(
        mockEmailFolderService.updateCustomEmailFolderForEmailAddressId(
          anything(),
        ),
      ).once()
      const [inputArgs] = capture(
        mockEmailFolderService.updateCustomEmailFolderForEmailAddressId,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId: emailAddressId,
        emailFolderId,
        values: { customFolderName },
      })
      expect(result).toStrictEqual(
        EntityDataFactory.emailFolderWithCustomEmailFolderName,
      )
    })
  })
})
