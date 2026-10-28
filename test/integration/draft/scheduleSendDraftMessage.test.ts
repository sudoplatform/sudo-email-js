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
  InvalidArgumentError,
  MessageNotFoundError,
  ScheduledDraftMessageState,
  SudoEmailClient,
} from '../../../src'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'
import { provisionEmailAlias } from '../util/provisionEmailAlias'
import { Rfc822MessageDataProcessor } from '../../../src/private/util/rfc822MessageDataProcessor'
import { DateTime } from 'luxon'
import { v4 } from 'uuid'

describe('ScheduleSendDraftMessage Integration Test Suite', () => {
  const log = new DefaultLogger(
    'ScheduleSendDraftMessage Integration Test Suite',
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
      instanceUnderTest.scheduleSendDraftMessage({
        id: draftMetadata.id,
        emailAddressId: v4(),
        sendAt,
      }),
    ).rejects.toThrow(AddressNotFoundError)
  })

  it('throws InvalidArgumentError if sendAt is not in future', async () => {
    await expect(
      instanceUnderTest.scheduleSendDraftMessage({
        id: draftMetadata.id,
        emailAddressId: emailAddress.id,
        sendAt: new Date(),
      }),
    ).rejects.toThrow(InvalidArgumentError)
  })

  it('throws MessageNotFoundError if passed invalid draftId', async () => {
    await expect(
      instanceUnderTest.scheduleSendDraftMessage({
        id: v4(),
        emailAddressId: emailAddress.id,
        sendAt,
      }),
    ).rejects.toThrow(MessageNotFoundError)
  })

  it('throws MessageNotFoundError if draft belongs to another address', async () => {
    const emailAddress2 = await provisionEmailAddress(
      sudoOwnershipProofToken,
      instanceUnderTest,
    )

    await expect(
      instanceUnderTest.scheduleSendDraftMessage({
        id: v4(),
        emailAddressId: emailAddress2.id,
        sendAt,
      }),
    ).rejects.toThrow(MessageNotFoundError)
  })

  it('returns expected result on success', async () => {
    const result = await instanceUnderTest.scheduleSendDraftMessage({
      id: draftMetadata.id,
      emailAddressId: emailAddress.id,
      sendAt,
    })

    expect(result.id).toEqual(draftMetadata.id)
    expect(result.emailAddressId).toEqual(emailAddress.id)
    expect(result.sendAt).toEqual(sendAt)
    expect(result.state).toEqual(ScheduledDraftMessageState.SCHEDULED)
  })

  describe('ScheduleSendDraftMessage from email aliases', () => {
    let runTests = true
    beforeEach(async ({ skip }) => {
      const config = await instanceUnderTest.getConfigurationData()
      runTests = config.emailAliasesEnabled
      skip(!runTests, 'Email aliases are not enabled; skipping tests')
    })
    it('Schedule a draft message from a alias id', async () => {
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
