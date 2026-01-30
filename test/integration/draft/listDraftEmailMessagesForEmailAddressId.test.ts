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

describe('SudoEmailClient listDraftEmailMessagesForEmailAddressId Test Suite', () => {
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

  it('lists multiple out-network draft messages across an email address', async () => {
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

    const result =
      await instanceUnderTest.listDraftEmailMessagesForEmailAddressId({
        emailAddressId: emailAddress.id,
      })

    result.items.forEach((d) => {
      expect(draftData).toContainEqual({
        ...d,
        id: d.id,
        emailAddressId: d.emailAddressId,
        updatedAt: d.updatedAt,
        rfc822Data: expect.anything(),
      })
      const draftResDataStr = arrayBufferToString(d!.rfc822Data)
      expect(draftResDataStr).toContain(body)
      expect(draftResDataStr).toContain(emailAddress.emailAddress)
    })
  })

  it('should return an empty list if no drafts found', async () => {
    const result =
      await instanceUnderTest.listDraftEmailMessagesForEmailAddressId({
        emailAddressId: emailAddress.id,
      })

    expect(result.items).toHaveLength(0)
  })

  it('should not return a list of out-network draft messages from other accounts', async () => {
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

    const result =
      await instanceUnderTest.listDraftEmailMessagesForEmailAddressId({
        emailAddressId: emailAddress.id,
      })
    expect(result.items).toHaveLength(NUMBER_DRAFTS)
    result.items.forEach((d) => {
      expect(draftData).toContainEqual({
        ...d,
        id: d.id,
        updatedAt: d.updatedAt,
        rfc822Data: expect.anything(),
      })
      const draftResDataStr = arrayBufferToString(d!.rfc822Data)
      expect(draftResDataStr).toContain(`${body} from emailAddress1`)
      expect(draftResDataStr).toContain(emailAddress.emailAddress)
    })
  })

  it('lists multiple in-network draft messages across an email address', async () => {
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

    const result =
      await instanceUnderTest.listDraftEmailMessagesForEmailAddressId({
        emailAddressId: emailAddress.id,
      })

    result.items.forEach((d) => {
      expect(draftData).toContainEqual({
        ...d,
        id: d.id,
        emailAddressId: d.emailAddressId,
        updatedAt: d.updatedAt,
        rfc822Data: expect.anything(),
      })
      const draftResDataStr = arrayBufferToString(d!.rfc822Data)
      expect(draftResDataStr).toContain(body)
      expect(draftResDataStr).toContain(emailAddress.emailAddress)
      expect(draftResDataStr).toContain(recipientAddress.emailAddress)
    })
  })

  it('should not return a list of in-network draft messages from other accounts', async () => {
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
      to: [{ emailAddress: emailAddress.emailAddress }],
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

    const result =
      await instanceUnderTest.listDraftEmailMessagesForEmailAddressId({
        emailAddressId: emailAddress.id,
      })
    expect(result.items).toHaveLength(NUMBER_DRAFTS)
    result.items.forEach((d) => {
      expect(draftData).toContainEqual({
        ...d,
        id: d.id,
        updatedAt: d.updatedAt,
        rfc822Data: expect.anything(),
      })
      const draftResDataStr = arrayBufferToString(d!.rfc822Data)
      expect(draftResDataStr).toContain(`${body} from emailAddress1`)
      expect(draftResDataStr).toContain(emailAddress.emailAddress)
      expect(draftResDataStr).toContain(emailAddress2.emailAddress)
    })
  })

  it('supports pagination with limit parameter', async () => {
    const body = 'pagination test message'
    const totalDrafts = 15
    const draftDataArrays = _.range(totalDrafts).map(() =>
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
      await delay(10)
    }

    const result =
      await instanceUnderTest.listDraftEmailMessagesForEmailAddressId({
        emailAddressId: emailAddress.id,
        limit: 5,
      })

    expect(result.items).toHaveLength(5)
    expect(result.nextToken).toBeDefined()

    const result2 =
      await instanceUnderTest.listDraftEmailMessagesForEmailAddressId({
        emailAddressId: emailAddress.id,
        limit: 15,
        nextToken: result.nextToken,
      })

    expect(result2.items).toHaveLength(10)
    expect(result2.nextToken).toBeUndefined()

    const firstPageIds = result.items.map((d) => d.id)
    const secondPageIds = result2.items.map((d) => d.id)
    const overlap = firstPageIds.filter((id) => secondPageIds.includes(id))

    expect(overlap).toHaveLength(0)
  })

  it('returns all items across multiple pages', async () => {
    const body = 'multi-page test'
    const totalDrafts = 23
    const draftDataArrays = _.range(totalDrafts).map(() =>
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
      await delay(10)
    }

    // Fetch all pages
    const allDrafts: any[] = []
    let nextToken: string | undefined = undefined
    const pageSize = 7

    do {
      const page =
        await instanceUnderTest.listDraftEmailMessagesForEmailAddressId({
          emailAddressId: emailAddress.id,
          limit: pageSize,
          nextToken,
        })
      allDrafts.push(...page.items)
      nextToken = page.nextToken
    } while (nextToken)

    expect(allDrafts).toHaveLength(totalDrafts)

    // Verify all IDs are unique
    const uniqueIds = new Set(allDrafts.map((d) => d.id))
    expect(uniqueIds.size).toBe(totalDrafts)
  })
})
