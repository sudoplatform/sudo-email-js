/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { anything, instance, mock, reset, when } from 'ts-mockito'
import { DefaultEmailAddressBlocklistService } from '../../../../../../src/private/data/blocklist/defaultEmailAddressBlocklistService'
import { GetEmailAddressBlocklistUseCase } from '../../../../../../src/private/domain/use-cases/blocklist/getEmailAddressBlocklist'
import { v4 } from 'uuid'

describe('GetEmailAddressBlocklistUseCase Test Suite', () => {
  const mockBlockedEmailAddressService =
    mock<DefaultEmailAddressBlocklistService>()

  let instanceUnderTest: GetEmailAddressBlocklistUseCase
  const mockOwner = 'mockOwner'
  const blockedAddresses = [`spammyMcSpamface-${v4()}@spambot.com`]

  beforeEach(() => {
    reset(mockBlockedEmailAddressService)
    when(
      mockBlockedEmailAddressService.getEmailAddressBlocklistForOwner(
        anything(),
      ),
    ).thenResolve(blockedAddresses)

    instanceUnderTest = new GetEmailAddressBlocklistUseCase(
      instance(mockBlockedEmailAddressService),
    )
  })

  describe('execute', () => {
    it('returns successful requests correctly', async () => {
      const result = await instanceUnderTest.execute({
        owner: mockOwner,
      })
      expect(result).toEqual(blockedAddresses)
    })

    it('returns successfully with an empty list', async () => {
      when(
        mockBlockedEmailAddressService.getEmailAddressBlocklistForOwner(
          anything(),
        ),
      ).thenResolve([])

      const result = await instanceUnderTest.execute({
        owner: mockOwner,
      })
      expect(result).toEqual([])
    })
  })
})
