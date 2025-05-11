/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
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
import { Rfc822MessageDataProcessor } from '../../../src/private/util/rfc822MessageDataProcessor'
import { DateTime } from 'luxon'
import { v4 } from 'uuid'

describe('ScheduleSendDraftMessage Integration Test Suite', () => {
  jest.setTimeout(240000)
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
})
