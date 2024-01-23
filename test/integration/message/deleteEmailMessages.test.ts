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
import { str2ab } from '../../util/buffer'
import { delay } from '../../util/delay'
import { createEmailMessageRfc822String } from '../util/createEmailMessage'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'

describe('SudoEmailClient DeleteEmailMessages Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

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
    const messageStrings = _.range(2).map((i) =>
      createEmailMessageRfc822String({
        from: [{ emailAddress: emailAddress.emailAddress }],
        to: [{ emailAddress: 'ooto@simulator.amazonses.com' }],
        cc: [],
        bcc: [],
        replyTo: [],
        body: `Hello, World ${i}`,
        attachments: [],
      }),
    )
    const ids = await Promise.all(
      messageStrings.map(
        async (s) =>
          await instanceUnderTest.sendEmailMessage({
            rfc822Data: str2ab(s),
            senderEmailAddressId: emailAddress.id,
          }),
      ),
    )
    await delay(2000)
    await expect(
      instanceUnderTest.deleteEmailMessages(ids),
    ).resolves.toStrictEqual({ status: BatchOperationResultStatus.Success })
  })
  it("returns partial result when deleting messages that do and don't exist simultaneously", async () => {
    const messageString = createEmailMessageRfc822String({
      from: [{ emailAddress: emailAddress.emailAddress }],
      to: [{ emailAddress: 'ooto@simulator.amazonses.com' }],
      cc: [],
      bcc: [],
      replyTo: [],
      body: 'Hello, World',
      attachments: [],
    })
    const messageId = await instanceUnderTest.sendEmailMessage({
      rfc822Data: str2ab(messageString),
      senderEmailAddressId: emailAddress.id,
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
