/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger } from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import _ from 'lodash'
import {
  DraftEmailMessage,
  DraftEmailMessageMetadata,
  EmailAddress,
  SudoEmailClient,
} from '../../../src'
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

    const result =
      await instanceUnderTest.listDraftEmailMessageMetadataForEmailAddressId({
        emailAddressId: emailAddress.id,
      })

    result.items.forEach((m) => {
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
    const result =
      await instanceUnderTest.listDraftEmailMessageMetadataForEmailAddressId({
        emailAddressId: emailAddress.id,
      })

    expect(result.items).toHaveLength(0)
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
      await instanceUnderTest.listDraftEmailMessageMetadataForEmailAddressId({
        emailAddressId: emailAddress.id,
      })
    expect(result.items).toHaveLength(NUMBER_DRAFTS)
  })

  it('lists multiple draft metadata across an email address with pagination', async () => {
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

    // Get first page with limit of 5
    const firstPage =
      await instanceUnderTest.listDraftEmailMessageMetadataForEmailAddressId({
        emailAddressId: emailAddress.id,
        limit: 5,
      })

    expect(firstPage.items).toHaveLength(5)
    expect(firstPage.nextToken).toBeDefined()

    // Get second page
    const secondPage =
      await instanceUnderTest.listDraftEmailMessageMetadataForEmailAddressId({
        emailAddressId: emailAddress.id,
        limit: 5,
        nextToken: firstPage.nextToken,
      })

    expect(secondPage.items).toHaveLength(4) // 9 total - 5 from first page = 4
    expect(secondPage.nextToken).toBeUndefined()

    // Verify all items are unique
    const allItems = [...firstPage.items, ...secondPage.items]
    const uniqueIds = new Set(allItems.map((item) => item.id))
    expect(uniqueIds.size).toBe(NUMBER_DRAFTS)
    expect(allItems).toHaveLength(NUMBER_DRAFTS)

    allItems.forEach((m) => {
      expect(draftData).toContainEqual({
        ...m,
        id: m.id,
        emailAddressId: m.emailAddressId,
        updatedAt: m.updatedAt,
        rfc822Data: expect.anything(),
      })
    })
  })

  it('should use default limit when no limit specified', async () => {
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
      await delay(10)
    }

    const result =
      await instanceUnderTest.listDraftEmailMessageMetadataForEmailAddressId({
        emailAddressId: emailAddress.id,
      })

    // Should return all 9 items (default limit is 10)
    expect(result.items).toHaveLength(NUMBER_DRAFTS)
    expect(result.nextToken).toBeUndefined()
  })

  it('should handle limit greater than total items', async () => {
    const draftDataArrays = _.range(3).map(() =>
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
      await delay(10)
    }

    const result =
      await instanceUnderTest.listDraftEmailMessageMetadataForEmailAddressId({
        emailAddressId: emailAddress.id,
        limit: 100,
      })

    expect(result.items).toHaveLength(3)
    expect(result.nextToken).toBeUndefined()
  })

  it('should handle pagination with limit of 1', async () => {
    const draftDataArrays = _.range(3).map(() =>
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
      await delay(10)
    }

    // Get first item
    const firstPage =
      await instanceUnderTest.listDraftEmailMessageMetadataForEmailAddressId({
        emailAddressId: emailAddress.id,
        limit: 1,
      })

    expect(firstPage.items).toHaveLength(1)
    expect(firstPage.nextToken).toBeDefined()

    // Get second item
    const secondPage =
      await instanceUnderTest.listDraftEmailMessageMetadataForEmailAddressId({
        emailAddressId: emailAddress.id,
        limit: 1,
        nextToken: firstPage.nextToken,
      })

    expect(secondPage.items).toHaveLength(1)
    expect(secondPage.nextToken).toBeDefined()

    // Get third item
    const thirdPage =
      await instanceUnderTest.listDraftEmailMessageMetadataForEmailAddressId({
        emailAddressId: emailAddress.id,
        limit: 1,
        nextToken: secondPage.nextToken,
      })

    expect(thirdPage.items).toHaveLength(1)
    expect(thirdPage.nextToken).toBeUndefined()

    // Verify all items are unique
    const allItems = [
      ...firstPage.items,
      ...secondPage.items,
      ...thirdPage.items,
    ]
    const uniqueIds = new Set(allItems.map((item) => item.id))
    expect(uniqueIds.size).toBe(3)
  })

  it('should return empty result with pagination parameters when no drafts exist', async () => {
    const result =
      await instanceUnderTest.listDraftEmailMessageMetadataForEmailAddressId({
        emailAddressId: emailAddress.id,
        limit: 5,
      })

    expect(result.items).toHaveLength(0)
    expect(result.nextToken).toBeUndefined()
  })

  it('should paginate through all items consistently', async () => {
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
      await delay(10)
    }

    // Paginate through all items with limit of 3
    const allPaginatedItems: DraftEmailMessageMetadata[] = []
    let nextToken: string | undefined = undefined
    let pageCount = 0

    do {
      const page =
        await instanceUnderTest.listDraftEmailMessageMetadataForEmailAddressId({
          emailAddressId: emailAddress.id,
          limit: 3,
          nextToken,
        })

      allPaginatedItems.push(...page.items)
      nextToken = page.nextToken
      pageCount++

      // Sanity check to prevent infinite loops
      expect(pageCount).toBeLessThan(10)
    } while (nextToken)

    // Verify we got all items
    expect(allPaginatedItems).toHaveLength(NUMBER_DRAFTS)

    // Verify all items are unique
    const uniqueIds = new Set(allPaginatedItems.map((item) => item.id))
    expect(uniqueIds.size).toBe(NUMBER_DRAFTS)

    // Verify all expected items are present
    allPaginatedItems.forEach((m) => {
      expect(draftData).toContainEqual({
        ...m,
        id: m.id,
        emailAddressId: m.emailAddressId,
        updatedAt: m.updatedAt,
        rfc822Data: expect.anything(),
      })
    })
  })
})
