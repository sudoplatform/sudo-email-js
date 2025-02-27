/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { anything, instance, mock, reset, when } from 'ts-mockito'
import { DefaultEmailAddressBlocklistService } from '../../../../../../src/private/data/blocklist/defaultEmailAddressBlocklistService'
import { GetEmailAddressBlocklistUseCase } from '../../../../../../src/private/domain/use-cases/blocklist/getEmailAddressBlocklist'
import { v4 } from 'uuid'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import {
  BlockedEmailAddressAction,
  UnsealedBlockedAddress,
} from '../../../../../../src/public'

describe('GetEmailAddressBlocklistUseCase Test Suite', () => {
  const mockBlockedEmailAddressService =
    mock<DefaultEmailAddressBlocklistService>()
  const mockUserClient = mock<SudoUserClient>()

  let instanceUnderTest: GetEmailAddressBlocklistUseCase
  const mockOwner = 'mockOwner'
  const blockedAddresses: UnsealedBlockedAddress[] = [
    {
      address: `spammyMcSpamface-${v4()}@spambot.com`,
      hashedBlockedValue: 'dummyHashedValue',
      status: { type: 'Completed' },
      action: BlockedEmailAddressAction.DROP,
    },
  ]

  beforeEach(() => {
    reset(mockBlockedEmailAddressService)
    when(
      mockBlockedEmailAddressService.getEmailAddressBlocklistForOwner(
        anything(),
      ),
    ).thenResolve(blockedAddresses)
    when(mockUserClient.getSubject()).thenResolve(mockOwner)

    instanceUnderTest = new GetEmailAddressBlocklistUseCase(
      instance(mockBlockedEmailAddressService),
      instance(mockUserClient),
    )
  })

  describe('execute', () => {
    it('returns successful requests correctly', async () => {
      const result = await instanceUnderTest.execute()
      expect(result).toEqual(blockedAddresses)
    })

    it('returns successful requests correctly with emailAddressId', async () => {
      const expected = blockedAddresses.map((blockedAddress) => ({
        ...blockedAddress,
        emailAddressId: 'mockEmailAddressId',
      }))
      when(
        mockBlockedEmailAddressService.getEmailAddressBlocklistForOwner(
          anything(),
        ),
      ).thenResolve(expected)
      const result = await instanceUnderTest.execute()
      expect(result).toEqual(expected)
    })

    it('returns successfully with an empty list', async () => {
      when(
        mockBlockedEmailAddressService.getEmailAddressBlocklistForOwner(
          anything(),
        ),
      ).thenResolve([])

      const result = await instanceUnderTest.execute()
      expect(result).toEqual([])
    })
  })
})
