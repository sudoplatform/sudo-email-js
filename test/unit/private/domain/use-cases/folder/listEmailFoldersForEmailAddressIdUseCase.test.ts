/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CachePolicy } from '@sudoplatform/sudo-common'
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
import { ListEmailFoldersForEmailAddressIdUseCase } from '../../../../../../src/private/domain/use-cases/folder/listEmailFoldersForEmailAddressIdUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('ListEmailFoldersForEmailAddressIdUseCase Test Suite', () => {
  const mockEmailFolderService = mock<EmailFolderService>()

  let instanceUnderTest: ListEmailFoldersForEmailAddressIdUseCase

  beforeEach(() => {
    reset(mockEmailFolderService)
    instanceUnderTest = new ListEmailFoldersForEmailAddressIdUseCase(
      instance(mockEmailFolderService),
    )
  })

  describe('execute', () => {
    it('completes successfully', async () => {
      const emailAddressId = v4()
      when(
        mockEmailFolderService.listEmailFoldersForEmailAddressId(anything()),
      ).thenResolve({ folders: [EntityDataFactory.emailFolder] })
      const result = await instanceUnderTest.execute({
        emailAddressId,
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(
        mockEmailFolderService.listEmailFoldersForEmailAddressId(anything()),
      ).once()
      const [inputArgs] = capture(
        mockEmailFolderService.listEmailFoldersForEmailAddressId,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId: emailAddressId,
        cachePolicy: CachePolicy.CacheOnly,
        limit: undefined,
        nextToken: undefined,
      })
      expect(result).toStrictEqual({ folders: [EntityDataFactory.emailFolder] })
    })

    it('completes successfully with empty result items', async () => {
      const emailAddressId = v4()
      when(
        mockEmailFolderService.listEmailFoldersForEmailAddressId(anything()),
      ).thenResolve({
        folders: [],
      })
      const result = await instanceUnderTest.execute({
        emailAddressId,
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(
        mockEmailFolderService.listEmailFoldersForEmailAddressId(anything()),
      ).once()
      const [inputArgs] = capture(
        mockEmailFolderService.listEmailFoldersForEmailAddressId,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressId: emailAddressId,
        cachePolicy: CachePolicy.CacheOnly,
        limit: undefined,
        nextToken: undefined,
      })
      expect(result).toStrictEqual({
        folders: [],
      })
    })
  })
})
