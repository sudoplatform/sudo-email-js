import {
  DefaultLogger,
  InsufficientEntitlementsError,
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
      { emailClient: instanceUnderTest, profilesClient },
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
    expect(deprovisionedAddress).toStrictEqual(emailAddress)
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
})
