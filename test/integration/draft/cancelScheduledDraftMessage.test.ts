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
  EmailMask,
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
import { provisionEmailMask } from '../util/provisionEmailMask'
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
    emailMask?: EmailMask,
  ): Promise<ScheduledDraftMessage | undefined> {
    const messages =
      await instanceUnderTest.listScheduledDraftMessagesForEmailAddressId({
        emailAddressId: emailAddress.id,
      })
    expect(messages.items.length).toBeGreaterThan(0)
    const maskDraft = messages.items.find((m) => m.id === draftId)

    expect(maskDraft?.emailMaskId).toEqual(emailMask?.id) // will work even if undefined
    expect(maskDraft?.emailAddressId).toEqual(emailAddress.id)
    expect(maskDraft?.state).toEqual(expectedState)

    return maskDraft
  }

  describe('CancelScheduledDraftMessage from email masks', () => {
    let runTests = true
    let emailMask: EmailMask
    let draftIds: string[] = []

    beforeEach(async ({ skip }) => {
      const config = await instanceUnderTest.getConfigurationData()
      runTests = config.emailMasksEnabled
      skip(!runTests, 'Email masks are not enabled, skipping')

      // Provision an email mask associated with the provisioned address
      emailMask = await provisionEmailMask(
        sudoOwnershipProofToken,
        instanceUnderTest,
        {
          realAddress: emailAddress.emailAddress,
        },
      )
    })

    afterEach(async () => {
      // Clean up the mask draft
      await instanceUnderTest.deleteDraftEmailMessages({
        ids: draftIds,
        emailAddressId: emailAddress.id,
      })
      await instanceUnderTest.deprovisionEmailMask({
        emailMaskId: emailMask.id,
      })
      draftIds = []
    })

    it('Schedule a draft message from a mask id, then cancel it', async () => {
      // Create a new draft from the mask address
      const maskDraftBuffer =
        Rfc822MessageDataProcessor.encodeToInternetMessageBuffer({
          from: [{ emailAddress: emailMask.maskAddress }],
          to: [{ emailAddress: emailAddress.emailAddress }],
          cc: [],
          bcc: [],
          replyTo: [],
          body: 'Hello from mask',
          attachments: [],
          subject: 'mask draft subject',
        })
      const maskDraftMetadata = await instanceUnderTest.createDraftEmailMessage(
        {
          rfc822Data: maskDraftBuffer,
          senderEmailAddressId: emailAddress.id,
        },
      )
      draftIds.push(maskDraftMetadata.id)

      // Schedule the draft using the mask id
      const sendAt = DateTime.now().plus({ day: 1 }).toJSDate()
      const result = await instanceUnderTest.scheduleSendDraftMessage({
        id: maskDraftMetadata.id,
        emailAddressId: emailAddress.id,
        emailMaskId: emailMask.id,
        sendAt,
      })

      // Verify that the response is consistent
      expect(result.id).toEqual(maskDraftMetadata.id)
      expect(result.emailAddressId).toEqual(emailAddress.id)
      expect(result.emailMaskId).toEqual(emailMask.id)
      expect(result.sendAt).toEqual(sendAt)
      expect(result.state).toEqual(ScheduledDraftMessageState.SCHEDULED)

      const draft = await verifyDraftHasState(
        maskDraftMetadata.id,
        ScheduledDraftMessageState.SCHEDULED,
        emailMask,
      )
      expect(draft).toBeDefined()
      expect(draft?.sendAt).toEqual(sendAt)

      await instanceUnderTest.cancelScheduledDraftMessage({
        id: maskDraftMetadata.id,
        emailAddressId: emailAddress.id,
        emailMaskId: emailMask.id,
      })

      await waitForExpect(async () => {
        const cancelledDraft = await verifyDraftHasState(
          maskDraftMetadata.id,
          ScheduledDraftMessageState.CANCELLED,
          emailMask,
        )
        expect(cancelledDraft?.sendAt).toEqual(sendAt)
      })
    })

    it('Cancel should succeed but be ineffective if missing or incorrect mask id is provided', async () => {
      // Create a new draft from the mask address
      const maskDraftBuffer =
        Rfc822MessageDataProcessor.encodeToInternetMessageBuffer({
          from: [{ emailAddress: emailMask.maskAddress }],
          to: [{ emailAddress: emailAddress.emailAddress }],
          cc: [],
          bcc: [],
          replyTo: [],
          body: 'Hello from mask',
          attachments: [],
          subject: 'mask draft subject',
        })
      const maskDraftMetadata = await instanceUnderTest.createDraftEmailMessage(
        {
          rfc822Data: maskDraftBuffer,
          senderEmailAddressId: emailAddress.id,
        },
      )
      draftIds.push(maskDraftMetadata.id)

      // Schedule the draft using the mask id
      const sendAt = DateTime.now().plus({ day: 1 }).toJSDate()
      const result = await instanceUnderTest.scheduleSendDraftMessage({
        id: maskDraftMetadata.id,
        emailAddressId: emailAddress.id,
        emailMaskId: emailMask.id,
        sendAt,
      })

      // Verify that the response is consistent
      expect(result.id).toEqual(maskDraftMetadata.id)
      expect(result.emailAddressId).toEqual(emailAddress.id)
      expect(result.emailMaskId).toEqual(emailMask.id)
      expect(result.sendAt).toEqual(sendAt)
      expect(result.state).toEqual(ScheduledDraftMessageState.SCHEDULED)

      await instanceUnderTest.cancelScheduledDraftMessage({
        id: maskDraftMetadata.id,
        emailAddressId: emailAddress.id,
      })
      // Check that the actual draft was not cancelled
      await verifyDraftHasState(
        maskDraftMetadata.id,
        ScheduledDraftMessageState.SCHEDULED,
        emailMask,
      )

      await instanceUnderTest.cancelScheduledDraftMessage({
        id: maskDraftMetadata.id,
        emailAddressId: emailAddress.id,
        emailMaskId: 'invalid-mask-id',
      })
      await verifyDraftHasState(
        maskDraftMetadata.id,
        ScheduledDraftMessageState.SCHEDULED,
        emailMask,
      )
    })
  })
})
