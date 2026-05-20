/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { anything, instance, mock, reset, when } from 'ts-mockito'
import { DefaultEmailAddressBlocklistService } from '../../../../../../src/private/data/blocklist/defaultEmailAddressBlocklistService'
import { UnblockEmailAddressesByHashedValueUseCase } from '../../../../../../src/private/domain/use-cases/blocklist/unblockEmailAddressesByHashedValue'
import { v4 } from 'uuid'
import {
  BlockEmailAddressesBulkUpdateOutput,
  UnblockEmailAddressesByHashedValueInput,
} from '../../../../../../src/private/domain/entities/blocklist/emailAddressBlocklistService'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { NotSignedInError } from '@sudoplatform/sudo-common'
import { UpdateBlockedAddressesStatus } from '../../../../../../src/private/domain/entities/blocklist/updateBlockedAddressesStatus'

describe('UnblockEmailAddressesByHashedValueUseCase Test Suite', () => {
  const mockOwner = 'mockOwner'
  const mockBlockedEmailAddressService =
    mock<DefaultEmailAddressBlocklistService>()
  const mockUserClient = mock<SudoUserClient>()

  let instanceUnderTest: UnblockEmailAddressesByHashedValueUseCase
  const hashedValues = [`hashedValue-${v4()}`, `hashedValue-${v4()}`]

  beforeEach(() => {
    reset(mockBlockedEmailAddressService)
    when(
      mockBlockedEmailAddressService.unblockEmailAddressesByHashedValue(
        anything(),
      ),
    ).thenResolve({ status: UpdateBlockedAddressesStatus.Success })
    when(mockUserClient.getSubject()).thenResolve(mockOwner)

    instanceUnderTest = new UnblockEmailAddressesByHashedValueUseCase(
      instance(mockBlockedEmailAddressService),
      instance(mockUserClient),
    )
  })

  describe('execute', () => {
    it('returns successful requests correctly', async () => {
      const result = await instanceUnderTest.execute({
        hashedValues,
      })
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateBlockedAddressesStatus.Success,
      })
    })

    it('returns failed requests correctly', async () => {
      when(
        mockBlockedEmailAddressService.unblockEmailAddressesByHashedValue(
          anything(),
        ),
      ).thenResolve({ status: UpdateBlockedAddressesStatus.Failed })
      const result = await instanceUnderTest.execute({
        hashedValues,
      })
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateBlockedAddressesStatus.Failed,
      })
    })

    it('returns partial requests correctly', async () => {
      when(
        mockBlockedEmailAddressService.unblockEmailAddressesByHashedValue(
          anything(),
        ),
      ).thenCall((input: UnblockEmailAddressesByHashedValueInput) => {
        const [first, ...rest] = input.hashedValues
        return Promise.resolve({
          status: UpdateBlockedAddressesStatus.Partial,
          failedAddresses: [first],
          successAddresses: rest,
        })
      })
      const result = await instanceUnderTest.execute({
        hashedValues,
      })
      expect(result).toStrictEqual<BlockEmailAddressesBulkUpdateOutput>({
        status: UpdateBlockedAddressesStatus.Partial,
        failedAddresses: [hashedValues[0]],
        successAddresses: [hashedValues[1]],
      })
    })
    it('throws NotSignedInError if user is not signed in', async () => {
      when(mockUserClient.getSubject()).thenResolve(undefined)
      await expect(
        instanceUnderTest.execute({
          hashedValues,
        }),
      ).rejects.toThrow(NotSignedInError)
    })
  })
})
