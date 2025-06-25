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
import {
  BatchOperationResultStatus,
  BlockedEmailAddressAction,
  SudoEmailClient,
} from '../../../src'

import {
  BlockEmailAddressesUseCase,
  BlockEmailAddressesUseCaseInput,
} from '../../../src/private/domain/use-cases/blocklist/blockEmailAddresses'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'
import { UpdateEmailMessagesStatus } from '../../../src/private/domain/entities/message/updateEmailMessagesStatus'

jest.mock('../../../src/private/domain/use-cases/blocklist/blockEmailAddresses')
const JestMockBlockEmailAddressesUseCase =
  BlockEmailAddressesUseCase as jest.MockedClass<
    typeof BlockEmailAddressesUseCase
  >

describe('SudoEmailClient.blockEmailAddresses Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockBlockEmailAddressesUseCase = mock<BlockEmailAddressesUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockBlockEmailAddressesUseCase)

    JestMockBlockEmailAddressesUseCase.mockClear()

    JestMockBlockEmailAddressesUseCase.mockImplementation(() =>
      instance(mockBlockEmailAddressesUseCase),
    )

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockBlockEmailAddressesUseCase.execute(anything())).thenResolve({
      status: UpdateEmailMessagesStatus.Success,
    })
  })

  it('generates use case', async () => {
    await instanceUnderTest.blockEmailAddresses({
      addressesToBlock: [`spammyMcSpamface${v4()}@spambot.com`],
    })
    expect(JestMockBlockEmailAddressesUseCase).toHaveBeenCalledTimes(1)
  })

  it('calls use case as expected with default action', async () => {
    const addressesToBlock = [
      `spammyMcSpamface${v4()}@spambot.com`,
      `spammyMcSpamface${v4()}@spambot.com`,
      `spammyMcSpamface${v4()}@spambot.com`,
    ]
    await instanceUnderTest.blockEmailAddresses({
      addressesToBlock,
    })
    verify(mockBlockEmailAddressesUseCase.execute(anything())).once()
    const [args] = capture(mockBlockEmailAddressesUseCase.execute).first()
    expect(args).toEqual({
      blockedAddresses: addressesToBlock,
      action: BlockedEmailAddressAction.DROP,
    })
  })

  it('calls use case as expected with explicit DROP action', async () => {
    const addressesToBlock = [
      `spammyMcSpamface${v4()}@spambot.com`,
      `spammyMcSpamface${v4()}@spambot.com`,
      `spammyMcSpamface${v4()}@spambot.com`,
    ]
    await instanceUnderTest.blockEmailAddresses({
      addressesToBlock,
      action: BlockedEmailAddressAction.DROP,
    })
    verify(mockBlockEmailAddressesUseCase.execute(anything())).once()
    const [args] = capture(mockBlockEmailAddressesUseCase.execute).first()
    expect(args).toEqual({
      blockedAddresses: addressesToBlock,
      action: BlockedEmailAddressAction.DROP,
    })
  })

  it('calls use case as expected with SPAM action', async () => {
    const addressesToBlock = [
      `spammyMcSpamface${v4()}@spambot.com`,
      `spammyMcSpamface${v4()}@spambot.com`,
      `spammyMcSpamface${v4()}@spambot.com`,
    ]
    await instanceUnderTest.blockEmailAddresses({
      addressesToBlock,
      action: BlockedEmailAddressAction.SPAM,
    })
    verify(mockBlockEmailAddressesUseCase.execute(anything())).once()
    const [args] = capture(mockBlockEmailAddressesUseCase.execute).first()
    expect(args).toEqual({
      blockedAddresses: addressesToBlock,
      action: BlockedEmailAddressAction.SPAM,
    })
  })

  it('calls use case as expected with emailAddressId', async () => {
    const addressesToBlock = [
      `spammyMcSpamface${v4()}@spambot.com`,
      `spammyMcSpamface${v4()}@spambot.com`,
      `spammyMcSpamface${v4()}@spambot.com`,
    ]
    await instanceUnderTest.blockEmailAddresses({
      addressesToBlock,
      emailAddressId: 'mockEmailAddressId',
    })
    verify(mockBlockEmailAddressesUseCase.execute(anything())).once()
    const [args] = capture(mockBlockEmailAddressesUseCase.execute).first()
    expect(args).toEqual({
      blockedAddresses: addressesToBlock,
      action: BlockedEmailAddressAction.DROP,
      emailAddressId: 'mockEmailAddressId',
    })
  })

  it('returns expected result on success', async () => {
    const addressesToBlock = [
      `spammyMcSpamface${v4()}@spambot.com`,
      `spammyMcSpamface${v4()}@spambot.com`,
      `spammyMcSpamface${v4()}@spambot.com`,
    ]
    await expect(
      instanceUnderTest.blockEmailAddresses({
        addressesToBlock,
      }),
    ).resolves.toEqual({ status: BatchOperationResultStatus.Success })
  })

  it('returns expected result on failure', async () => {
    when(mockBlockEmailAddressesUseCase.execute(anything())).thenResolve({
      status: UpdateEmailMessagesStatus.Failed,
    })
    const addressesToBlock = [
      `spammyMcSpamface${v4()}@spambot.com`,
      `spammyMcSpamface${v4()}@spambot.com`,
      `spammyMcSpamface${v4()}@spambot.com`,
    ]
    await expect(
      instanceUnderTest.blockEmailAddresses({
        addressesToBlock,
      }),
    ).resolves.toEqual({ status: BatchOperationResultStatus.Failure })
  })

  it('returns expected result on partial success', async () => {
    when(mockBlockEmailAddressesUseCase.execute(anything())).thenCall(
      (input: BlockEmailAddressesUseCaseInput) => {
        const [first, ...rest] = input.blockedAddresses
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
      instanceUnderTest.blockEmailAddresses({
        addressesToBlock,
      }),
    ).resolves.toEqual({
      status: BatchOperationResultStatus.Partial,
      failureValues: [addressesToBlock[0]],
      successValues: [addressesToBlock[1], addressesToBlock[2]],
    })
  })
})
