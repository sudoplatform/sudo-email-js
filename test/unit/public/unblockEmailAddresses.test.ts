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
import { v4 } from 'uuid'
import { BatchOperationResultStatus, SudoEmailClient } from '../../../src'
import { UpdateEmailMessagesStatus } from '../../../src/private/domain/entities/message/updateEmailMessagesStatus'
import {
  UnblockEmailAddressesUseCase,
  UnblockEmailAddressesUseCaseInput,
} from '../../../src/private/domain/use-cases/blocklist/unblockEmailAddresses'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

jest.mock(
  '../../../src/private/domain/use-cases/blocklist/unblockEmailAddresses',
)
const JestMockUnblockEmailAddressesUseCase =
  UnblockEmailAddressesUseCase as jest.MockedClass<
    typeof UnblockEmailAddressesUseCase
  >

describe('SudoEmailClient.unblockEmailAddresses Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockUnblockEmailAddressesUseCase = mock<UnblockEmailAddressesUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockUnblockEmailAddressesUseCase)

    JestMockUnblockEmailAddressesUseCase.mockClear()

    JestMockUnblockEmailAddressesUseCase.mockImplementation(() =>
      instance(mockUnblockEmailAddressesUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockUnblockEmailAddressesUseCase.execute(anything())).thenResolve({
      status: UpdateEmailMessagesStatus.Success,
    })
  })
  it('generates use case', async () => {
    await instanceUnderTest.unblockEmailAddresses({
      addresses: [`spammyMcSpamface${v4()}@spambot.com`],
    })
    expect(JestMockUnblockEmailAddressesUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected', async () => {
    const addressesToBlock = [
      `spammyMcSpamface${v4()}@spambot.com`,
      `spammyMcSpamface${v4()}@spambot.com`,
      `spammyMcSpamface${v4()}@spambot.com`,
    ]
    await instanceUnderTest.unblockEmailAddresses({
      addresses: addressesToBlock,
    })
    verify(mockUnblockEmailAddressesUseCase.execute(anything())).once()
    const [args] = capture(mockUnblockEmailAddressesUseCase.execute).first()
    expect(args).toEqual({
      unblockedAddresses: addressesToBlock,
    })
  })

  it('returns expected result on success', async () => {
    const addressesToBlock = [
      `spammyMcSpamface${v4()}@spambot.com`,
      `spammyMcSpamface${v4()}@spambot.com`,
      `spammyMcSpamface${v4()}@spambot.com`,
    ]
    await expect(
      instanceUnderTest.unblockEmailAddresses({
        addresses: addressesToBlock,
      }),
    ).resolves.toEqual({ status: BatchOperationResultStatus.Success })
  })

  it('returns expected result on failure', async () => {
    when(mockUnblockEmailAddressesUseCase.execute(anything())).thenResolve({
      status: UpdateEmailMessagesStatus.Failed,
    })
    const addressesToBlock = [
      `spammyMcSpamface${v4()}@spambot.com`,
      `spammyMcSpamface${v4()}@spambot.com`,
      `spammyMcSpamface${v4()}@spambot.com`,
    ]
    await expect(
      instanceUnderTest.unblockEmailAddresses({
        addresses: addressesToBlock,
      }),
    ).resolves.toEqual({ status: BatchOperationResultStatus.Failure })
  })

  it('returns expected result on partial success', async () => {
    when(mockUnblockEmailAddressesUseCase.execute(anything())).thenCall(
      (input: UnblockEmailAddressesUseCaseInput) => {
        const [first, ...rest] = input.unblockedAddresses
        return Promise.resolve({
          status: UpdateEmailMessagesStatus.Partial,
          failedAddresses: [first],
          successAddresses: rest,
        })
      },
    )
    const addressesToBlock = [
      `spammyMcSpamface${v4()}@spambot.com`,
      `spammyMcSpamface${v4()}@spambot.com`,
      `spammyMcSpamface${v4()}@spambot.com`,
    ]
    await expect(
      instanceUnderTest.unblockEmailAddresses({
        addresses: addressesToBlock,
      }),
    ).resolves.toEqual({
      status: BatchOperationResultStatus.Partial,
      failureValues: [addressesToBlock[0]],
      successValues: [addressesToBlock[1], addressesToBlock[2]],
    })
  })
})
