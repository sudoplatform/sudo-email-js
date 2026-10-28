/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger } from '@sudoplatform/sudo-common'
import {
  AddressNotFoundError,
  DraftEmailMessageMetadata,
  EmailAddress,
  EmailAlias,
  ScheduledDraftMessage,
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
import waitForExpect from 'wait-for-expect'

describe('CancelScheduledDraftMessage Integration Test Suite', () => {
  const log = new DefaultLogger(
    'CancelScheduledDraftMessage Integration Test Suite',
  )

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let sudoOwnershipProofToken: string

  let emailAddress: EmailAddress
  let draftMetadata: DraftEmailMessageMetadata
  let sendAt: Date

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
    draftMetadata = metadata
    sendAt = DateTime.now().plus({ day: 1 }).toJSDate()
    await instanceUnderTest.scheduleSendDraftMessage({
      id: draftMetadata.id,
      emailAddressId: emailAddress.id,
      sendAt,
    })
  })

  afterEach(async () => {
    await instanceUnderTest.deleteDraftEmailMessages({
      ids: [draftMetadata.id],
      emailAddressId: emailAddress.id,
    })
    await teardown(
      { emailAddresses: [emailAddress], sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })

  it('throws AddressNotFoundError if passed invalid emailAddressId', async () => {
    await expect(
      instanceUnderTest.cancelScheduledDraftMessage({
        id: draftMetadata.id,
        emailAddressId: v4(),
      }),
    ).rejects.toThrow(AddressNotFoundError)
  })

  it('returns success if invalid draftId', async () => {
    const id = v4()
    await expect(
      instanceUnderTest.cancelScheduledDraftMessage({
        id: id,
        emailAddressId: emailAddress.id,
      }),
    ).resolves.toEqual(id)
  })

  it('returns success if draft belongs to another address', async () => {
    const emailAddress2 = await provisionEmailAddress(
      sudoOwnershipProofToken,
      instanceUnderTest,
    )
    await expect(
      instanceUnderTest.cancelScheduledDraftMessage({
        id: draftMetadata.id,
        emailAddressId: emailAddress2.id,
      }),
    ).resolves.toEqual(draftMetadata.id)
  })

  it('returns expected result on success', async () => {
    const result = await instanceUnderTest.cancelScheduledDraftMessage({
      id: draftMetadata.id,
      emailAddressId: emailAddress.id,
    })

    expect(result).toEqual(draftMetadata.id)
    const drafts =
      await instanceUnderTest.listScheduledDraftMessagesForEmailAddressId({
        emailAddressId: emailAddress.id,
      })
    expect(drafts.items.length).toBeGreaterThan(0)
    const cancelledDraft = drafts.items.find((m) => m.id == draftMetadata.id)
    expect(cancelledDraft?.state).toEqual(ScheduledDraftMessageState.CANCELLED)
  })

  async function verifyDraftHasState(
    draftId: string,
    expectedState: ScheduledDraftMessageState,
    emailAlias?: EmailAlias,
  ): Promise<ScheduledDraftMessage | undefined> {
    const messages =
      await instanceUnderTest.listScheduledDraftMessagesForEmailAddressId({
        emailAddressId: emailAddress.id,
      })
    expect(messages.items.length).toBeGreaterThan(0)
    const aliasDraft = messages.items.find((m) => m.id === draftId)

    expect(aliasDraft?.emailAliasId).toEqual(emailAlias?.id) // will work even if undefined
    expect(aliasDraft?.emailAddressId).toEqual(emailAddress.id)
    expect(aliasDraft?.state).toEqual(expectedState)

    return aliasDraft
  }

  describe('CancelScheduledDraftMessage from email aliases', () => {
    let runTests = true
    let emailAlias: EmailAlias
    let draftIds: string[] = []

    beforeEach(async ({ skip }) => {
      const config = await instanceUnderTest.getConfigurationData()
      runTests = config.emailAliasesEnabled
      skip(!runTests, 'Email aliases are not enabled, skipping')

      // Provision an email alias associated with the provisioned address
      emailAlias = await provisionEmailAlias(
        sudoOwnershipProofToken,
        instanceUnderTest,
        {
          realAddress: emailAddress.emailAddress,
        },
      )
    })

    afterEach(async () => {
      // Clean up the alias draft
      await instanceUnderTest.deleteDraftEmailMessages({
        ids: draftIds,
        emailAddressId: emailAddress.id,
      })
      await instanceUnderTest.deprovisionEmailAlias({
        emailAliasId: emailAlias.id,
      })
      draftIds = []
    })

    it('Schedule a draft message from a alias id, then cancel it', async () => {
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
      draftIds.push(aliasDraftMetadata.id)

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

      const draft = await verifyDraftHasState(
        aliasDraftMetadata.id,
        ScheduledDraftMessageState.SCHEDULED,
        emailAlias,
      )
      expect(draft).toBeDefined()
      expect(draft?.sendAt).toEqual(sendAt)

      await instanceUnderTest.cancelScheduledDraftMessage({
        id: aliasDraftMetadata.id,
        emailAddressId: emailAddress.id,
        emailAliasId: emailAlias.id,
      })

      await waitForExpect(async () => {
        const cancelledDraft = await verifyDraftHasState(
          aliasDraftMetadata.id,
          ScheduledDraftMessageState.CANCELLED,
          emailAlias,
        )
        expect(cancelledDraft?.sendAt).toEqual(sendAt)
      })
    })

    it('Cancel should succeed but be ineffective if missing or incorrect alias id is provided', async () => {
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
      draftIds.push(aliasDraftMetadata.id)

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

      await instanceUnderTest.cancelScheduledDraftMessage({
        id: aliasDraftMetadata.id,
        emailAddressId: emailAddress.id,
      })
      // Check that the actual draft was not cancelled
      await verifyDraftHasState(
        aliasDraftMetadata.id,
        ScheduledDraftMessageState.SCHEDULED,
        emailAlias,
      )

      await instanceUnderTest.cancelScheduledDraftMessage({
        id: aliasDraftMetadata.id,
        emailAddressId: emailAddress.id,
        emailAliasId: 'invalid-alias-id',
      })
      await verifyDraftHasState(
        aliasDraftMetadata.id,
        ScheduledDraftMessageState.SCHEDULED,
        emailAlias,
      )
    })
  })
})
