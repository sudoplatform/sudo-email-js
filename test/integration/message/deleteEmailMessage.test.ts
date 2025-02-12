/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger } from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import waitForExpect from 'wait-for-expect'
import { EmailAddress, SudoEmailClient } from '../../../src'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'

describe('SudoEmailClient DeleteEmailMessage Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let emailAddresses: EmailAddress[] = []

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let ownershipProofToken: string

  let emailAddress: EmailAddress

  beforeEach(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    profilesClient = result.profilesClient
    userClient = result.userClient
    sudo = result.sudo
    ownershipProofToken = result.ownershipProofToken

    emailAddress = await provisionEmailAddress(
      ownershipProofToken,
      instanceUnderTest,
    )
    emailAddresses.push(emailAddress)
  })

  afterEach(async () => {
    await teardown(
      { emailAddresses, sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
    emailAddresses = []
  })

  it('returns undefined if an email message that does not exist is deleted', async () => {
    await expect(
      instanceUnderTest.deleteEmailMessage('does-not-exist'),
    ).resolves.toBeUndefined()
  })
  it('deletes a single existing email message', async () => {
    const result = await instanceUnderTest.sendEmailMessage({
      senderEmailAddressId: emailAddress.id,
      emailMessageHeader: {
        from: { emailAddress: emailAddress.emailAddress },
        to: [{ emailAddress: 'ooto@simulator.amazonses.com' }],
        cc: [],
        bcc: [],
        replyTo: [],
        subject: 'Test',
      },
      body: 'Hello, World',
      attachments: [],
      inlineAttachments: [],
    })
    await waitForExpect(
      async () =>
        await expect(
          instanceUnderTest.deleteEmailMessage(result.id),
        ).resolves.toStrictEqual({ id: result.id }),
      30000,
      1000,
    )
  })
})
