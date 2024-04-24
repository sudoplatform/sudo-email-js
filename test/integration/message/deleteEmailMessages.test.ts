/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CachePolicy, DefaultLogger } from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import _ from 'lodash'
import { v4 } from 'uuid'
import waitForExpect from 'wait-for-expect'
import {
  BatchOperationResultStatus,
  EmailAddress,
  InvalidArgumentError,
  LimitExceededError,
  SudoEmailClient,
} from '../../../src'
import { delay } from '../../util/delay'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'

describe('SudoEmailClient DeleteEmailMessages Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')
  const ootoSimulatorAddress = 'ooto@simulator.amazonses.com'

  let emailAddresses: EmailAddress[] = []

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let ownershipProofToken: string

  let emailAddress: EmailAddress

  beforeEach(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    profilesClient = result.profilesClient
    userClient = result.userClient
    sudo = result.sudo
    ownershipProofToken = result.ownershipProofToken

    emailAddress = await provisionEmailAddress(
      ownershipProofToken,
      instanceUnderTest,
    )
    emailAddresses.push(emailAddress)
  })

  afterEach(async () => {
    await teardown(
      { emailAddresses, sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
    emailAddresses = []
  })

  it("returns failure when multiple emails that don't exist are attempted to be deleted", async () => {
    await expect(
      instanceUnderTest.deleteEmailMessages(['1', '2', '3']),
    ).resolves.toStrictEqual({ status: BatchOperationResultStatus.Failure })
  })
  it('allows edge case 100 without throwing an error', async () => {
    const messagIds = _.range(100).map((i) => i.toString())
    await expect(
      instanceUnderTest.deleteEmailMessages(messagIds),
    ).resolves.toStrictEqual({ status: BatchOperationResultStatus.Failure })
  })
  it('throws LimitExceededError when limit is exceeded', async () => {
    const messagIds = _.range(101).map((i) => i.toString())
    await expect(
      instanceUnderTest.deleteEmailMessages(messagIds),
    ).rejects.toThrow(LimitExceededError)
  })
  it('throws InvalidArgumentError when input ids argument is empty', async () => {
    await expect(instanceUnderTest.deleteEmailMessages([])).rejects.toThrow(
      InvalidArgumentError,
    )
  })
  it('deletes multiple email messages successfully', async () => {
    const numberEmailsSent = 2
    const inputs = _.range(numberEmailsSent).map((i) => ({
      senderEmailAddressId: emailAddress.id,
      emailMessageHeader: {
        from: { emailAddress: emailAddress.emailAddress },
        to: [{ emailAddress: ootoSimulatorAddress }],
        cc: [],
        bcc: [],
        replyTo: [],
        subject: 'Test',
      },
      body: 'Hello, World',
      attachments: [],
      inlineAttachments: [],
    }))
    const ids = await Promise.all(
      inputs.map(
        async (input) => await instanceUnderTest.sendEmailMessage(input),
      ),
    )
    await delay(2000)
    let updatedEmailAddress = await instanceUnderTest.getEmailAddress({
      id: emailAddress.id,
    })
    for (let i = 0; i < 5; i++) {
      if (updatedEmailAddress!.numberOfEmailMessages === numberEmailsSent * 2) {
        break
      }
      await delay(1000)
      updatedEmailAddress = await instanceUnderTest.getEmailAddress({
        id: emailAddress.id,
      })
    }
    expect(updatedEmailAddress!.numberOfEmailMessages).toStrictEqual(
      numberEmailsSent * 2,
    )
    await expect(
      instanceUnderTest.deleteEmailMessages(ids),
    ).resolves.toStrictEqual({ status: BatchOperationResultStatus.Success })
    for (let i = 0; i < 5; i++) {
      if (updatedEmailAddress!.numberOfEmailMessages === numberEmailsSent) {
        break
      }
      await delay(1000)
      updatedEmailAddress = await instanceUnderTest.getEmailAddress({
        id: emailAddress.id,
      })
    }
    expect(updatedEmailAddress!.numberOfEmailMessages).toStrictEqual(
      numberEmailsSent,
    )
  })
  it("returns partial result when deleting messages that do and don't exist simultaneously", async () => {
    const messageId = await instanceUnderTest.sendEmailMessage({
      senderEmailAddressId: emailAddress.id,
      emailMessageHeader: {
        from: { emailAddress: emailAddress.emailAddress },
        to: [{ emailAddress: ootoSimulatorAddress }],
        cc: [],
        bcc: [],
        replyTo: [],
        subject: 'Test',
      },
      body: 'Hello, World',
      attachments: [],
      inlineAttachments: [],
    })
    await waitForExpect(async () => {
      await expect(
        instanceUnderTest.getEmailMessage({
          id: messageId,
          cachePolicy: CachePolicy.RemoteOnly,
        }),
      ).resolves.toBeDefined()
    })
    const nonExistentId = v4()
    await expect(
      instanceUnderTest.deleteEmailMessages([messageId, nonExistentId]),
    ).resolves.toStrictEqual({
      status: BatchOperationResultStatus.Partial,
      successValues: [messageId],
      failureValues: [nonExistentId],
    })
  })
})
