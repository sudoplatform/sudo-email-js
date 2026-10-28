/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger } from '@sudoplatform/sudo-common'
import {
  AddressNotFoundError,
  EmailAddress,
  ScheduledDraftMessage,
  ScheduledDraftMessageFilterInput,
  ScheduledDraftMessageState,
  SudoEmailClient,
} from '../../../src'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'
import { Rfc822MessageDataProcessor } from '../../../src/private/util/rfc822MessageDataProcessor'
import { DateTime } from 'luxon'
import { v4 } from 'uuid'
import { provisionEmailAlias } from '../util/provisionEmailAlias'

describe('ListScheduledDraftMessagesForEmailAddressId Integration Test Suite', () => {
  const log = new DefaultLogger(
    'ListScheduledDraftMessagesForEmailAddressId Integration Test Suite',
  )

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let sudoOwnershipProofToken: string

  let emailAddress: EmailAddress
  let scheduledDraftMessages: ScheduledDraftMessage[] = []

  beforeEach(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    profilesClient = result.profilesClient
    userClient = result.userClient
    sudo = result.sudo
    sudoOwnershipProofToken = result.ownershipProofToken

    emailAddress = await provisionEmailAddress(
      sudoOwnershipProofToken,
      instanceUnderTest,
    )
    scheduledDraftMessages = []
  })

  afterEach(async () => {
    await teardown(
      { emailAddresses: [emailAddress], sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })

  const scheduleSendDraftMessage = async () => {
    const draftBuffer =
      Rfc822MessageDataProcessor.encodeToInternetMessageBuffer({
        from: [{ emailAddress: emailAddress.emailAddress }],
        to: [{ emailAddress: emailAddress.emailAddress }],
        cc: [],
        bcc: [],
        replyTo: [],
        body: 'Hello, World',
        attachments: [],
        subject: 'draft subject',
      })
    const metadata = await instanceUnderTest.createDraftEmailMessage({
      rfc822Data: draftBuffer,
      senderEmailAddressId: emailAddress.id,
    })

    const sendAt = DateTime.now().plus({ day: 1 }).toJSDate()
    const result = await instanceUnderTest.scheduleSendDraftMessage({
      id: metadata.id,
      emailAddressId: emailAddress.id,
      sendAt,
    })
    scheduledDraftMessages.push(result)
  }

  it('throws AddressNotFoundError if passed invalid emailAddressId', async () => {
    await expect(
      instanceUnderTest.listScheduledDraftMessagesForEmailAddressId({
        emailAddressId: v4(),
      }),
    ).rejects.toThrow(AddressNotFoundError)
  })

  it('properly lists a single scheduled draft message', async () => {
    await scheduleSendDraftMessage()

    const result =
      await instanceUnderTest.listScheduledDraftMessagesForEmailAddressId({
        emailAddressId: emailAddress.id,
      })

    expect(result).toBeDefined()
    expect(result.nextToken).toBeFalsy()
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toEqual(scheduledDraftMessages[0])
  })

  it('properly lists multiple scheduled draft messages', async () => {
    const numMessages = 3

    for (let i = 0; i < numMessages; i++) {
      await scheduleSendDraftMessage()
    }

    const result =
      await instanceUnderTest.listScheduledDraftMessagesForEmailAddressId({
        emailAddressId: emailAddress.id,
      })

    expect(result).toBeDefined()
    expect(result.nextToken).toBeFalsy()
    expect(result.items).toHaveLength(numMessages)
    for (const scheduledDraftMessage of result.items) {
      expect(
        scheduledDraftMessages.find((m) => m.id === scheduledDraftMessage.id),
      ).toBeDefined()
    }
  })

  it('returns updated list when called after new draft is scheduled', async () => {
    // Schedule the first draft message
    await scheduleSendDraftMessage()
    const initialResult =
      await instanceUnderTest.listScheduledDraftMessagesForEmailAddressId({
        emailAddressId: emailAddress.id,
      })

    expect(initialResult).toBeDefined()
    expect(initialResult.items).toHaveLength(1)
    expect(initialResult.items[0]).toEqual(scheduledDraftMessages[0])

    // Schedule a second draft message
    await scheduleSendDraftMessage()
    const updatedResult =
      await instanceUnderTest.listScheduledDraftMessagesForEmailAddressId({
        emailAddressId: emailAddress.id,
      })

    expect(updatedResult).toBeDefined()
    expect(updatedResult.items).toHaveLength(2)
    // Both scheduled messages should be present
    for (const scheduledDraftMessage of scheduledDraftMessages) {
      expect(
        updatedResult.items.find((m) => m.id === scheduledDraftMessage.id),
      ).toBeDefined()
    }
  })

  it('limits and paginates properly', async () => {
    const numMessages = 5
    const limit = 3

    for (let i = 0; i < numMessages; i++) {
      await scheduleSendDraftMessage()
    }

    const resultPage1 =
      await instanceUnderTest.listScheduledDraftMessagesForEmailAddressId({
        emailAddressId: emailAddress.id,
        limit,
      })

    expect(resultPage1).toBeDefined()
    expect(resultPage1.nextToken).toBeTruthy()
    expect(resultPage1.items).toHaveLength(limit)
    for (const scheduledDraftMessage of resultPage1.items) {
      expect(
        scheduledDraftMessages.find((m) => m.id === scheduledDraftMessage.id),
      ).toBeDefined()
    }

    const resultPage2 =
      await instanceUnderTest.listScheduledDraftMessagesForEmailAddressId({
        emailAddressId: emailAddress.id,
        limit,
        nextToken: resultPage1.nextToken,
      })

    expect(resultPage2).toBeDefined()
    expect(resultPage2.nextToken).toBeFalsy()
    expect(resultPage2.items).toHaveLength(numMessages - limit)
    for (const scheduledDraftMessage of resultPage2.items) {
      expect(
        scheduledDraftMessages.find((m) => m.id === scheduledDraftMessage.id),
      ).toBeDefined()
    }
  })

  it('filters by state properly', async () => {
    const numMessages = 5
    const filter: ScheduledDraftMessageFilterInput = {
      state: {
        notEqual: ScheduledDraftMessageState.CANCELLED,
      },
    }

    for (let i = 0; i < numMessages; i++) {
      await scheduleSendDraftMessage()
    }
    const toCancel = scheduledDraftMessages.pop()

    const cancelRes = await instanceUnderTest.cancelScheduledDraftMessage({
      id: toCancel!.id,
      emailAddressId: emailAddress.id,
    })

    expect(cancelRes).toEqual(toCancel!.id)

    const result =
      await instanceUnderTest.listScheduledDraftMessagesForEmailAddressId({
        emailAddressId: emailAddress.id,
        filter,
      })

    expect(result).toBeDefined()
    expect(result.nextToken).toBeFalsy()
    expect(result.items).toHaveLength(numMessages - 1)
    for (const scheduledDraftMessage of result.items) {
      expect(
        scheduledDraftMessages.find((m) => m.id === scheduledDraftMessage.id),
      ).toBeDefined()
    }
    expect(result.items.find((m) => m.id === toCancel!.id)).toBeFalsy()
  })
  describe('ListScheduledDraftMessagesForEmailAddressId from email aliases', () => {
    let runTests = true
    beforeEach(async ({ skip }) => {
      const config = await instanceUnderTest.getConfigurationData()
      runTests = config.emailAliasesEnabled
      skip(!runTests, 'Email aliases are not enabled, skipping tests')
    })

    it('Schedule a draft message from a alias id and verify that the list includes the alias id in the response', async () => {
      // Provision an email alias associated with the provisioned address
      const emailAlias = await provisionEmailAlias(
        sudoOwnershipProofToken,
        instanceUnderTest,
        {
          realAddress: emailAddress.emailAddress,
        },
      )

      // Create a new draft from the alias address
      const aliasDraftBuffer =
        Rfc822MessageDataProcessor.encodeToInternetMessageBuffer({
          from: [{ emailAddress: emailAlias.aliasAddress }],
          to: [{ emailAddress: emailAddress.emailAddress }],
          cc: [],
          bcc: [],
          replyTo: [],
          body: 'Hello from alias',
          attachments: [],
          subject: 'alias draft subject',
        })
      const aliasDraftMetadata =
        await instanceUnderTest.createDraftEmailMessage({
          rfc822Data: aliasDraftBuffer,
          senderEmailAddressId: emailAddress.id,
          emailAliasId: emailAlias.id,
        })

      // Schedule the draft using the alias id
      const sendAt = DateTime.now().plus({ day: 1 }).toJSDate()
      const result = await instanceUnderTest.scheduleSendDraftMessage({
        id: aliasDraftMetadata.id,
        emailAddressId: emailAddress.id,
        emailAliasId: emailAlias.id,
        sendAt,
      })

      // Verify that the response is consistent
      expect(result.id).toEqual(aliasDraftMetadata.id)
      expect(result.emailAddressId).toEqual(emailAddress.id)
      expect(result.emailAliasId).toEqual(emailAlias.id)
      expect(result.sendAt).toEqual(sendAt)
      expect(result.state).toEqual(ScheduledDraftMessageState.SCHEDULED)

      // List all drafts for this email address
      const messages =
        await instanceUnderTest.listScheduledDraftMessagesForEmailAddressId({
          emailAddressId: emailAddress.id,
        })
      const aliasDraft = messages.items.find(
        (m) => m.id === aliasDraftMetadata.id,
      )

      expect(aliasDraft?.emailAliasId).toEqual(emailAlias.id)
      expect(aliasDraft?.emailAddressId).toEqual(emailAddress.id)
      expect(aliasDraft?.sendAt).toEqual(sendAt)
      expect(aliasDraft?.state).toEqual(ScheduledDraftMessageState.SCHEDULED)

      // Clean up the alias draft
      await instanceUnderTest.deleteDraftEmailMessages({
        ids: [aliasDraftMetadata.id],
        emailAddressId: emailAddress.id,
      })
      await instanceUnderTest.deprovisionEmailAlias({
        emailAliasId: emailAlias.id,
      })
    })
  })
})
