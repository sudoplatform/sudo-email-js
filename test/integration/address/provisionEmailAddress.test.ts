/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DefaultLogger,
  InsufficientEntitlementsError,
  ListOperationResultStatus,
} from '@sudoplatform/sudo-common'
import { SudoEntitlementsClient } from '@sudoplatform/sudo-entitlements'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import _ from 'lodash'
import { v4 } from 'uuid'
import {
  AddressUnavailableError,
  EmailAddress,
  InvalidAddressError,
  SudoEmailClient,
} from '../../../src'
import {
  setupEmailClient,
  sudoIssuer,
  teardown,
} from '../util/emailClientLifecycle'
import { emailAddressMaxPerSudoEntitlement } from '../util/entitlements'
import {
  generateSafeLocalPart,
  provisionEmailAddress,
} from '../util/provisionEmailAddress'
import waitForExpect from 'wait-for-expect'

describe('SudoEmailClient ProvisionEmailAddress Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let emailAddresses: EmailAddress[] = []

  let instanceUnderTest: SudoEmailClient
  let userClient: SudoUserClient
  let entitlementsClient: SudoEntitlementsClient
  let profilesClient: SudoProfilesClient
  let sudo: Sudo
  let ownershipProofToken: string

  beforeEach(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    userClient = result.userClient
    entitlementsClient = result.entitlementsClient
    profilesClient = result.profilesClient
    sudo = result.sudo
    ownershipProofToken = result.ownershipProofToken
  })

  afterEach(async () => {
    await teardown(
      { emailAddresses, sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
    emailAddresses = []
  })

  it('returns expected output', async () => {
    const localPart = generateSafeLocalPart()
    const emailAddressAlias = 'Some Alias'
    const emailAddress = await provisionEmailAddress(
      ownershipProofToken,
      instanceUnderTest,
      { localPart, alias: emailAddressAlias },
    )
    emailAddresses.push(emailAddress)
    expect(emailAddress.id).toBeDefined()
    expect(emailAddress.emailAddress).toMatch(new RegExp(`^${localPart}@.+`))
    const sub = await userClient.getSubject()
    expect(emailAddress.owner).toStrictEqual(sub)
    expect(emailAddress.owners[0].id).toStrictEqual(sudo.id)
    expect(emailAddress.owners[0].issuer).toStrictEqual(sudoIssuer)
    expect(emailAddress.alias).toBeDefined()
    expect(emailAddress.alias).toStrictEqual(emailAddressAlias)
    expect(emailAddress.numberOfEmailMessages).toStrictEqual(0)
    expect(emailAddress.folders).toHaveLength(4)
    expect(emailAddress.folders.map((f) => f.folderName)).toEqual(
      expect.arrayContaining(['INBOX', 'SENT', 'OUTBOX', 'TRASH']),
    )
  })

  it('provisions an address with multi-byte UTF-8 characters in alias', async () => {
    const localPart = generateSafeLocalPart()
    const emailAddressAlias = 'Some Alias 😎'
    const emailAddress = await provisionEmailAddress(
      ownershipProofToken,
      instanceUnderTest,
      { localPart, alias: emailAddressAlias },
    )
    emailAddresses.push(emailAddress)

    expect(emailAddress.id).toBeDefined()
    expect(emailAddress.emailAddress).toMatch(new RegExp(`^${localPart}@.+`))
    const sub = await userClient.getSubject()
    expect(emailAddress.owner).toStrictEqual(sub)
    expect(emailAddress.owners[0].id).toStrictEqual(sudo.id)
    expect(emailAddress.owners[0].issuer).toStrictEqual(sudoIssuer)
    expect(emailAddress.alias).toBeDefined()
    expect(emailAddress.alias).toStrictEqual(emailAddressAlias)
    expect(emailAddress.numberOfEmailMessages).toStrictEqual(0)
    expect(emailAddress.folders).toHaveLength(4)
    expect(emailAddress.folders.map((f) => f.folderName)).toEqual(
      expect.arrayContaining(['INBOX', 'SENT', 'OUTBOX', 'TRASH']),
    )

    await waitForExpect(
      async () =>
        await expect(
          instanceUnderTest.getEmailAddress({ id: emailAddress.id }),
        ).resolves.toEqual(emailAddress),
    )
    await waitForExpect(async () => {
      const addresses = await instanceUnderTest.listEmailAddresses({})
      expect(addresses.status).toEqual(ListOperationResultStatus.Success)
      if (addresses.status !== ListOperationResultStatus.Success) {
        fail(`addresses.status unexpected value`)
      }
      expect(addresses.items).toEqual([emailAddress])
    })
  })

  it('throws an error when provisioning with an invalid local part', async () => {
    await expect(
      provisionEmailAddress(ownershipProofToken, instanceUnderTest, {
        localPart: '',
      }),
    ).rejects.toThrow(InvalidAddressError)
  })

  it('throws an error when provisioning an email with unsupported domain', async () => {
    await expect(
      provisionEmailAddress(ownershipProofToken, instanceUnderTest, {
        address: `${v4()}@gmail.com`,
      }),
    ).rejects.toThrow(InvalidAddressError)
  })

  it('throws an error when email address being provisioned has already been provisioned and then deprovisioned', async () => {
    const emailAddress = await provisionEmailAddress(
      ownershipProofToken,
      instanceUnderTest,
    )
    const deprovisionedAddress =
      await instanceUnderTest.deprovisionEmailAddress(emailAddress.id)
    expect(deprovisionedAddress).toStrictEqual({ ...emailAddress, folders: [] })
    await expect(
      instanceUnderTest.provisionEmailAddress({
        emailAddress: emailAddress.emailAddress,
        ownershipProofToken: ownershipProofToken,
      }),
    ).rejects.toThrow(AddressUnavailableError)
  })

  it('can provision multiple email addresses', async () => {
    const emailAddress1 = await provisionEmailAddress(
      ownershipProofToken,
      instanceUnderTest,
    )
    const emailAddress2 = await provisionEmailAddress(
      ownershipProofToken,
      instanceUnderTest,
    )
    emailAddresses.push(emailAddress1, emailAddress2)
    expect(emailAddress1.id).not.toStrictEqual(emailAddress2.id)
    expect(emailAddress1.owner).toStrictEqual(emailAddress2.owner)
    expect(emailAddress1.owners[0].id).toStrictEqual(emailAddress2.owners[0].id)
  })

  it('throws an error when insufficient entitlements', async () => {
    const entitlementsConsumption =
      await entitlementsClient.getEntitlementsConsumption()
    const emailAddressesPerSudoEntitlement =
      entitlementsConsumption.entitlements.entitlements.find(
        (e) => e.name === emailAddressMaxPerSudoEntitlement,
      )
    expect(emailAddressesPerSudoEntitlement?.value).toBeGreaterThanOrEqual(1)
    const provisionLimit = emailAddressesPerSudoEntitlement?.value ?? 0
    await Promise.all(
      _.range(provisionLimit).map(async () => {
        await provisionEmailAddress(ownershipProofToken, instanceUnderTest)
      }),
    )
    await expect(
      provisionEmailAddress(ownershipProofToken, instanceUnderTest),
    ).rejects.toThrow(InsufficientEntitlementsError)
  })

  // Temporarily disabled until completion of PEMC-1039
  xdescribe('Singleton Public Key tests', () => {
    let emailAddresses: EmailAddress[] = []

    let instanceUnderTest: SudoEmailClient
    let userClient: SudoUserClient
    let entitlementsClient: SudoEntitlementsClient
    let profilesClient: SudoProfilesClient
    let sudo: Sudo
    let ownershipProofToken: string

    beforeEach(async () => {
      const result = await setupEmailClient(log, {
        enforceSingletonPublicKey: true,
      })
      instanceUnderTest = result.emailClient
      userClient = result.userClient
      entitlementsClient = result.entitlementsClient
      profilesClient = result.profilesClient
      sudo = result.sudo
      ownershipProofToken = result.ownershipProofToken
    })

    afterEach(async () => {
      await teardown(
        { emailAddresses, sudos: [sudo] },
        { emailClient: instanceUnderTest, profilesClient, userClient },
      )
      emailAddresses = []
    })

    it('provisions multiple email addresses with same Public Key', async () => {
      const localParts = [generateSafeLocalPart(), generateSafeLocalPart()]
      const aliases = ['Some Alias', 'Some Other Alias']
      const provisioned = await Promise.all([
        provisionEmailAddress(ownershipProofToken, instanceUnderTest, {
          localPart: localParts[0],
          alias: aliases[0],
        }),
        provisionEmailAddress(ownershipProofToken, instanceUnderTest, {
          localPart: localParts[1],
          alias: aliases[1],
        }),
      ])
      emailAddresses.push(...provisioned)

      expect(provisioned[0].id).not.toStrictEqual(provisioned[1].id)
      expect(provisioned[0].owner).toStrictEqual(provisioned[1].owner)
      expect(provisioned[0].owners[0].id).toStrictEqual(
        provisioned[1].owners[0].id,
      )

      const sub = await userClient.getSubject()
      for (const [i, emailAddress] of provisioned.entries()) {
        expect(emailAddress.id).toBeDefined()
        expect(emailAddress.emailAddress).toMatch(
          new RegExp(`^${localParts[i]}@.+`),
        )
        expect(emailAddress.owner).toStrictEqual(sub)
        expect(emailAddress.owners[0].id).toStrictEqual(sudo.id)
        expect(emailAddress.owners[0].issuer).toStrictEqual(sudoIssuer)
        expect(emailAddress.alias).toBeDefined()
        expect(emailAddress.alias).toStrictEqual(aliases[i])
        expect(emailAddress.folders).toHaveLength(4)
        expect(emailAddress.folders.map((f) => f.folderName)).toEqual(
          expect.arrayContaining(['INBOX', 'SENT', 'OUTBOX', 'TRASH']),
        )
      }
    })
  })
})
