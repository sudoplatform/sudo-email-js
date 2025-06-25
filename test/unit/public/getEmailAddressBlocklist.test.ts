/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { capture, instance, mock, reset, verify, when } from 'ts-mockito'
import { v4 } from 'uuid'
import {
  BlockedEmailAddressAction,
  SudoEmailClient,
  UnsealedBlockedAddress,
} from '../../../src'
import { GetEmailAddressBlocklistUseCase } from '../../../src/private/domain/use-cases/blocklist/getEmailAddressBlocklist'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/blocklist/getEmailAddressBlocklist',
)
const JestMockGetEmailAddressBlocklistUseCase =
  GetEmailAddressBlocklistUseCase as jest.MockedClass<
    typeof GetEmailAddressBlocklistUseCase
  >

describe('SudoEmailClient.getEmailAddressBlocklist Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockGetEmailAddressBlocklistUseCase =
    mock<GetEmailAddressBlocklistUseCase>()
  const blockedAddresses: UnsealedBlockedAddress[] = [
    {
      address: `spammyMcSpamface-${v4()}@spambot.com`,
      hashedBlockedValue: 'dummyHashedValue',
      status: { type: 'Completed' },
      action: BlockedEmailAddressAction.DROP,
    },
    {
      address: `spammyMcSpamface-${v4()}@spambot.com`,
      hashedBlockedValue: 'dummyHashedValue',
      status: { type: 'Completed' },
      action: BlockedEmailAddressAction.DROP,
    },
  ]

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockGetEmailAddressBlocklistUseCase)

    JestMockGetEmailAddressBlocklistUseCase.mockClear()

    JestMockGetEmailAddressBlocklistUseCase.mockImplementation(() =>
      instance(mockGetEmailAddressBlocklistUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockGetEmailAddressBlocklistUseCase.execute()).thenResolve(
      blockedAddresses,
    )
  })

  it('generates use case', async () => {
    await instanceUnderTest.getEmailAddressBlocklist()
    expect(JestMockGetEmailAddressBlocklistUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    await instanceUnderTest.getEmailAddressBlocklist()
    verify(mockGetEmailAddressBlocklistUseCase.execute()).once()
    const [args] = capture(mockGetEmailAddressBlocklistUseCase.execute).first()
  })

  it('returns expected list of blocked addresses', async () => {
    await expect(instanceUnderTest.getEmailAddressBlocklist()).resolves.toEqual(
      blockedAddresses,
    )
  })

  it('returns expected list of blocked addresses including emailAddressId', async () => {
    const expected = blockedAddresses.map((blockedAddress) => ({
      ...blockedAddress,
      emailAddressId: 'mockEmailAddressId',
    }))
    when(mockGetEmailAddressBlocklistUseCase.execute()).thenResolve(expected)
    await expect(instanceUnderTest.getEmailAddressBlocklist()).resolves.toEqual(
      expected,
    )
  })
})
