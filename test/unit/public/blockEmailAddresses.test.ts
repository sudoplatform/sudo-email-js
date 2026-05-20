/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
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
import { MockedClass } from 'vitest'
import { v4 } from 'uuid'
import {
  BatchOperationResultStatus,
  BlockedEmailAddressAction,
  BlockedEmailAddressLevel,
  SudoEmailClient,
} from '../../../src'
import {
  BlockEmailAddressesUseCase,
  BlockEmailAddressesUseCaseInput,
} from '../../../src/private/domain/use-cases/blocklist/blockEmailAddresses'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'
import { UpdateEmailMessagesStatus } from '../../../src/private/domain/entities/message/updateEmailMessagesStatus'
import { UpdateBlockedAddressesStatus } from '../../../src/private/domain/entities/blocklist/updateBlockedAddressesStatus'

vi.mock('../../../src/private/domain/use-cases/blocklist/blockEmailAddresses')
const ViMockBlockEmailAddressesUseCase =
  BlockEmailAddressesUseCase as MockedClass<typeof BlockEmailAddressesUseCase>

describe('SudoEmailClient.blockEmailAddresses Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  let instanceUnderTest: SudoEmailClient

  const mockBlockEmailAddressesUseCase = mock<BlockEmailAddressesUseCase>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockBlockEmailAddressesUseCase)

    ViMockBlockEmailAddressesUseCase.mockClear()

    ViMockBlockEmailAddressesUseCase.mockImplementation(function () {
      return instance(mockBlockEmailAddressesUseCase)
    })

    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()

    when(mockBlockEmailAddressesUseCase.execute(anything())).thenResolve({
      status: UpdateBlockedAddressesStatus.Success,
    })
  })

  it('generates use case', async () => {
    await instanceUnderTest.blockEmailAddresses({
      addressesToBlock: [`spammyMcSpamface${v4()}@spambot.com`],
    })
    expect(ViMockBlockEmailAddressesUseCase).toHaveBeenCalledTimes(1)
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
      blockLevel: BlockedEmailAddressLevel.ADDRESS,
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
      blockLevel: BlockedEmailAddressLevel.ADDRESS,
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
      blockLevel: BlockedEmailAddressLevel.ADDRESS,
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
      blockLevel: BlockedEmailAddressLevel.ADDRESS,
    })
  })

  it('calls use case as expected with explicit ADDRESS blockLevel', async () => {
    const addressesToBlock = [
      `spammyMcSpamface${v4()}@spambot.com`,
      `spammyMcSpamface${v4()}@spambot.com`,
      `spammyMcSpamface${v4()}@spambot.com`,
    ]
    await instanceUnderTest.blockEmailAddresses({
      addressesToBlock,
      blockLevel: BlockedEmailAddressLevel.ADDRESS,
    })
    verify(mockBlockEmailAddressesUseCase.execute(anything())).once()
    const [args] = capture(mockBlockEmailAddressesUseCase.execute).first()
    expect(args).toEqual({
      blockedAddresses: addressesToBlock,
      action: BlockedEmailAddressAction.DROP,
      blockLevel: BlockedEmailAddressLevel.ADDRESS,
    })
  })

  it('calls use case as expected with DOMAIN blockLevel', async () => {
    const addressesToBlock = [
      `spammyMcSpamface${v4()}@spambot.com`,
      `spammyMcSpamface${v4()}@spambot.com`,
      `spammyMcSpamface${v4()}@spambot.com`,
    ]
    await instanceUnderTest.blockEmailAddresses({
      addressesToBlock,
      blockLevel: BlockedEmailAddressLevel.DOMAIN,
    })
    verify(mockBlockEmailAddressesUseCase.execute(anything())).once()
    const [args] = capture(mockBlockEmailAddressesUseCase.execute).first()
    expect(args).toEqual({
      blockedAddresses: addressesToBlock,
      action: BlockedEmailAddressAction.DROP,
      blockLevel: BlockedEmailAddressLevel.DOMAIN,
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
      status: UpdateBlockedAddressesStatus.Failed,
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
