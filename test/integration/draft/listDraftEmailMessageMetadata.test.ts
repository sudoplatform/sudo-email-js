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

describe('SudoEmailClient listDraftEmailMessageMetadata Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let sudoOwnershipProofToken: string

  let emailAddress: EmailAddress
  let emailAddresses: EmailAddress[] = []
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
    emailAddresses = [emailAddress]
  })

  afterEach(async () => {
    draftData = []

    await teardown(
      { emailAddresses, sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
    emailAddresses = []
  })

  it('lists multiple draft metadata across a user', async () => {
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

    const metadata = await instanceUnderTest.listDraftEmailMessageMetadata()

    metadata.forEach((m) => {
      expect(draftData).toContainEqual({
        ...m,
        id: m.id,
        updatedAt: m.updatedAt,
        rfc822Data: expect.anything(),
      })
    })
  })

  it('should return an empty list if no drafts found', async () => {
    const metadata = await instanceUnderTest.listDraftEmailMessageMetadata()

    expect(metadata).toHaveLength(0)
  })

  it('should list draft metadata for each address', async () => {
    const emailAddress2 = await provisionEmailAddress(
      sudoOwnershipProofToken,
      instanceUnderTest,
    )
    emailAddresses.push(emailAddress2)

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

    const result = await instanceUnderTest.listDraftEmailMessageMetadata()
    expect(result).toHaveLength(10)
  })

  it('should include drafts from multiple email addresses with correct emailAddressId', async () => {
    const emailAddress2 = await provisionEmailAddress(
      sudoOwnershipProofToken,
      instanceUnderTest,
    )
    emailAddresses.push(emailAddress2)

    const emailAddress3 = await provisionEmailAddress(
      sudoOwnershipProofToken,
      instanceUnderTest,
    )
    emailAddresses.push(emailAddress3)

    // Create drafts for first email address
    const draftsForAddress1 = 3
    for (let i = 0; i < draftsForAddress1; i++) {
      const draftData1 =
        Rfc822MessageDataProcessor.encodeToInternetMessageBuffer({
          from: [{ emailAddress: emailAddress.emailAddress }],
          to: [],
          cc: [],
          bcc: [],
          replyTo: [],
          body: `draft ${i} from address 1`,
          attachments: [],
        })
      const metadata = await instanceUnderTest.createDraftEmailMessage({
        senderEmailAddressId: emailAddress.id,
        rfc822Data: draftData1,
      })
      draftData.push({ ...metadata, rfc822Data: draftData1 })
      await delay(10)
    }

    // Create drafts for second email address
    const draftsForAddress2 = 4
    for (let i = 0; i < draftsForAddress2; i++) {
      const draftData2 =
        Rfc822MessageDataProcessor.encodeToInternetMessageBuffer({
          from: [{ emailAddress: emailAddress2.emailAddress }],
          to: [],
          cc: [],
          bcc: [],
          replyTo: [],
          body: `draft ${i} from address 2`,
          attachments: [],
        })
      const metadata = await instanceUnderTest.createDraftEmailMessage({
        senderEmailAddressId: emailAddress2.id,
        rfc822Data: draftData2,
      })
      draftData.push({ ...metadata, rfc822Data: draftData2 })
      await delay(10)
    }

    // Create drafts for third email address
    const draftsForAddress3 = 11
    for (let i = 0; i < draftsForAddress3; i++) {
      const draftData3 =
        Rfc822MessageDataProcessor.encodeToInternetMessageBuffer({
          from: [{ emailAddress: emailAddress3.emailAddress }],
          to: [],
          cc: [],
          bcc: [],
          replyTo: [],
          body: `draft ${i} from address 3`,
          attachments: [],
        })
      const metadata = await instanceUnderTest.createDraftEmailMessage({
        senderEmailAddressId: emailAddress3.id,
        rfc822Data: draftData3,
      })
      draftData.push({ ...metadata, rfc822Data: draftData3 })
      await delay(10)
    }

    const result = await instanceUnderTest.listDraftEmailMessageMetadata()

    // Verify total count
    expect(result).toHaveLength(
      draftsForAddress1 + draftsForAddress2 + draftsForAddress3,
    )

    // Verify drafts from each address are included
    const address1Drafts = result.filter(
      (d) => d.emailAddressId === emailAddress.id,
    )
    const address2Drafts = result.filter(
      (d) => d.emailAddressId === emailAddress2.id,
    )
    const address3Drafts = result.filter(
      (d) => d.emailAddressId === emailAddress3.id,
    )

    expect(address1Drafts).toHaveLength(draftsForAddress1)
    expect(address2Drafts).toHaveLength(draftsForAddress2)
    expect(address3Drafts).toHaveLength(draftsForAddress3)

    // Verify each draft has correct emailAddressId
    address1Drafts.forEach((draft) => {
      expect(draft.emailAddressId).toBe(emailAddress.id)
    })
    address2Drafts.forEach((draft) => {
      expect(draft.emailAddressId).toBe(emailAddress2.id)
    })
    address3Drafts.forEach((draft) => {
      expect(draft.emailAddressId).toBe(emailAddress3.id)
    })

    // Verify all created drafts are present
    result.forEach((m) => {
      expect(draftData).toContainEqual({
        ...m,
        id: m.id,
        updatedAt: m.updatedAt,
        rfc822Data: expect.anything(),
      })
    })
  })

  it('should aggregate drafts from multiple addresses in order', async () => {
    const emailAddress2 = await provisionEmailAddress(
      sudoOwnershipProofToken,
      instanceUnderTest,
    )
    emailAddresses.push(emailAddress2)

    // Create drafts alternating between addresses
    const totalDrafts = 6
    const createdDrafts: Array<{ id: string; emailAddressId: string }> = []

    for (let i = 0; i < totalDrafts; i++) {
      const isFirstAddress = i % 2 === 0
      const currentAddress = isFirstAddress ? emailAddress : emailAddress2

      const draftDataBuffer =
        Rfc822MessageDataProcessor.encodeToInternetMessageBuffer({
          from: [{ emailAddress: currentAddress.emailAddress }],
          to: [],
          cc: [],
          bcc: [],
          replyTo: [],
          body: `draft ${i} from ${isFirstAddress ? 'address1' : 'address2'}`,
          attachments: [],
        })

      const metadata = await instanceUnderTest.createDraftEmailMessage({
        senderEmailAddressId: currentAddress.id,
        rfc822Data: draftDataBuffer,
      })

      draftData.push({ ...metadata, rfc822Data: draftDataBuffer })
      createdDrafts.push({ id: metadata.id, emailAddressId: currentAddress.id })
      await delay(10)
    }

    const result = await instanceUnderTest.listDraftEmailMessageMetadata()

    // Verify all drafts are returned
    expect(result).toHaveLength(totalDrafts)

    // Verify each created draft is in the result with correct emailAddressId
    createdDrafts.forEach((created) => {
      const found = result.find((r) => r.id === created.id)
      expect(found).toBeDefined()
      expect(found!.emailAddressId).toBe(created.emailAddressId)
    })

    // Verify both addresses have drafts
    const address1Count = result.filter(
      (d) => d.emailAddressId === emailAddress.id,
    ).length
    const address2Count = result.filter(
      (d) => d.emailAddressId === emailAddress2.id,
    ).length

    expect(address1Count).toBe(3)
    expect(address2Count).toBe(3)
  })

  it('should handle empty results for one address while another has drafts', async () => {
    const emailAddress2 = await provisionEmailAddress(
      sudoOwnershipProofToken,
      instanceUnderTest,
    )
    emailAddresses.push(emailAddress2)

    // Create drafts only for first address
    const draftsCount = 5
    for (let i = 0; i < draftsCount; i++) {
      const draftDataBuffer =
        Rfc822MessageDataProcessor.encodeToInternetMessageBuffer({
          from: [{ emailAddress: emailAddress.emailAddress }],
          to: [],
          cc: [],
          bcc: [],
          replyTo: [],
          body: `draft ${i}`,
          attachments: [],
        })

      const metadata = await instanceUnderTest.createDraftEmailMessage({
        senderEmailAddressId: emailAddress.id,
        rfc822Data: draftDataBuffer,
      })

      draftData.push({ ...metadata, rfc822Data: draftDataBuffer })
      await delay(10)
    }

    // emailAddress2 has no drafts
    const result = await instanceUnderTest.listDraftEmailMessageMetadata()

    // Should only return drafts from first address
    expect(result).toHaveLength(draftsCount)

    // All drafts should be from first address
    result.forEach((draft) => {
      expect(draft.emailAddressId).toBe(emailAddress.id)
    })

    // No drafts from second address
    const address2Drafts = result.filter(
      (d) => d.emailAddressId === emailAddress2.id,
    )
    expect(address2Drafts).toHaveLength(0)
  })
})
