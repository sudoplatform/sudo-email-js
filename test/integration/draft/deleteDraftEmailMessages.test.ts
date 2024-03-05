/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger } from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import _ from 'lodash'
import { v4 } from 'uuid'
import {
  AddressNotFoundError,
  BatchOperationResultStatus,
  DraftEmailMessageMetadata,
  EmailAddress,
  SudoEmailClient,
} from '../../../src'
import { delay } from '../../util/delay'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'
import { Rfc822MessageParser } from '../../../src/private/util/rfc822MessageParser'

describe('SudoEmailClient deleteDraftEmailMessages Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let sudoOwnershipProofToken: string

  let emailAddress: EmailAddress
  let draftMetadata: DraftEmailMessageMetadata

  beforeAll(async () => {
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

  beforeEach(async () => {
    const draftEmailMessageBuffer =
      Rfc822MessageParser.encodeToRfc822DataBuffer({
        from: [{ emailAddress: emailAddress.emailAddress }],
        to: [],
        cc: [],
        bcc: [],
        replyTo: [],
        body: 'test draft message',
        attachments: [],
      })
    draftMetadata = await instanceUnderTest.createDraftEmailMessage({
      rfc822Data: draftEmailMessageBuffer,
      senderEmailAddressId: emailAddress.id,
    })
  })

  afterEach(async () => {
    await instanceUnderTest.deleteDraftEmailMessages({
      emailAddressId: emailAddress.id,
      ids: [draftMetadata.id],
    })
    await delay(1000)
  })

  afterAll(async () => {
    await teardown(
      { emailAddresses: [emailAddress], sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })

  it('deletes a draft successfully', async () => {
    await expect(
      instanceUnderTest.deleteDraftEmailMessages({
        emailAddressId: emailAddress.id,
        ids: [draftMetadata.id],
      }),
    ).resolves.toStrictEqual({ status: BatchOperationResultStatus.Success })
  })
  it('throws an error if delete performed against a non-existent address', async () => {
    await expect(
      instanceUnderTest.deleteDraftEmailMessages({
        emailAddressId: v4(),
        ids: [draftMetadata.id],
      }),
    ).rejects.toThrow(AddressNotFoundError)
  })
  it("returns success when deleting a record that doesn't exist", async () => {
    await expect(
      instanceUnderTest.deleteDraftEmailMessages({
        emailAddressId: emailAddress.id,
        ids: ['non-existent'],
      }),
    ).resolves.toStrictEqual({ status: BatchOperationResultStatus.Success })
  })
  it('returns success when deleting a fake and real record in one operation', async () => {
    await expect(
      instanceUnderTest.deleteDraftEmailMessages({
        emailAddressId: emailAddress.id,
        ids: ['non-existent', draftMetadata.id],
      }),
    ).resolves.toStrictEqual({ status: BatchOperationResultStatus.Success })
  })

  it('deletes multiple drafts in one operation successfully', async () => {
    const draftBuffers = _.range(9).map(() =>
      Rfc822MessageParser.encodeToRfc822DataBuffer({
        from: [{ emailAddress: emailAddress.emailAddress }],
        to: [],
        cc: [],
        bcc: [],
        replyTo: [],
        body: 'test draft message',
        attachments: [],
      }),
    )
    const draftMetadata = await Promise.all(
      draftBuffers.map(
        async (ds) =>
          await instanceUnderTest.createDraftEmailMessage({
            senderEmailAddressId: emailAddress.id,
            rfc822Data: ds,
          }),
      ),
    )
    const deleteResult = await instanceUnderTest.deleteDraftEmailMessages({
      emailAddressId: emailAddress.id,
      ids: draftMetadata.map((m) => m.id),
    })
    log.info('delete result', { deleteResult })
    expect(deleteResult).toStrictEqual({
      status: BatchOperationResultStatus.Success,
    })
    // await expect(
    //   instanceUnderTest.deleteDraftEmailMessages({
    //     emailAddressId: emailAddress.id,
    //     ids: draftMetadata.map((m) => m.id),
    //   }),
    // ).resolves.toStrictEqual({ status: BatchOperationResultStatus.Success })
  })
})
