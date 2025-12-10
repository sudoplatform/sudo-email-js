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
import { arrayBufferToString } from '../../../src/private/util/buffer'

describe('SudoEmailClient listDraftEmailMessages Test Suite', () => {
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
    draftData = []

    await teardown(
      { emailAddresses: [emailAddress], sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })

  it('lists multiple out-network draft messages across a user', async () => {
    const body = 'test draft message'
    const draftDataArrays = _.range(NUMBER_DRAFTS).map(() =>
      Rfc822MessageDataProcessor.encodeToInternetMessageBuffer({
        from: [{ emailAddress: emailAddress.emailAddress }],
        to: [],
        cc: [],
        bcc: [],
        replyTo: [],
        body,
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

    const draftMessages = await instanceUnderTest.listDraftEmailMessages()

    draftMessages.forEach((d) => {
      expect(draftData).toContainEqual({
        ...d,
        id: d.id,
        updatedAt: d.updatedAt,
        rfc822Data: expect.anything(),
      })
      const draftResDataStr = arrayBufferToString(d!.rfc822Data)
      expect(draftResDataStr).toContain(body)
      expect(draftResDataStr).toContain(emailAddress.emailAddress)
    })
  })

  it('should return an empty list if no drafts found', async () => {
    const draftMessages = await instanceUnderTest.listDraftEmailMessages()

    expect(draftMessages).toHaveLength(0)
  })

  it('should list out-network drafts for each address', async () => {
    const emailAddress2 = await provisionEmailAddress(
      sudoOwnershipProofToken,
      instanceUnderTest,
    )

    const body = 'test draft message'
    const draftDataArrays = _.range(NUMBER_DRAFTS).map(() =>
      Rfc822MessageDataProcessor.encodeToInternetMessageBuffer({
        from: [{ emailAddress: emailAddress.emailAddress }],
        to: [],
        cc: [],
        bcc: [],
        replyTo: [],
        body: `${body} from emailAddress1`,
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
      body: `${body} from emailAddress2`,
      attachments: [],
    })
    const metadata2 = await instanceUnderTest.createDraftEmailMessage({
      senderEmailAddressId: emailAddress2.id,
      rfc822Data: draft,
    })
    draftData.push({ ...metadata2, rfc822Data: draft })

    const result = await instanceUnderTest.listDraftEmailMessages()
    expect(result).toHaveLength(10)
    result.forEach((d) => {
      expect(draftData).toContainEqual({
        ...d,
        id: d.id,
        updatedAt: d.updatedAt,
        rfc822Data: expect.anything(),
      })
      const draftResDataStr = arrayBufferToString(d!.rfc822Data)
      expect(draftResDataStr).toContain(body)
      if (draftResDataStr.includes('from emailAddress1')) {
        expect(draftResDataStr).toContain(emailAddress.emailAddress)
      } else {
        expect(draftResDataStr).toContain(emailAddress2.emailAddress)
      }
    })
  })

  it('lists multiple in-network draft messages across a user', async () => {
    const recipientAddress = await provisionEmailAddress(
      sudoOwnershipProofToken,
      instanceUnderTest,
    )
    const body = 'test draft message'
    const draftDataArrays = _.range(NUMBER_DRAFTS).map(() =>
      Rfc822MessageDataProcessor.encodeToInternetMessageBuffer({
        from: [{ emailAddress: emailAddress.emailAddress }],
        to: [{ emailAddress: recipientAddress.emailAddress }],
        cc: [],
        bcc: [],
        replyTo: [],
        body,
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

    const draftMessages = await instanceUnderTest.listDraftEmailMessages()

    draftMessages.forEach((d) => {
      expect(draftData).toContainEqual({
        ...d,
        id: d.id,
        updatedAt: d.updatedAt,
        rfc822Data: expect.anything(),
      })
      const draftResDataStr = arrayBufferToString(d!.rfc822Data)
      expect(draftResDataStr).toContain(body)
      expect(draftResDataStr).toContain(emailAddress.emailAddress)
      expect(draftResDataStr).toContain(recipientAddress.emailAddress)
    })
  })

  it('should list in-network drafts for each address', async () => {
    const emailAddress2 = await provisionEmailAddress(
      sudoOwnershipProofToken,
      instanceUnderTest,
    )
    const body = 'test draft message'
    const draftDataArrays = _.range(NUMBER_DRAFTS).map(() =>
      Rfc822MessageDataProcessor.encodeToInternetMessageBuffer({
        from: [{ emailAddress: emailAddress.emailAddress }],
        to: [{ emailAddress: emailAddress2.emailAddress }],
        cc: [],
        bcc: [],
        replyTo: [],
        body,
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
      to: [{ emailAddress: emailAddress.emailAddress }],
      cc: [],
      bcc: [],
      replyTo: [],
      body,
      attachments: [],
    })
    const metadata2 = await instanceUnderTest.createDraftEmailMessage({
      senderEmailAddressId: emailAddress2.id,
      rfc822Data: draft,
    })
    draftData.push({ ...metadata2, rfc822Data: draft })

    const result = await instanceUnderTest.listDraftEmailMessages()
    expect(result).toHaveLength(10)
    result.forEach((d) => {
      expect(draftData).toContainEqual({
        ...d,
        id: d.id,
        updatedAt: d.updatedAt,
        rfc822Data: expect.anything(),
      })
      const draftResDataStr = arrayBufferToString(d!.rfc822Data)
      expect(draftResDataStr).toContain(body)
      expect(draftResDataStr).toContain(emailAddress.emailAddress)
      expect(draftResDataStr).toContain(emailAddress2.emailAddress)
    })
  })
})
