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
import {
  BlockedEmailAddressAction,
  BlockedEmailAddressLevel,
} from '../../../../../../src/public'
import { DefaultEmailAccountService } from '../../../../../../src/private/data/account/defaultEmailAccountService'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('BlockEmailAddressesUseCase Test Suite', () => {
  const mockOwner = 'mockOwner'
  const mockBlockedEmailAddressService =
    mock<DefaultEmailAddressBlocklistService>()
  const mockEmailAccountService = mock<DefaultEmailAccountService>()
  const mockUserClient = mock<SudoUserClient>()

  let instanceUnderTest: BlockEmailAddressesUseCase
  const emailAddresses = [
    `spammyMcSpamface-${v4()}@spambot.com`,
    `spammyMcSpamface-${v4()}@spambot.com`,
  ]

  beforeEach(() => {
    reset(mockBlockedEmailAddressService)
    reset(mockEmailAccountService)
    when(
      mockBlockedEmailAddressService.blockEmailAddressesForOwner(anything()),
    ).thenResolve({ status: UpdateEmailMessagesStatus.Success })
    when(
      mockBlockedEmailAddressService.blockEmailAddressesForEmailAddressId(
        anything(),
      ),
    ).thenResolve({ status: UpdateEmailMessagesStatus.Success })
    when(mockEmailAccountService.get(anything())).thenResolve(
      EntityDataFactory.emailAccount,
    )
    when(mockUserClient.getSubject()).thenResolve(mockOwner)

    instanceUnderTest = new BlockEmailAddressesUseCase(
      instance(mockBlockedEmailAddressService),
      instance(mockUserClient),
      instance(mockEmailAccountService),
    )
  })

  describe('execute', () => {
    it('returns successful requests correctly', async () => {
      const result = await instanceUnderTest.execute({
        blockedAddresses: emailAddresses,
        action: BlockedEmailAddressAction.DROP,
        blockLevel: BlockedEmailAddressLevel.ADDRESS,
      })
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateEmailMessagesStatus.Success,
      })
      verify(
        mockBlockedEmailAddressService.blockEmailAddressesForOwner(anything()),
      ).once()
      verify(
        mockBlockedEmailAddressService.blockEmailAddressesForEmailAddressId(
          anything(),
        ),
      ).never()
      verify(mockEmailAccountService.get(anything())).never()
      const [blockArgs] = capture(
        mockBlockedEmailAddressService.blockEmailAddressesForOwner,
      ).first()
      expect(blockArgs).toStrictEqual<typeof blockArgs>({
        blockedAddresses: emailAddresses,
        action: BlockedEmailAddressAction.DROP,
        blockLevel: BlockedEmailAddressLevel.ADDRESS,
        owner: mockOwner,
      })
    })

    it('handles emailAddressId input properly', async () => {
      const result = await instanceUnderTest.execute({
        blockedAddresses: emailAddresses,
        action: BlockedEmailAddressAction.DROP,
        emailAddressId: 'mockEmailAddressId',
        blockLevel: BlockedEmailAddressLevel.ADDRESS,
      })
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateEmailMessagesStatus.Success,
      })
      verify(
        mockBlockedEmailAddressService.blockEmailAddressesForOwner(anything()),
      ).never()
      verify(
        mockBlockedEmailAddressService.blockEmailAddressesForEmailAddressId(
          anything(),
        ),
      ).once()
      verify(mockEmailAccountService.get(anything())).once()
      const [blockArgs] = capture(
        mockBlockedEmailAddressService.blockEmailAddressesForEmailAddressId,
      ).first()
      expect(blockArgs).toStrictEqual<typeof blockArgs>({
        blockedAddresses: emailAddresses,
        action: BlockedEmailAddressAction.DROP,
        blockLevel: BlockedEmailAddressLevel.ADDRESS,
        owner: mockOwner,
        emailAddressId: 'mockEmailAddressId',
      })
    })

    it('handles blockLevel DOMAIN input properly', async () => {
      const result = await instanceUnderTest.execute({
        blockedAddresses: emailAddresses,
        action: BlockedEmailAddressAction.DROP,
        blockLevel: BlockedEmailAddressLevel.DOMAIN,
      })
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateEmailMessagesStatus.Success,
      })
      verify(
        mockBlockedEmailAddressService.blockEmailAddressesForOwner(anything()),
      ).once()
      verify(
        mockBlockedEmailAddressService.blockEmailAddressesForEmailAddressId(
          anything(),
        ),
      ).never()
      verify(mockEmailAccountService.get(anything())).never()
      const [blockArgs] = capture(
        mockBlockedEmailAddressService.blockEmailAddressesForOwner,
      ).first()
      expect(blockArgs).toStrictEqual<typeof blockArgs>({
        blockedAddresses: emailAddresses,
        action: BlockedEmailAddressAction.DROP,
        blockLevel: BlockedEmailAddressLevel.DOMAIN,
        owner: mockOwner,
      })
    })

    it('handles action SPAM input properly', async () => {
      const result = await instanceUnderTest.execute({
        blockedAddresses: emailAddresses,
        action: BlockedEmailAddressAction.SPAM,
        blockLevel: BlockedEmailAddressLevel.ADDRESS,
      })
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateEmailMessagesStatus.Success,
      })
      verify(
        mockBlockedEmailAddressService.blockEmailAddressesForOwner(anything()),
      ).once()
      verify(
        mockBlockedEmailAddressService.blockEmailAddressesForEmailAddressId(
          anything(),
        ),
      ).never()
      verify(mockEmailAccountService.get(anything())).never()
      const [blockArgs] = capture(
        mockBlockedEmailAddressService.blockEmailAddressesForOwner,
      ).first()
      expect(blockArgs).toStrictEqual<typeof blockArgs>({
        blockedAddresses: emailAddresses,
        action: BlockedEmailAddressAction.SPAM,
        blockLevel: BlockedEmailAddressLevel.ADDRESS,
        owner: mockOwner,
      })
    })

    it('returns failed requests correctly', async () => {
      when(
        mockBlockedEmailAddressService.blockEmailAddressesForOwner(anything()),
      ).thenResolve({ status: UpdateEmailMessagesStatus.Failed })
      const result = await instanceUnderTest.execute({
        blockedAddresses: emailAddresses,
        action: BlockedEmailAddressAction.DROP,
        blockLevel: BlockedEmailAddressLevel.ADDRESS,
      })
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateEmailMessagesStatus.Failed,
      })
      verify(
        mockBlockedEmailAddressService.blockEmailAddressesForOwner(anything()),
      ).once()
      verify(
        mockBlockedEmailAddressService.blockEmailAddressesForEmailAddressId(
          anything(),
        ),
      ).never()
      verify(mockEmailAccountService.get(anything())).never()
      const [blockArgs] = capture(
        mockBlockedEmailAddressService.blockEmailAddressesForOwner,
      ).first()
      expect(blockArgs).toStrictEqual<typeof blockArgs>({
        blockedAddresses: emailAddresses,
        action: BlockedEmailAddressAction.DROP,
        blockLevel: BlockedEmailAddressLevel.ADDRESS,
        owner: mockOwner,
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
        action: BlockedEmailAddressAction.DROP,
        blockLevel: BlockedEmailAddressLevel.ADDRESS,
      })
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateEmailMessagesStatus.Partial,
        failedAddresses: [emailAddresses[0]],
        successAddresses: [emailAddresses[1]],
      })
      verify(
        mockBlockedEmailAddressService.blockEmailAddressesForOwner(anything()),
      ).once()
      verify(
        mockBlockedEmailAddressService.blockEmailAddressesForEmailAddressId(
          anything(),
        ),
      ).never()
      verify(mockEmailAccountService.get(anything())).never()
      const [blockArgs] = capture(
        mockBlockedEmailAddressService.blockEmailAddressesForOwner,
      ).first()
      expect(blockArgs).toStrictEqual<typeof blockArgs>({
        blockedAddresses: emailAddresses,
        action: BlockedEmailAddressAction.DROP,
        blockLevel: BlockedEmailAddressLevel.ADDRESS,
        owner: mockOwner,
      })
    })

    it('throws NotSignedInError if user is not signed in', async () => {
      when(mockUserClient.getSubject()).thenResolve(undefined)
      await expect(
        instanceUnderTest.execute({
          blockedAddresses: emailAddresses,
          action: BlockedEmailAddressAction.DROP,
          blockLevel: BlockedEmailAddressLevel.ADDRESS,
        }),
      ).rejects.toThrow(NotSignedInError)
      verify(
        mockBlockedEmailAddressService.blockEmailAddressesForOwner(anything()),
      ).never()
      verify(
        mockBlockedEmailAddressService.blockEmailAddressesForEmailAddressId(
          anything(),
        ),
      ).never()
      verify(mockEmailAccountService.get(anything())).never()
    })
  })
})
