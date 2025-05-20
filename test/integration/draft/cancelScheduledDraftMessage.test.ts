/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, ServiceError } from '@sudoplatform/sudo-common'
import {
  AddressNotFoundError,
  DraftEmailMessageMetadata,
  EmailAddress,
  RecordNotFoundError,
  SudoEmailClient,
} from '../../../src'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'
import { Rfc822MessageDataProcessor } from '../../../src/private/util/rfc822MessageDataProcessor'
import { DateTime } from 'luxon'
import { v4 } from 'uuid'

describe('CancelScheduledDraftMessage Integration Test Suite', () => {
  jest.setTimeout(240000)
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

  it('throws RecordNotFoundError if passed and invalid draftId', async () => {
    await expect(
      instanceUnderTest.cancelScheduledDraftMessage({
        id: v4(),
        emailAddressId: emailAddress.id,
      }),
    ).rejects.toThrow(RecordNotFoundError)
  })

  it('throws if draft belongs to another address', async () => {
    const emailAddress2 = await provisionEmailAddress(
      sudoOwnershipProofToken,
      instanceUnderTest,
    )

    await expect(
      instanceUnderTest.cancelScheduledDraftMessage({
        id: v4(),
        emailAddressId: emailAddress2.id,
      }),
    ).rejects.toThrow(RecordNotFoundError)
  })

  it('returns expected result on success', async () => {
    const result = await instanceUnderTest.cancelScheduledDraftMessage({
      id: draftMetadata.id,
      emailAddressId: emailAddress.id,
    })

    expect(result).toEqual(draftMetadata.id)
  })
})
