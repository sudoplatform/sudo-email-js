/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
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
  SudoEmailClient,
} from '../../../src'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'
import { Rfc822MessageDataProcessor } from '../../../src/private/util/rfc822MessageDataProcessor'

// Workaround for a bug in jest where `instanceof` does not return the
// correct result when running  in `jsdom` test environment.
global.Uint8Array = Uint8Array

describe('SudoEmailClient getDraftEmailMessage Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let sudoOwnershipProofToken: string

  let emailAddress: EmailAddress
  let draftContents: ArrayBuffer
  let draftMetadata: DraftEmailMessageMetadata

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
    draftContents = Rfc822MessageDataProcessor.encodeToInternetMessageBuffer({
      from: [{ emailAddress: emailAddress.emailAddress }],
      to: [],
      cc: [],
      bcc: [],
      replyTo: [],
      body: 'test draft message',
      attachments: [],
    })
    draftMetadata = await instanceUnderTest.createDraftEmailMessage({
      rfc822Data: draftContents,
      senderEmailAddressId: emailAddress.id,
    })
  })

  afterEach(async () => {
    await instanceUnderTest
      .deleteDraftEmailMessages({
        ids: [draftMetadata.id],
        emailAddressId: emailAddress.id,
      })
      .catch((err) => {
        if (err instanceof AddressNotFoundError) {
          return
        }
        throw err
      })
    await teardown(
      { emailAddresses: [emailAddress], sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })

  it('returns successful draft', async () => {
    const draft = await instanceUnderTest.getDraftEmailMessage({
      id: draftMetadata.id,
      emailAddressId: emailAddress.id,
    })

    expect(draft).toEqual({
      ...draftMetadata,
      rfc822Data: draftContents,
    })
  })

  it('returns undefined if message id cannot be found', async () => {
    await expect(
      instanceUnderTest.getDraftEmailMessage({
        id: v4(),
        emailAddressId: emailAddress.id,
      }),
    ).resolves.toBeUndefined()
  })

  it('returns undefined if email address id cannot be found', async () => {
    await expect(
      instanceUnderTest.getDraftEmailMessage({
        id: draftMetadata.id,
        emailAddressId: v4(),
      }),
    ).resolves.toBeUndefined()
  })
})
