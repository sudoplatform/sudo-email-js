/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { anything, instance, mock, reset, when } from 'ts-mockito'
import { DefaultEmailAddressBlocklistService } from '../../../../../../src/private/data/blocklist/defaultEmailAddressBlocklistService'
import { UnblockEmailAddressesUseCase } from '../../../../../../src/private/domain/use-cases/blocklist/unblockEmailAddresses'
import { v4 } from 'uuid'
import {
  BlockEmailAddressesBulkUpdateOutput,
  UnblockEmailAddressesForOwnerInput,
} from '../../../../../../src/private/domain/entities/blocklist/emailAddressBlocklistService'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { NotSignedInError } from '@sudoplatform/sudo-common'
import { UpdateBlockedAddressesStatus } from '../../../../../../src/private/domain/entities/blocklist/updateBlockedAddressesStatus'

describe('UnblockEmailAddressesUseCase Test Suite', () => {
  const mockOwner = 'mockOwner'
  const mockBlockedEmailAddressService =
    mock<DefaultEmailAddressBlocklistService>()
  const mockUserClient = mock<SudoUserClient>()

  let instanceUnderTest: UnblockEmailAddressesUseCase
  const emailAddresses = [
    `spammyMcSpamface-${v4()}@spambot.com`,
    `spammyMcSpamface-${v4()}@spambot.com`,
  ]

  beforeEach(() => {
    reset(mockBlockedEmailAddressService)
    when(
      mockBlockedEmailAddressService.unblockEmailAddressesForOwner(anything()),
    ).thenResolve({ status: UpdateBlockedAddressesStatus.Success })
    when(mockUserClient.getSubject()).thenResolve(mockOwner)

    instanceUnderTest = new UnblockEmailAddressesUseCase(
      instance(mockBlockedEmailAddressService),
      instance(mockUserClient),
    )
  })

  describe('execute', () => {
    it('returns successful requests correctly', async () => {
      const result = await instanceUnderTest.execute({
        unblockedAddresses: emailAddresses,
      })
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateBlockedAddressesStatus.Success,
      })
    })

    it('returns failed requests correctly', async () => {
      when(
        mockBlockedEmailAddressService.unblockEmailAddressesForOwner(
          anything(),
        ),
      ).thenResolve({ status: UpdateBlockedAddressesStatus.Failed })
      const result = await instanceUnderTest.execute({
        unblockedAddresses: emailAddresses,
      })
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateBlockedAddressesStatus.Failed,
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
          status: UpdateBlockedAddressesStatus.Partial,
          failedAddresses: [first],
          successAddresses: rest,
        })
      })
      const result = await instanceUnderTest.execute({
        unblockedAddresses: emailAddresses,
      })
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateBlockedAddressesStatus.Partial,
        failedAddresses: [emailAddresses[0]],
        successAddresses: [emailAddresses[1]],
      })
    })
    it('throws NotSignedInError if user is not signed in', async () => {
      when(mockUserClient.getSubject()).thenResolve(undefined)
      await expect(
        instanceUnderTest.execute({
          unblockedAddresses: emailAddresses,
        }),
      ).rejects.toThrow(NotSignedInError)
    })
  })
})
