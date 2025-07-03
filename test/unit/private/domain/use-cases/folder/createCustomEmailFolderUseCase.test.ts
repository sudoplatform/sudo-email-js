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
import { CreateCustomEmailFolderUseCase } from '../../../../../../src/private/domain/use-cases/folder/createCustomEmailFolderUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('CreateEmailFolderUseCase Test Suite', () => {
  const mockEmailFolderService = mock<EmailFolderService>()

  let instanceUnderTest: CreateCustomEmailFolderUseCase

  beforeEach(() => {
    reset(mockEmailFolderService)
    instanceUnderTest = new CreateCustomEmailFolderUseCase(
      instance(mockEmailFolderService),
    )
  })

  describe('execute', () => {
    it('completes successfully', async () => {
      const emailAddressId = v4()
      const customFolderName = 'CUSTOM'
      when(
        mockEmailFolderService.createCustomEmailFolderForEmailAddressId(
          anything(),
        ),
      ).thenResolve(EntityDataFactory.emailFolderWithCustomEmailFolderName)
      const result = await instanceUnderTest.execute({
        emailAddressId,
        customFolderName,
      })
      verify(
        mockEmailFolderService.createCustomEmailFolderForEmailAddressId(
          anything(),
        ),
      ).once()
      const [inputArgs] = capture(
        mockEmailFolderService.createCustomEmailFolderForEmailAddressId,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId: emailAddressId,
        customFolderName: customFolderName,
        allowSymmetricKeyGeneration: true,
      })
      expect(result).toStrictEqual(
        EntityDataFactory.emailFolderWithCustomEmailFolderName,
      )
    })

    it('passes allowSymmetricKeyGeneration properly', async () => {
      const emailAddressId = v4()
      const customFolderName = 'CUSTOM'
      when(
        mockEmailFolderService.createCustomEmailFolderForEmailAddressId(
          anything(),
        ),
      ).thenResolve(EntityDataFactory.emailFolderWithCustomEmailFolderName)
      await instanceUnderTest.execute({
        emailAddressId,
        customFolderName,
        allowSymmetricKeyGeneration: false,
      })
      verify(
        mockEmailFolderService.createCustomEmailFolderForEmailAddressId(
          anything(),
        ),
      ).once()
      const [inputArgs] = capture(
        mockEmailFolderService.createCustomEmailFolderForEmailAddressId,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId: emailAddressId,
        customFolderName: customFolderName,
        allowSymmetricKeyGeneration: false,
      })
    })
  })
})
