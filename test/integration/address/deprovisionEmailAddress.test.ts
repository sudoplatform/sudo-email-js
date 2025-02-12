/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CachePolicy,
  DefaultLogger,
  KeyData,
  SudoCryptoProvider,
} from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import waitForExpect from 'wait-for-expect'
import {
  AddressNotFoundError,
  EmailAddress,
  SudoEmailClient,
} from '../../../src'
import { Rfc822MessageDataProcessor } from '../../../src/private/util/rfc822MessageDataProcessor'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'

describe('SudoEmailClient DeprovisionEmailAddress Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let userClient: SudoUserClient
  let sudo: Sudo
  let ownershipProofToken: string
  let cryptoProvider: SudoCryptoProvider

  beforeEach(async () => {
    const result = await setupEmailClient(log)
    cryptoProvider = result.cryptoProviders.email
    instanceUnderTest = result.emailClient
    profilesClient = result.profilesClient
    userClient = result.userClient
    sudo = result.sudo
    ownershipProofToken = result.ownershipProofToken
  })

  afterEach(async () => {
    await teardown(
      { emailAddresses: [], sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
  })

  async function sendEmailMessage(
    emailAddress: EmailAddress,
    body: string,
  ): Promise<string> {
    const result = await instanceUnderTest.sendEmailMessage({
      senderEmailAddressId: emailAddress.id,
      emailMessageHeader: {
        from: { emailAddress: emailAddress.emailAddress },
        to: [{ emailAddress: 'ooto@simulator.amazonses.com' }],
        cc: [],
        bcc: [],
        replyTo: [],
        subject: '',
      },
      body,
      attachments: [],
      inlineAttachments: [],
    })

    return result.id
  }

  it('returns expected output and clean up keys', async () => {
    const emailAddress = await provisionEmailAddress(
      ownershipProofToken,
      instanceUnderTest,
    )
    expect(emailAddress.numberOfEmailMessages).toStrictEqual(0)

    const toBeDeletedKeys = await cryptoProvider.exportKeys()
    expect(toBeDeletedKeys.length).toBe(5)

    await provisionEmailAddress(ownershipProofToken, instanceUnderTest)

    const allKeys = await cryptoProvider.exportKeys()
    expect(allKeys.length).toBe(7)

    const deprovisionedEmailAddress =
      await instanceUnderTest.deprovisionEmailAddress(emailAddress.id)
    expect(deprovisionedEmailAddress).toStrictEqual({
      ...emailAddress,
      folders: [],
    })

    const remainKeys = await cryptoProvider.exportKeys()
    expect(remainKeys).not.toContain(toBeDeletedKeys)
    expect(allKeys).not.toContain(remainKeys)
  })

  it('throws an error when non-existent email is attempted to be deprovisioned', async () => {
    await expect(
      instanceUnderTest.deprovisionEmailAddress('non-existent-id'),
    ).rejects.toThrow(AddressNotFoundError)
  })

  it('cleans up email message records', async () => {
    const emailAddress = await provisionEmailAddress(
      ownershipProofToken,
      instanceUnderTest,
    )
    const emailBodies = ['Hello, World', 'Goodbye, cruel world']
    const emailMessagesIds: string[] = []
    await Promise.all(
      emailBodies.map(async (emailBody) =>
        emailMessagesIds.push(await sendEmailMessage(emailAddress, emailBody)),
      ),
    )
    log.debug('emailMessageIds', { emailMessagesIds })
    expect(emailMessagesIds.length).toEqual(2)

    await expect(
      instanceUnderTest.deprovisionEmailAddress(emailAddress.id),
    ).resolves.toBeDefined()

    for (const emailMessageId of emailMessagesIds) {
      await waitForExpect(
        async () => {
          await expect(
            instanceUnderTest.getEmailMessageRfc822Data({
              id: emailMessageId,
              emailAddressId: emailAddress.id,
            }),
          ).resolves.toBeUndefined()
        },
        60000,
        10000,
      )
    }

    for (const emailMessageId of emailMessagesIds) {
      await waitForExpect(
        async () => {
          await expect(
            instanceUnderTest.getEmailMessage({
              id: emailMessageId,
              cachePolicy: CachePolicy.RemoteOnly,
            }),
          ).resolves.toBeUndefined()
        },
        60000,
        10000,
      )
    }
  })

  // Temporarily disabled until completion of PEMC-1039
  xdescribe('Singleton Public Key tests', () => {
    let instanceUnderTest: SudoEmailClient
    let profilesClient: SudoProfilesClient
    let userClient: SudoUserClient
    let sudo: Sudo
    let ownershipProofToken: string
    let cryptoProvider: SudoCryptoProvider

    beforeEach(async () => {
      const result = await setupEmailClient(log, {
        enforceSingletonPublicKey: true,
      })
      cryptoProvider = result.cryptoProviders.email
      result.cryptoProviders
      instanceUnderTest = result.emailClient
      profilesClient = result.profilesClient
      userClient = result.userClient
      sudo = result.sudo
      ownershipProofToken = result.ownershipProofToken
    })

    afterEach(async () => {
      await teardown(
        { emailAddresses: [], sudos: [sudo] },
        { emailClient: instanceUnderTest, profilesClient, userClient },
      )
    })

    it('correctly deprovisions email addresses', async () => {
      // With `enforceSingletonPublicKey` enabled, these two emails will be provisioned
      // with the same Public Key retrieved from the key manager.
      const provisioned = await Promise.all([
        provisionEmailAddress(ownershipProofToken, instanceUnderTest),
        provisionEmailAddress(ownershipProofToken, instanceUnderTest),
      ])

      const keys = await cryptoProvider.exportKeys()
      expect(keys.length).toEqual(6)

      // Email addresses should be deprovisioned without issue
      await Promise.all([
        expect(
          instanceUnderTest.deprovisionEmailAddress(provisioned[0].id),
        ).resolves.toStrictEqual({
          ...provisioned[0],
          folders: [],
        }),
        expect(
          instanceUnderTest.deprovisionEmailAddress(provisioned[1].id),
        ).resolves.toStrictEqual({
          ...provisioned[1],
          folders: [],
        }),
      ])

      // Deprovisioning addresses should delete anything from the keychain
      await expect(cryptoProvider.exportKeys()).resolves.toStrictEqual(keys)
    })
  })
})
