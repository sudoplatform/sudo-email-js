/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger } from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { v4 } from 'uuid'
import {
  AddressNotFoundError,
  DraftEmailMessageMetadata,
  EmailAddress,
  MessageNotFoundError,
  SudoEmailClient,
} from '../../../src'
import { str2ab } from '../../util/buffer'
import { delay } from '../../util/delay'
import { createEmailMessageRfc822String } from '../util/createEmailMessage'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'

describe('SudoEmailClient updateDraftEmailMessage Test Suite', () => {
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

  it('updates a draft successfully', async () => {
    const draftString = createEmailMessageRfc822String({
      from: [{ emailAddress: emailAddress.emailAddress }],
      to: [],
      cc: [],
      bcc: [],
      replyTo: [],
      body: 'Hello, World',
      attachments: [],
    })
    const metadata = await instanceUnderTest.createDraftEmailMessage({
      rfc822Data: str2ab(draftString),
      senderEmailAddressId: emailAddress.id,
    })

    await delay(1000)

    draftMetadata.push(metadata)
    const updatedDraftString = createEmailMessageRfc822String({
      from: [{ emailAddress: emailAddress.emailAddress }],
      to: [],
      cc: [],
      bcc: [],
      replyTo: [],
      body: 'Goodbye, World',
      attachments: [],
    })
    const updatedMetadata = await instanceUnderTest.updateDraftEmailMessage({
      id: metadata.id,
      rfc822Data: str2ab(updatedDraftString),
      senderEmailAddressId: emailAddress.id,
    })
    expect(updatedMetadata.id).toEqual(metadata.id)
    expect(updatedMetadata.updatedAt.getTime()).toBeGreaterThan(
      metadata.updatedAt.getTime(),
    )

    await expect(
      instanceUnderTest.getDraftEmailMessage({
        id: metadata.id,
        emailAddressId: emailAddress.id,
      }),
    ).resolves.toStrictEqual({
      ...updatedMetadata,
      rfc822Data: new TextEncoder().encode(updatedDraftString),
    })
  })

  it('throws an error if a non-existent draft message id is given', async () => {
    const draftString = createEmailMessageRfc822String({
      from: [{ emailAddress: emailAddress.emailAddress }],
      to: [],
      cc: [],
      bcc: [],
      replyTo: [],
      body: 'Hello, World',
      attachments: [],
    })
    await expect(
      instanceUnderTest.updateDraftEmailMessage({
        id: v4(),
        rfc822Data: str2ab(draftString),
        senderEmailAddressId: emailAddress.id,
      }),
    ).rejects.toThrow(MessageNotFoundError)
  })
  it('throws an error if an non-existent email address id is given', async () => {
    const draftString = createEmailMessageRfc822String({
      from: [{ emailAddress: emailAddress.emailAddress }],
      to: [],
      cc: [],
      bcc: [],
      replyTo: [],
      body: 'Hello, World',
      attachments: [],
    })
    const metadata = await instanceUnderTest.createDraftEmailMessage({
      rfc822Data: str2ab(draftString),
      senderEmailAddressId: emailAddress.id,
    })
    draftMetadata.push(metadata)

    const updatedDraftString = createEmailMessageRfc822String({
      from: [{ emailAddress: emailAddress.emailAddress }],
      to: [],
      cc: [],
      bcc: [],
      replyTo: [],
      body: 'Goodbye, World',
      attachments: [],
    })
    await expect(
      instanceUnderTest.updateDraftEmailMessage({
        id: metadata.id,
        rfc822Data: str2ab(updatedDraftString),
        senderEmailAddressId: v4(),
      }),
    ).rejects.toThrow(AddressNotFoundError)
  })
})
