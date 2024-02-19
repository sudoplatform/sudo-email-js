/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { anything, instance, mock, reset, when } from 'ts-mockito'
import { DefaultEmailAddressBlocklistService } from '../../../../../../src/private/data/blocklist/defaultEmailAddressBlocklistService'
import { BlockEmailAddressesUseCase } from '../../../../../../src/private/domain/use-cases/blocklist/blockEmailAddresses'
import { UpdateEmailMessagesStatus } from '../../../../../../src/private/domain/entities/message/updateEmailMessagesStatus'
import { v4 } from 'uuid'
import {
  BlockEmailAddressesBulkUpdateOutput,
  BlockEmailAddressesForOwnerInput,
} from '../../../../../../src/private/domain/entities/blocklist/emailAddressBlocklistService'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { NotSignedInError } from '@sudoplatform/sudo-common'

describe('BlockEmailAddressesUseCase Test Suite', () => {
  const mockOwner = 'mockOwner'
  const mockBlockedEmailAddressService =
    mock<DefaultEmailAddressBlocklistService>()
  const mockUserClient = mock<SudoUserClient>()

  let instanceUnderTest: BlockEmailAddressesUseCase
  const emailAddresses = [
    `spammyMcSpamface-${v4()}@spambot.com`,
    `spammyMcSpamface-${v4()}@spambot.com`,
  ]

  beforeEach(() => {
    reset(mockBlockedEmailAddressService)
    when(
      mockBlockedEmailAddressService.blockEmailAddressesForOwner(anything()),
    ).thenResolve({ status: UpdateEmailMessagesStatus.Success })
    when(mockUserClient.getSubject()).thenResolve(mockOwner)

    instanceUnderTest = new BlockEmailAddressesUseCase(
      instance(mockBlockedEmailAddressService),
      instance(mockUserClient),
    )
  })

  describe('execute', () => {
    it('returns successful requests correctly', async () => {
      const result = await instanceUnderTest.execute({
        blockedAddresses: emailAddresses,
      })
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateEmailMessagesStatus.Success,
      })
    })

    it('returns failed requests correctly', async () => {
      when(
        mockBlockedEmailAddressService.blockEmailAddressesForOwner(anything()),
      ).thenResolve({ status: UpdateEmailMessagesStatus.Failed })
      const result = await instanceUnderTest.execute({
        blockedAddresses: emailAddresses,
      })
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateEmailMessagesStatus.Failed,
      })
    })

    it('returns partial requests correctly', async () => {
      when(
        mockBlockedEmailAddressService.blockEmailAddressesForOwner(anything()),
      ).thenCall((input: BlockEmailAddressesForOwnerInput) => {
        const [first, ...rest] = input.blockedAddresses
        return Promise.resolve({
          status: UpdateEmailMessagesStatus.Partial,
          failedAddresses: [first],
          successAddresses: rest,
        })
      })
      const result = await instanceUnderTest.execute({
        blockedAddresses: emailAddresses,
      })
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateEmailMessagesStatus.Partial,
        failedAddresses: [emailAddresses[0]],
        successAddresses: [emailAddresses[1]],
      })
    })

    it('throws NotSignedInError if user is not signed in', async () => {
      when(mockUserClient.getSubject()).thenResolve(undefined)
      await expect(
        instanceUnderTest.execute({
          blockedAddresses: emailAddresses,
        }),
      ).rejects.toThrow(NotSignedInError)
    })
  })
})
