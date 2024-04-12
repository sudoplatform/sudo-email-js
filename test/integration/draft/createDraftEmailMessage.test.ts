/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger } from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { v4 } from 'uuid'
import {
  AddressNotFoundError,
  DraftEmailMessage,
  DraftEmailMessageMetadata,
  EmailAddress,
  SudoEmailClient,
} from '../../../src'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'
import { Rfc822MessageDataProcessor } from '../../../src/private/util/rfc822MessageDataProcessor'
import {
  arrayBufferToString,
  stringToArrayBuffer,
} from '../../../src/private/util/buffer'

describe('SudoEmailClient createDraftEmailMessage Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let sudoOwnershipProofToken: string

  let emailAddress: EmailAddress
  let draftMetadata: DraftEmailMessageMetadata[] = []

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
  })

  afterEach(async () => {
    const draftIds = draftMetadata.map((m) => m.id)
    await instanceUnderTest.deleteDraftEmailMessages({
      ids: draftIds,
      emailAddressId: emailAddress.id,
    })
    draftMetadata = []
    await teardown(
      { emailAddresses: [emailAddress], sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })

  it('creates a draft successfully', async () => {
    const draftBuffer =
      Rfc822MessageDataProcessor.encodeToInternetMessageBuffer({
        from: [{ emailAddress: emailAddress.emailAddress }],
        to: [],
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
    draftMetadata.push(metadata)

    const draftRes = await instanceUnderTest.getDraftEmailMessage({
      id: metadata.id,
      emailAddressId: emailAddress.id,
    })
    const draftResDataStr = arrayBufferToString(draftRes!.rfc822Data)

    expect(draftRes).toEqual<DraftEmailMessage>({
      ...metadata,
      rfc822Data: draftBuffer,
    })
  })

  it('throws an error if an non-existent email address id is given', async () => {
    const draftBuffer =
      Rfc822MessageDataProcessor.encodeToInternetMessageBuffer({
        from: [{ emailAddress: emailAddress.emailAddress }],
        to: [],
        cc: [],
        bcc: [],
        replyTo: [],
        body: 'Hello, World',
        attachments: [],
      })
    await expect(
      instanceUnderTest.createDraftEmailMessage({
        rfc822Data: draftBuffer,
        senderEmailAddressId: v4(),
      }),
    ).rejects.toThrow(AddressNotFoundError)
  })
  it('handles creation of a 1MB draft message', async () => {
    const oneMbBody = '0'.repeat(1 * 1024 * 1024)
    const message = Rfc822MessageDataProcessor.encodeToInternetMessageBuffer({
      from: [{ emailAddress: emailAddress.emailAddress }],
      to: [],
      cc: [],
      bcc: [],
      replyTo: [],
      body: oneMbBody,
      attachments: [],
    })
    const metadata = await instanceUnderTest.createDraftEmailMessage({
      senderEmailAddressId: emailAddress.id,
      rfc822Data: message,
    })
    draftMetadata.push(metadata)
    await expect(
      instanceUnderTest.getDraftEmailMessage({
        id: metadata.id,
        emailAddressId: emailAddress.id,
      }),
    ).resolves.toBeDefined()
  })
})
