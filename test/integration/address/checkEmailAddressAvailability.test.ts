import { CachePolicy, DefaultLogger } from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import _ from 'lodash'
import {
  EmailAddress,
  InvalidAddressError,
  InvalidArgumentError,
  InvalidEmailDomainError,
  SudoEmailClient,
} from '../../../src'
import { setupEmailClient, teardown } from '../util/emailClientLifecycle'
import { generateSafeLocalPart } from '../util/provisionEmailAddress'

describe('SudoEmailClient checkEmailAddressAvailability Test Suite', () => {
  jest.setTimeout(240000)
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let instanceUnderTest: SudoEmailClient
  let profilesClient: SudoProfilesClient
  let sudo: Sudo
  let sudoOwnershipProofToken: string

  let supportedDomains: string[]

  let emailAddresses: EmailAddress[] = []

  beforeEach(async () => {
    const result = await setupEmailClient(log)
    instanceUnderTest = result.emailClient
    profilesClient = result.profilesClient
    sudo = result.sudo
    sudoOwnershipProofToken = result.ownershipProofToken

    supportedDomains = await instanceUnderTest.getSupportedEmailDomains(
      CachePolicy.RemoteOnly,
    )
    expect(supportedDomains.length).toBeGreaterThanOrEqual(1)
  })

  afterEach(async () => {
    await teardown(
      { emailAddresses, sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient },
    )
    emailAddresses = []
  })

  it('Checks that the email address is available with a valid input', async () => {
    const localParts = ['local-test-1', 'local-test-2']
    const result = await instanceUnderTest.checkEmailAddressAvailability({
      localParts: new Set(localParts),
      domains: new Set(supportedDomains),
    })
    expect(result).toHaveLength(2 * supportedDomains.length)
    supportedDomains.forEach((domain) => {
      expect(result).toStrictEqual(
        expect.arrayContaining([
          expect.stringMatching(new RegExp(`^${localParts[0]}@${domain}`)),
          expect.stringMatching(new RegExp(`^${localParts[1]}@${domain}`)),
        ]),
      )
    })
  })
  it('allows local parts with periods', async () => {
    const localParts = ['local.part']
    const result = await instanceUnderTest.checkEmailAddressAvailability({
      localParts: new Set(localParts),
      domains: new Set(supportedDomains),
    })
    expect(result).toHaveLength(1 * supportedDomains.length)
    supportedDomains.forEach((domain) => {
      expect(result).toStrictEqual(
        expect.arrayContaining([
          expect.stringMatching(new RegExp(`^${localParts[0]}@${domain}`)),
        ]),
      )
    })
  })
  it('strips out email address with local part containing hyphen', async () => {
    const localParts = ['local.email-with-hyphen']
    const result = await instanceUnderTest.checkEmailAddressAvailability({
      localParts: new Set(localParts),
      domains: new Set(supportedDomains),
    })
    expect(result).toHaveLength(1 * supportedDomains.length)
    supportedDomains.forEach((domain) => {
      expect(result).toStrictEqual(
        expect.arrayContaining([
          expect.stringMatching(new RegExp(`^${localParts[0]}@${domain}`)),
        ]),
      )
    })
  })

  it('throws an error when empty local parts are used', async () => {
    await expect(
      instanceUnderTest.checkEmailAddressAvailability({
        localParts: new Set(),
        domains: new Set(supportedDomains),
      }),
    ).rejects.toThrow(InvalidArgumentError)
  })

  it('uses default domains when no domains specified', async () => {
    const localParts = _.range(5).map(() => generateSafeLocalPart())
    await expect(
      instanceUnderTest.checkEmailAddressAvailability({
        localParts: new Set(localParts),
      }),
    ).resolves.toHaveLength(5)
  })

  it('filters out keywords, such as POSTMASTER, in results', async () => {
    const localParts = [generateSafeLocalPart(), 'POSTMASTER']
    const result = await instanceUnderTest.checkEmailAddressAvailability({
      localParts: new Set(localParts),
      domains: new Set(supportedDomains),
    })
    expect(result).toHaveLength(1 * supportedDomains.length)
    supportedDomains.forEach((domain) => {
      expect(result).toStrictEqual(
        expect.arrayContaining([
          expect.stringMatching(new RegExp(`^${localParts[0]}@${domain}`)),
        ]),
      )
    })
  })
  it('throws an error when limit is exceeded', async () => {
    const localParts = _.range(6).map(() => generateSafeLocalPart())
    await expect(
      instanceUnderTest.checkEmailAddressAvailability({
        localParts: new Set(localParts),
        domains: new Set(supportedDomains),
      }),
    ).rejects.toThrow(InvalidArgumentError)
  })

  it('filters an in-use email address', async () => {
    const localPart = generateSafeLocalPart()
    const domain = supportedDomains[0]
    const address = `${localPart}@${domain}`
    const emailAddressAccount = await instanceUnderTest.provisionEmailAddress({
      emailAddress: address,
      ownershipProofToken: sudoOwnershipProofToken,
    })
    emailAddresses.push(emailAddressAccount)
    await expect(
      instanceUnderTest.checkEmailAddressAvailability({
        localParts: new Set([localPart]),
        domains: new Set([domain]),
      }),
    ).resolves.toHaveLength(0)
  })
  it('filters a previously provisioned email address', async () => {
    const localPart = generateSafeLocalPart()
    const domain = supportedDomains[0]
    const address = `${localPart}@${domain}`
    await instanceUnderTest
      .provisionEmailAddress({
        emailAddress: address,
        ownershipProofToken: sudoOwnershipProofToken,
      })
      .then(
        async ({ id }) => await instanceUnderTest.deprovisionEmailAddress(id),
      )
    await expect(
      instanceUnderTest.checkEmailAddressAvailability({
        localParts: new Set([localPart]),
        domains: new Set([domain]),
      }),
    ).resolves.toHaveLength(0)
  })
  it('throws an invalid domain error when invalid domain is supplied', async () => {
    await expect(
      instanceUnderTest.checkEmailAddressAvailability({
        localParts: new Set([generateSafeLocalPart()]),
        domains: new Set(['invalid-domain.com']),
      }),
    ).rejects.toThrow(InvalidEmailDomainError)
  })
  it.each`
    name                                 | localPart
    ${'local part'}                      | ${'invalid@gmail.com'}
    ${'empty local part string'}         | ${''}
    ${"'@' local part"}                  | ${'@'}
    ${'local part starting with period'} | ${'.local'}
    ${'local part characters'}           | ${'local()*'}
    ${'local part double period'}        | ${'local..email'}
    ${'white space local part'}          | ${' '}
    ${'double quote local part'}         | ${'"local"'}
    ${'local part with multiple tags'}   | ${'user.name+tag+sorting'}
  `(
    'throw an error when an invalid local part is supplied (desc=$name)',
    async ({ localPart }) => {
      await expect(
        instanceUnderTest.checkEmailAddressAvailability({
          localParts: new Set([localPart]),
          domains: new Set(supportedDomains),
        }),
      ).rejects.toThrow(InvalidAddressError)
    },
  )
})
