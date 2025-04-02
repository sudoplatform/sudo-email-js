/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
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
  const successSimulatorAddress = 'success@simulator.amazonses.com'

  let emailAddresses: EmailAddress[] = []

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let ownershipProofToken: string

  let emailAddress: EmailAddress

  const mapIdsToSuccessIds = (ids: string[]) => ids.map((id) => ({ id }))

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
    const messageIds = ['1', '2', '3']
    await expect(
      instanceUnderTest.deleteEmailMessages(messageIds),
    ).resolves.toStrictEqual({
      status: BatchOperationResultStatus.Failure,
      successValues: [],
      failureValues: expect.arrayContaining(
        messageIds.map((id) => ({
          errorType: 'Failed to delete email message',
          id,
        })),
      ),
    })
  })

  it('allows edge case 100 without throwing an error', async () => {
    const messageIds = _.range(100).map((i) => i.toString())
    await expect(
      instanceUnderTest.deleteEmailMessages(messageIds),
    ).resolves.toStrictEqual({
      status: BatchOperationResultStatus.Failure,
      successValues: [],
      failureValues: expect.arrayContaining(
        messageIds.map((id) => ({
          errorType: 'Failed to delete email message',
          id,
        })),
      ),
    })
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
        to: [{ emailAddress: emailAddress.emailAddress }],
        cc: [],
        bcc: [],
        replyTo: [],
        subject: 'Test',
      },
      body: 'Hello, World',
      attachments: [],
      inlineAttachments: [],
    }))
    const results = await Promise.all(
      inputs.map(
        async (input) => await instanceUnderTest.sendEmailMessage(input),
      ),
    )
    const ids = results.map((r) => r.id)
    await delay(2000)
    let updatedEmailAddress: EmailAddress | undefined
    await waitForExpect(async () => {
      updatedEmailAddress = await instanceUnderTest.getEmailAddress({
        id: emailAddress.id,
      })
      expect(updatedEmailAddress!.numberOfEmailMessages).toEqual(
        numberEmailsSent * 2,
      )
    })
    await expect(
      instanceUnderTest.deleteEmailMessages(ids),
    ).resolves.toStrictEqual({
      status: BatchOperationResultStatus.Success,
      successValues: expect.arrayContaining(mapIdsToSuccessIds(ids)),
      failureValues: [],
    })
    await waitForExpect(async () => {
      updatedEmailAddress = await instanceUnderTest.getEmailAddress({
        id: emailAddress.id,
      })
      expect(updatedEmailAddress!.numberOfEmailMessages).toEqual(
        numberEmailsSent,
      )
    })
  })

  it("returns partial result when deleting messages that do and don't exist simultaneously", async () => {
    const result = await instanceUnderTest.sendEmailMessage({
      senderEmailAddressId: emailAddress.id,
      emailMessageHeader: {
        from: { emailAddress: emailAddress.emailAddress },
        to: [{ emailAddress: successSimulatorAddress }],
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
          id: result.id,
          cachePolicy: CachePolicy.RemoteOnly,
        }),
      ).resolves.toBeDefined()
    })
    const nonExistentId = v4()
    await expect(
      instanceUnderTest.deleteEmailMessages([result.id, nonExistentId]),
    ).resolves.toStrictEqual({
      status: BatchOperationResultStatus.Partial,
      successValues: mapIdsToSuccessIds([result.id]),
      failureValues: [
        {
          errorType: 'Failed to delete email message',
          id: nonExistentId,
        },
      ],
    })
  })
})
