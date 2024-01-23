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
import { str2ab } from '../../util/buffer'
import { createEmailMessageRfc822String } from '../util/createEmailMessage'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'

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

    await expect(
      instanceUnderTest.getDraftEmailMessage({
        id: metadata.id,
        emailAddressId: emailAddress.id,
      }),
    ).resolves.toEqual<DraftEmailMessage>({
      ...metadata,
      rfc822Data: new TextEncoder().encode(draftString),
    })
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
    await expect(
      instanceUnderTest.createDraftEmailMessage({
        rfc822Data: str2ab(draftString),
        senderEmailAddressId: v4(),
      }),
    ).rejects.toThrow(AddressNotFoundError)
  })
  it('handles creation of a 1MB draft message', async () => {
    const oneMbBody = '0'.repeat(1 * 1024 * 1024)
    const message = createEmailMessageRfc822String({
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
      rfc822Data: str2ab(message),
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
