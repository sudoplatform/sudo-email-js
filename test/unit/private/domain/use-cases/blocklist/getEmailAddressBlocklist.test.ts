/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { anything, instance, mock, reset, when } from 'ts-mockito'
import { DefaultEmailAddressBlocklistService } from '../../../../../../src/private/data/blocklist/defaultEmailAddressBlocklistService'
import { GetEmailAddressBlocklistUseCase } from '../../../../../../src/private/domain/use-cases/blocklist/getEmailAddressBlocklist'
import { v4 } from 'uuid'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { UnsealedBlockedAddress } from '../../../../../../src/public'

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
