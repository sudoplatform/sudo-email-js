/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger } from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import _ from 'lodash'
import { DraftEmailMessage, EmailAddress, SudoEmailClient } from '../../../src'
import { Rfc822MessageDataProcessor } from '../../../src/private/util/rfc822MessageDataProcessor'
import { delay } from '../../util/delay'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'

describe('SudoEmailClient listDraftEmailMessageMetadataForEmailAddressId Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let sudoOwnershipProofToken: string

  let emailAddress: EmailAddress
  let draftData: DraftEmailMessage[] = []
  const NUMBER_DRAFTS = 9

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
    const draftIds = draftData.map(({ id }) => id)

    await instanceUnderTest.deleteDraftEmailMessages({
      ids: draftIds,
      emailAddressId: emailAddress.id,
    })
    draftData = []
    await teardown(
      { emailAddresses: [emailAddress], sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })

  it('lists multiple draft metadata across an email address', async () => {
    const draftDataArrays = _.range(NUMBER_DRAFTS).map(() =>
      Rfc822MessageDataProcessor.encodeToInternetMessageBuffer({
        from: [{ emailAddress: emailAddress.emailAddress }],
        to: [],
        cc: [],
        bcc: [],
        replyTo: [],
        body: 'test draft message',
        attachments: [],
      }),
    )

    for (let d of draftDataArrays) {
      const metadata = await instanceUnderTest.createDraftEmailMessage({
        senderEmailAddressId: emailAddress.id,
        rfc822Data: d,
      })
      draftData.push({ ...metadata, rfc822Data: d })
      // delay to avoid hitting request limit
      await delay(10)
    }

    const metadata =
      await instanceUnderTest.listDraftEmailMessageMetadataForEmailAddressId(
        emailAddress.id,
      )

    metadata.forEach((m) => {
      expect(draftData).toContainEqual({
        ...m,
        id: m.id,
        emailAddressId: m.emailAddressId,
        updatedAt: m.updatedAt,
        rfc822Data: expect.anything(),
      })
    })
  })

  it('should return an empty list if no drafts found', async () => {
    const metadata =
      await instanceUnderTest.listDraftEmailMessageMetadataForEmailAddressId(
        emailAddress.id,
      )

    expect(metadata).toHaveLength(0)
  })

  it('should not return a list of draft metadata from other accounts', async () => {
    const emailAddress2 = await provisionEmailAddress(
      sudoOwnershipProofToken,
      instanceUnderTest,
    )

    const draftDataArrays = _.range(NUMBER_DRAFTS).map(() =>
      Rfc822MessageDataProcessor.encodeToInternetMessageBuffer({
        from: [{ emailAddress: emailAddress.emailAddress }],
        to: [],
        cc: [],
        bcc: [],
        replyTo: [],
        body: 'test draft message',
        attachments: [],
      }),
    )

    for (let d of draftDataArrays) {
      const metadata = await instanceUnderTest.createDraftEmailMessage({
        senderEmailAddressId: emailAddress.id,
        rfc822Data: d,
      })
      draftData.push({ ...metadata, rfc822Data: d })
      // delay to avoid hitting request limit
      await delay(10)
    }

    const draft = Rfc822MessageDataProcessor.encodeToInternetMessageBuffer({
      from: [{ emailAddress: emailAddress2.emailAddress }],
      to: [],
      cc: [],
      bcc: [],
      replyTo: [],
      body: 'test draft message',
      attachments: [],
    })
    const metadata2 = await instanceUnderTest.createDraftEmailMessage({
      senderEmailAddressId: emailAddress2.id,
      rfc822Data: draft,
    })
    draftData.push({ ...metadata2, rfc822Data: draft })

    const result =
      await instanceUnderTest.listDraftEmailMessageMetadataForEmailAddressId(
        emailAddress.id,
      )
    expect(result).toHaveLength(NUMBER_DRAFTS)
  })
})
