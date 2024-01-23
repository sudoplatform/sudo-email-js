/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { anything, instance, mock, reset, when } from 'ts-mockito'
import { DefaultEmailAddressBlocklistService } from '../../../../../../src/private/data/blocklist/defaultEmailAddressBlocklistService'
import { UnblockEmailAddressesUseCase } from '../../../../../../src/private/domain/use-cases/blocklist/unblockEmailAddresses'
import { v4 } from 'uuid'
import { UpdateEmailMessagesStatus } from '../../../../../../src/private/domain/entities/message/updateEmailMessagesStatus'
import {
  BlockEmailAddressesBulkUpdateOutput,
  UnblockEmailAddressesForOwnerInput,
} from '../../../../../../src/private/domain/entities/blocklist/emailAddressBlocklistService'

describe('UnblockEmailAddressesUseCase Test Suite', () => {
  const mockBlockedEmailAddressService =
    mock<DefaultEmailAddressBlocklistService>()

  let instanceUnderTest: UnblockEmailAddressesUseCase
  const mockOwner = 'mockOwner'
  const emailAddresses = [
    `spammyMcSpamface-${v4()}@spambot.com`,
    `spammyMcSpamface-${v4()}@spambot.com`,
  ]

  beforeEach(() => {
    reset(mockBlockedEmailAddressService)
    when(
      mockBlockedEmailAddressService.unblockEmailAddressesForOwner(anything()),
    ).thenResolve({ status: UpdateEmailMessagesStatus.Success })

    instanceUnderTest = new UnblockEmailAddressesUseCase(
      instance(mockBlockedEmailAddressService),
    )
  })

  describe('execute', () => {
    it('returns successful requests correctly', async () => {
      const result = await instanceUnderTest.execute({
        owner: mockOwner,
        unblockedAddresses: emailAddresses,
      })
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateEmailMessagesStatus.Success,
      })
    })

    it('returns failed requests correctly', async () => {
      when(
        mockBlockedEmailAddressService.unblockEmailAddressesForOwner(
          anything(),
        ),
      ).thenResolve({ status: UpdateEmailMessagesStatus.Failed })
      const result = await instanceUnderTest.execute({
        owner: mockOwner,
        unblockedAddresses: emailAddresses,
      })
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateEmailMessagesStatus.Failed,
      })
    })

    it('returns partial requests correctly', async () => {
      when(
        mockBlockedEmailAddressService.unblockEmailAddressesForOwner(
          anything(),
        ),
      ).thenCall((input: UnblockEmailAddressesForOwnerInput) => {
        const [first, ...rest] = input.unblockedAddresses
        return Promise.resolve({
          status: UpdateEmailMessagesStatus.Partial,
          failedAddresses: [first],
          successAddresses: rest,
        })
      })
      const result = await instanceUnderTest.execute({
        owner: mockOwner,
        unblockedAddresses: emailAddresses,
      })
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateEmailMessagesStatus.Partial,
        failedAddresses: [emailAddresses[0]],
        successAddresses: [emailAddresses[1]],
      })
    })
  })
})
