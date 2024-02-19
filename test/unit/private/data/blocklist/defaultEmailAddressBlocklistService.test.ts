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
  UnblockEmailAddressesByHashedValueInput,
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
import { DecodeError, KeyNotFoundError } from '@sudoplatform/sudo-common'

describe('DefaultEmailAddressBlocklist Test Suite', () => {
  const mockAppSync = mock<ApiClient>()
  const mockDeviceKeyWorker = mock<DeviceKeyWorker>()
  let instanceUnderTest: EmailAddressBlocklistService
  const mockOwner = 'mockOwner'
  const mockUnsealedAddress = 'spammyMcSpamface@spambot.com'

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
    when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
      true,
    )
    when(mockDeviceKeyWorker.unsealString(anything())).thenResolve(
      mockUnsealedAddress,
    )
  })

  describe('blockEmailAddresses', () => {
    const mockOwner = 'mockOwner'
    it('call appSync correctly', async () => {
      const input: BlockEmailAddressesForOwnerInput = {
        owner: mockOwner,
        blockedAddresses: [`spammyMcSpamface-${v4()}@spambot.com`],
      }
      await instanceUnderTest.blockEmailAddressesForOwner(input)
      verify(mockAppSync.blockEmailAddresses(anything())).once()
      const [inputArgs] = capture(mockAppSync.blockEmailAddresses).first()
      expect(inputArgs.owner).toEqual(mockOwner)
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
    const mockOwner = 'mockOwner'
    it('call appSync correctly', async () => {
      const input: UnblockEmailAddressesForOwnerInput = {
        owner: mockOwner,
        unblockedAddresses: [`spammyMcSpamface-${v4()}@spambot.com`],
      }
      await instanceUnderTest.unblockEmailAddressesForOwner(input)
      verify(mockAppSync.unblockEmailAddresses(anything())).once()
      const [inputArgs] = capture(mockAppSync.unblockEmailAddresses).first()
      expect(inputArgs.owner).toEqual(mockOwner)
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

  describe('unblockEmailAddressesByHashedValue', () => {
    const mockOwner = 'mockOwner'
    it('call appSync correctly', async () => {
      const input: UnblockEmailAddressesByHashedValueInput = {
        owner: mockOwner,
        hashedValues: [`dummyHash-${v4()}`],
      }
      await instanceUnderTest.unblockEmailAddressesByHashedValue(input)
      verify(mockAppSync.unblockEmailAddresses(anything())).once()
      const [inputArgs] = capture(mockAppSync.unblockEmailAddresses).first()
      expect(inputArgs.owner).toEqual(mockOwner)
      expect(inputArgs.unblockedAddresses).toHaveLength(
        input.hashedValues.length,
      )
    })

    it('throws error if passed an empty array', async () => {
      const input: UnblockEmailAddressesByHashedValueInput = {
        owner: mockOwner,
        hashedValues: [],
      }
      await expect(
        instanceUnderTest.unblockEmailAddressesByHashedValue(input),
      ).rejects.toThrow(InvalidArgumentError)
    })

    it('unblocks a single hashedValue', async () => {
      const hashedValue = `hashedValue-${v4()}`
      const input: UnblockEmailAddressesByHashedValueInput = {
        owner: mockOwner,
        hashedValues: [hashedValue],
      }

      const result = await instanceUnderTest.unblockEmailAddressesByHashedValue(
        input,
      )
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateEmailMessagesStatus.Success,
      })
      verify(mockAppSync.unblockEmailAddresses(anything())).once()
    })

    it('unblocks multiple hashedValues at once', async () => {
      const hashedValues = [
        `hashedValue-${v4()}`,
        `hashedValue-${v4()}`,
        `hashedValue-${v4()}`,
      ]
      const input: UnblockEmailAddressesByHashedValueInput = {
        owner: mockOwner,
        hashedValues,
      }

      const result = await instanceUnderTest.unblockEmailAddressesByHashedValue(
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
      const hashedValues = [
        `hashedValue-${v4()}`,
        `hashedValue-${v4()}`,
        `hashedValue-${v4()}`,
      ]
      const input: UnblockEmailAddressesByHashedValueInput = {
        owner: mockOwner,
        hashedValues,
      }
      const result = await instanceUnderTest.unblockEmailAddressesByHashedValue(
        input,
      )
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateEmailMessagesStatus.Failed,
      })
      verify(mockAppSync.unblockEmailAddresses(anything())).once()
    })

    it('returns partial status request correctly', async () => {
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
      const hashedValues = [
        `hashedValue-${v4()}`,
        `hashedValue-${v4()}`,
        `hashedValue-${v4()}`,
      ]
      const input: UnblockEmailAddressesByHashedValueInput = {
        owner: mockOwner,
        hashedValues,
      }
      const result = await instanceUnderTest.unblockEmailAddressesByHashedValue(
        input,
      )
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateEmailMessagesStatus.Partial,
        failedAddresses: [hashedValues[0]],
        successAddresses: [hashedValues[1], hashedValues[2]],
      })
      verify(mockAppSync.unblockEmailAddresses(anything())).once()
    })
  })

  describe('getEmailAddressBlocklistForOwner', () => {
    it('Returns an empty list of not blocked addresses are found', async () => {
      when(mockAppSync.getEmailAddressBlocklist(anything())).thenResolve({
        blockedAddresses: [],
      })

      const result = await instanceUnderTest.getEmailAddressBlocklistForOwner(
        mockOwner,
      )

      expect(result).toHaveLength(0)
    })

    it('Returns the unsealed list of addresses', async () => {
      const result = await instanceUnderTest.getEmailAddressBlocklistForOwner(
        mockOwner,
      )

      verify(mockAppSync.getEmailAddressBlocklist(anything())).once()
      verify(mockDeviceKeyWorker.keyExists(anything(), anything())).times(
        GraphQLDataFactory.getEmailAddressBlocklistResult.blockedAddresses
          .length,
      )
      verify(mockDeviceKeyWorker.unsealString(anything())).times(
        GraphQLDataFactory.getEmailAddressBlocklistResult.blockedAddresses
          .length,
      )

      expect(result).toHaveLength(
        GraphQLDataFactory.getEmailAddressBlocklistResult.blockedAddresses
          .length,
      )
      result.forEach((value) => {
        expect(value.address).toEqual(mockUnsealedAddress)
        expect(value.hashedBlockedValue).toEqual('hashedValue')
        expect(value.status).toEqual({
          type: 'Completed',
        })
      })
    })

    it('Returns entity with error if key not found', async () => {
      when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
        false,
        true,
      ) // First will be false, second true
      const result = await instanceUnderTest.getEmailAddressBlocklistForOwner(
        mockOwner,
      )

      verify(mockAppSync.getEmailAddressBlocklist(anything())).once()
      verify(mockDeviceKeyWorker.keyExists(anything(), anything())).times(
        GraphQLDataFactory.getEmailAddressBlocklistResult.blockedAddresses
          .length,
      )
      verify(mockDeviceKeyWorker.unsealString(anything())).times(
        GraphQLDataFactory.getEmailAddressBlocklistResult.blockedAddresses
          .length - 1, // won't get called on first pass
      )

      expect(result).toHaveLength(
        GraphQLDataFactory.getEmailAddressBlocklistResult.blockedAddresses
          .length,
      )
      expect(result[0].address).toEqual('')
      expect(result[0].status).toEqual({
        type: 'Failed',
        cause: new KeyNotFoundError(),
      })
      expect(result[0].hashedBlockedValue).toEqual('hashedValue')
      expect(result[1].address).toEqual(mockUnsealedAddress)
      expect(result[1].hashedBlockedValue).toEqual('hashedValue')
      expect(result[1].status).toEqual({
        type: 'Completed',
      })
    })

    it('Returns entity with error if decoding failed', async () => {
      when(mockDeviceKeyWorker.unsealString(anything()))
        .thenThrow(new DecodeError())
        .thenResolve(mockUnsealedAddress)
      const result = await instanceUnderTest.getEmailAddressBlocklistForOwner(
        mockOwner,
      )

      verify(mockAppSync.getEmailAddressBlocklist(anything())).once()
      verify(mockDeviceKeyWorker.keyExists(anything(), anything())).times(
        GraphQLDataFactory.getEmailAddressBlocklistResult.blockedAddresses
          .length,
      )
      verify(mockDeviceKeyWorker.unsealString(anything())).times(
        GraphQLDataFactory.getEmailAddressBlocklistResult.blockedAddresses
          .length,
      )

      expect(result).toHaveLength(
        GraphQLDataFactory.getEmailAddressBlocklistResult.blockedAddresses
          .length,
      )
      expect(result[0].address).toEqual('')
      expect(result[0].status).toEqual({
        type: 'Failed',
        cause: new DecodeError(),
      })
      expect(result[0].hashedBlockedValue).toEqual('hashedValue')
      expect(result[1].address).toEqual(mockUnsealedAddress)
      expect(result[1].hashedBlockedValue).toEqual('hashedValue')
      expect(result[1].status).toEqual({
        type: 'Completed',
      })
    })
  })
})
