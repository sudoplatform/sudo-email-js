/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
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
import { ApiClient } from '../../../../../src/private/data/common/apiClient'
import { DefaultEmailFolderService } from '../../../../../src/private/data/folder/defaultEmailFolderService'
import { EntityDataFactory } from '../../../data-factory/entity'
import { GraphQLDataFactory } from '../../../data-factory/graphQL'

describe('DefaultEmailFolderService Test Suite', () => {
  const mockAppSync = mock<ApiClient>()
  let instanceUnderTest: DefaultEmailFolderService

  beforeEach(() => {
    reset(mockAppSync)
    instanceUnderTest = new DefaultEmailFolderService(instance(mockAppSync))
    when(
      mockAppSync.listEmailFoldersForEmailAddressId(
        anything(),
        anything(),
        anything(),
        anything(),
      ),
    ).thenResolve(GraphQLDataFactory.emailFolderConnection)
  })

  describe('listEmailFoldersForEmailAddressId', () => {
    it('calls appSync correctly', async () => {
      const emailAddressId = v4()
      await instanceUnderTest.listEmailFoldersForEmailAddressId({
        emailAddressId,
        cachePolicy: CachePolicy.CacheOnly,
      })
      verify(
        mockAppSync.listEmailFoldersForEmailAddressId(
          anything(),
          anything(),
          anything(),
          anything(),
        ),
      ).once()
      const [inputArgs, policyArg] = capture(
        mockAppSync.listEmailFoldersForEmailAddressId,
      ).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>(emailAddressId)
      expect(policyArg).toStrictEqual<typeof policyArg>('cache-only')
    })

    it.each`
      cachePolicy               | test
      ${CachePolicy.CacheOnly}  | ${'cache'}
      ${CachePolicy.RemoteOnly} | ${'remote'}
    `(
      'returns transformed result when calling $test',
      async ({ cachePolicy }) => {
        const emailAddressId = v4()
        await expect(
          instanceUnderTest.listEmailFoldersForEmailAddressId({
            emailAddressId,
            cachePolicy,
          }),
        ).resolves.toStrictEqual({
          folders: [EntityDataFactory.emailFolder],
          nextToken: undefined,
        })
        verify(
          mockAppSync.listEmailFoldersForEmailAddressId(
            anything(),
            anything(),
            anything(),
            anything(),
          ),
        ).once()
      },
    )
  })
})
