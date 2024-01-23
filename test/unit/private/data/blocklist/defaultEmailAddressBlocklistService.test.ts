/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
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
import { ApiClient } from '../../../../../src/private/data/common/apiClient'
import { DeviceKeyWorker } from '../../../../../src/private/data/common/deviceKeyWorker'
import { DefaultEmailAddressBlocklistService } from '../../../../../src/private/data/blocklist/defaultEmailAddressBlocklistService'
import {
  BlockEmailAddressesBulkUpdateOutput,
  BlockEmailAddressesForOwnerInput,
  EmailAddressBlocklistService,
  UnblockEmailAddressesForOwnerInput,
} from '../../../../../src/private/domain/entities/blocklist/emailAddressBlocklistService'
import { GraphQLDataFactory } from '../../../data-factory/graphQL'
import { v4 } from 'uuid'
import { UpdateEmailMessagesStatus } from '../../../../../src/private/domain/entities/message/updateEmailMessagesStatus'
import {
  BlockEmailAddressesInput,
  UnblockEmailAddressesInput,
} from '../../../../../src/gen/graphqlTypes'
import { InvalidArgumentError } from '../../../../../src/public'

describe('DefaultEmailAddressBlocklist Test Suite', () => {
  const mockAppSync = mock<ApiClient>()
  const mockDeviceKeyWorker = mock<DeviceKeyWorker>()
  let instanceUnderTest: EmailAddressBlocklistService
  const mockOwner = 'mockOwner'

  beforeEach(() => {
    reset(mockAppSync)
    reset(mockDeviceKeyWorker)
    instanceUnderTest = new DefaultEmailAddressBlocklistService(
      instance(mockAppSync),
      instance(mockDeviceKeyWorker),
    )

    when(mockAppSync.blockEmailAddresses(anything())).thenResolve(
      GraphQLDataFactory.blockedAddressUpdateResult,
    )
    when(mockAppSync.unblockEmailAddresses(anything())).thenResolve(
      GraphQLDataFactory.blockedAddressUpdateResult,
    )
    when(mockAppSync.getEmailAddressBlocklist(anything())).thenResolve(
      GraphQLDataFactory.getEmailAddressBlocklistResult,
    )
    when(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).thenResolve('keyId')
  })

  describe('blockEmailAddresses', () => {
    it('call appSync correctly', async () => {
      const input: BlockEmailAddressesForOwnerInput = {
        owner: mockOwner,
        blockedAddresses: [`spammyMcSpamface-${v4()}@spambot.com`],
      }
      await instanceUnderTest.blockEmailAddressesForOwner(input)
      verify(mockAppSync.blockEmailAddresses(anything())).once()
      const [inputArgs] = capture(mockAppSync.blockEmailAddresses).first()
      expect(inputArgs.owner).toEqual(input.owner)
      expect(inputArgs.blockedAddresses).toHaveLength(
        input.blockedAddresses.length,
      )
    })

    it('throws an error if passed an empty array', async () => {
      const input: BlockEmailAddressesForOwnerInput = {
        owner: mockOwner,
        blockedAddresses: [],
      }
      await expect(
        instanceUnderTest.blockEmailAddressesForOwner(input),
      ).rejects.toThrow(InvalidArgumentError)
    })

    it('throws an error if passed duplicate addresses', async () => {
      const emailAddress = `spammyMcSpamface-${v4()}@spambot.com`
      const input: BlockEmailAddressesForOwnerInput = {
        owner: mockOwner,
        blockedAddresses: [emailAddress, emailAddress.toLowerCase()],
      }
      await expect(
        instanceUnderTest.blockEmailAddressesForOwner(input),
      ).rejects.toThrow(InvalidArgumentError)
    })

    it('blocks a single email address', async () => {
      const emailAddress = `spammyMcSpamface-${v4()}@spambot.com`
      const input = {
        owner: mockOwner,
        blockedAddresses: [emailAddress],
      }

      const result = await instanceUnderTest.blockEmailAddressesForOwner(input)
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateEmailMessagesStatus.Success,
      })
      verify(mockAppSync.blockEmailAddresses(anything())).once()
      verify(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).once()
      verify(mockDeviceKeyWorker.sealString(anything())).once()
    })

    it('blocks multiple email addresses at once', async () => {
      const blockedAddresses = [
        `spammyMcSpamface-${v4()}@spambot.com`,
        `spammyMcSpamface-${v4()}@spambot.com`,
        `spammyMcSpamface-${v4()}@spambot.com`,
      ]
      const input = {
        owner: mockOwner,
        blockedAddresses,
      }

      const result = await instanceUnderTest.blockEmailAddressesForOwner(input)
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateEmailMessagesStatus.Success,
      })
      verify(mockAppSync.blockEmailAddresses(anything())).once()
      verify(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).once()
      verify(mockDeviceKeyWorker.sealString(anything())).times(3)
    })

    it('returns failed status requests correctly', async () => {
      when(mockAppSync.blockEmailAddresses(anything())).thenResolve({
        status: UpdateEmailMessagesStatus.Failed,
      })
      const blockedAddresses = [
        `spammyMcSpamface-${v4()}@spambot.com`,
        `spammyMcSpamface-${v4()}@spambot.com`,
        `spammyMcSpamface-${v4()}@spambot.com`,
      ]
      const input = {
        owner: mockOwner,
        blockedAddresses,
      }

      const result = await instanceUnderTest.blockEmailAddressesForOwner(input)
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateEmailMessagesStatus.Failed,
      })
      verify(mockAppSync.blockEmailAddresses(anything())).once()
      verify(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).once()
      verify(mockDeviceKeyWorker.sealString(anything())).times(3)
    })

    it('returns partial status requests correctly', async () => {
      when(mockAppSync.blockEmailAddresses(anything())).thenCall(
        (input: BlockEmailAddressesInput) => {
          const [first, ...rest] = input.blockedAddresses.map(
            (item) => item.hashedBlockedValue,
          )
          return Promise.resolve({
            status: UpdateEmailMessagesStatus.Partial,
            failedAddresses: [first],
            successAddresses: rest,
          })
        },
      )
      const blockedAddresses = [
        `spammyMcSpamface-${v4()}@spambot.com`,
        `spammyMcSpamface-${v4()}@spambot.com`,
        `spammyMcSpamface-${v4()}@spambot.com`,
      ]
      const input = {
        owner: mockOwner,
        blockedAddresses,
      }

      const result = await instanceUnderTest.blockEmailAddressesForOwner(input)
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateEmailMessagesStatus.Partial,
        failedAddresses: [blockedAddresses[0]],
        successAddresses: [blockedAddresses[1], blockedAddresses[2]],
      })
      verify(mockAppSync.blockEmailAddresses(anything())).once()
      verify(mockDeviceKeyWorker.getCurrentSymmetricKeyId()).once()
      verify(mockDeviceKeyWorker.sealString(anything())).times(3)
    })
  })

  describe('unblockEmailAddresses', () => {
    it('call appSync correctly', async () => {
      const input: UnblockEmailAddressesForOwnerInput = {
        owner: mockOwner,
        unblockedAddresses: [`spammyMcSpamface-${v4()}@spambot.com`],
      }
      await instanceUnderTest.unblockEmailAddressesForOwner(input)
      verify(mockAppSync.unblockEmailAddresses(anything())).once()
      const [inputArgs] = capture(mockAppSync.unblockEmailAddresses).first()
      expect(inputArgs.owner).toEqual(input.owner)
      expect(inputArgs.unblockedAddresses).toHaveLength(
        input.unblockedAddresses.length,
      )
    })

    it('throws an error if passed an empty array', async () => {
      const input: UnblockEmailAddressesForOwnerInput = {
        owner: mockOwner,
        unblockedAddresses: [],
      }
      await expect(
        instanceUnderTest.unblockEmailAddressesForOwner(input),
      ).rejects.toThrow(InvalidArgumentError)
    })

    it('throws an error if passed duplicate addresses', async () => {
      const emailAddress = `spammyMcSpamface-${v4()}@spambot.com`
      const input: UnblockEmailAddressesForOwnerInput = {
        owner: mockOwner,
        unblockedAddresses: [emailAddress, emailAddress.toLowerCase()],
      }
      await expect(
        instanceUnderTest.unblockEmailAddressesForOwner(input),
      ).rejects.toThrow(InvalidArgumentError)
    })

    it('unblocks a single email address', async () => {
      const emailAddress = `spammyMcSpamface-${v4()}@spambot.com`
      const input = {
        owner: mockOwner,
        unblockedAddresses: [emailAddress],
      }

      const result = await instanceUnderTest.unblockEmailAddressesForOwner(
        input,
      )
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateEmailMessagesStatus.Success,
      })
      verify(mockAppSync.unblockEmailAddresses(anything())).once()
    })

    it('unblocks multiple email addresses at once', async () => {
      const unblockedAddresses = [
        `spammyMcSpamface-${v4()}@spambot.com`,
        `spammyMcSpamface-${v4()}@spambot.com`,
        `spammyMcSpamface-${v4()}@spambot.com`,
      ]
      const input = {
        owner: mockOwner,
        unblockedAddresses,
      }

      const result = await instanceUnderTest.unblockEmailAddressesForOwner(
        input,
      )
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateEmailMessagesStatus.Success,
      })
      verify(mockAppSync.unblockEmailAddresses(anything())).once()
    })

    it('returns failed status requests correctly', async () => {
      when(mockAppSync.unblockEmailAddresses(anything())).thenResolve({
        status: UpdateEmailMessagesStatus.Failed,
      })
      const unblockedAddresses = [
        `spammyMcSpamface-${v4()}@spambot.com`,
        `spammyMcSpamface-${v4()}@spambot.com`,
        `spammyMcSpamface-${v4()}@spambot.com`,
      ]
      const input = {
        owner: mockOwner,
        unblockedAddresses,
      }

      const result = await instanceUnderTest.unblockEmailAddressesForOwner(
        input,
      )
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateEmailMessagesStatus.Failed,
      })
      verify(mockAppSync.unblockEmailAddresses(anything())).once()
    })

    it('returns partial status requests correctly', async () => {
      when(mockAppSync.unblockEmailAddresses(anything())).thenCall(
        (input: UnblockEmailAddressesInput) => {
          const [first, ...rest] = input.unblockedAddresses
          return Promise.resolve({
            status: UpdateEmailMessagesStatus.Partial,
            failedAddresses: [first],
            successAddresses: rest,
          })
        },
      )
      const unblockedAddresses = [
        `spammyMcSpamface-${v4()}@spambot.com`,
        `spammyMcSpamface-${v4()}@spambot.com`,
        `spammyMcSpamface-${v4()}@spambot.com`,
      ]
      const input = {
        owner: mockOwner,
        unblockedAddresses,
      }

      const result = await instanceUnderTest.unblockEmailAddressesForOwner(
        input,
      )
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateEmailMessagesStatus.Partial,
        failedAddresses: [unblockedAddresses[0]],
        successAddresses: [unblockedAddresses[1], unblockedAddresses[2]],
      })
      verify(mockAppSync.unblockEmailAddresses(anything())).once()
    })
  })

  describe('getEmailAddressBlocklistForOwner', () => {
    it('Returns and empty list of not blocked addresses are found', async () => {
      when(mockAppSync.getEmailAddressBlocklist(anything())).thenResolve({
        sealedBlockedAddresses: [],
      })

      const result = await instanceUnderTest.getEmailAddressBlocklistForOwner({
        owner: mockOwner,
      })

      expect(result).toHaveLength(0)
    })

    it('Returns the unsealed list of addresses', async () => {
      const result = await instanceUnderTest.getEmailAddressBlocklistForOwner({
        owner: mockOwner,
      })

      verify(mockAppSync.getEmailAddressBlocklist(anything())).once()
      verify(mockDeviceKeyWorker.unsealString(anything())).times(
        GraphQLDataFactory.getEmailAddressBlocklistResult.sealedBlockedAddresses
          .length,
      )

      expect(result).toHaveLength(
        GraphQLDataFactory.getEmailAddressBlocklistResult.sealedBlockedAddresses
          .length,
      )
    })
  })
})
