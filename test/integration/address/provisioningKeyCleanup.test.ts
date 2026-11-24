/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DefaultLogger,
  KeyDataKeyType,
  SudoKeyManager,
} from '@sudoplatform/sudo-common'
import { Sudo, SudoProfilesClient } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import {
  AddressUnavailableError,
  DefaultSudoEmailClient,
  EmailAddress,
  EmailAliasAlreadyExistsError,
  SudoEmailClient,
  SudoEmailClientConfig,
} from '../../../src'
import {
  SetupEmailClientOutput,
  setupEmailClient,
  teardown,
} from '../util/emailClientLifecycle'
import { provisionEmailAddress } from '../util/provisionEmailAddress'
import { provisionEmailAlias } from '../util/provisionEmailAlias'

/**
 * When the service rejects provisioning an email address or email alias, a key pair generated for it is removed from
 * the key store, while a key pair the caller supplied and the singleton key pair are kept.
 *
 * The service is made to reject provisioning by asking for an address that's already provisioned. A rejected call
 * never returns the key it used, so each test compares the key store's key pairs before and after. Only key pairs
 * are compared: other keys, such as the symmetric key, are not part of the cleanup.
 */
describe('SudoEmailClient Provisioning Key Cleanup Test Suite', () => {
  const log = new DefaultLogger('SudoEmailClientIntegrationTests')

  let setup: SetupEmailClientOutput
  let instanceUnderTest: SudoEmailClient
  let userClient: SudoUserClient
  let profilesClient: SudoProfilesClient
  let keyManager: SudoKeyManager
  let sudo: Sudo
  let ownershipProofToken: string
  let emailAddresses: EmailAddress[] = []
  let emailAliasIds: string[] = []

  beforeEach(async () => {
    setup = await setupEmailClient(log)
    instanceUnderTest = setup.emailClient
    userClient = setup.userClient
    profilesClient = setup.profilesClient
    keyManager = setup.keyManagers.email
    sudo = setup.sudo
    ownershipProofToken = setup.ownershipProofToken
  })

  afterEach(async () => {
    await Promise.all(
      emailAliasIds.map(async (emailAliasId) =>
        instanceUnderTest
          .deprovisionEmailAlias({ emailAliasId })
          .catch((err) =>
            console.log(`Error deprovisioning alias ${emailAliasId}: ${err}`),
          ),
      ),
    )
    emailAliasIds = []
    await teardown(
      { emailAddresses, sudos: [sudo] },
      { emailClient: instanceUnderTest, profilesClient, userClient },
    )
    emailAddresses = []
  })

  /** Creates a client sharing the test's user, API client and key store, with `config`. */
  const makeClient = (config: SudoEmailClientConfig): SudoEmailClient =>
    new DefaultSudoEmailClient({
      sudoUserClient: userClient,
      sudoCryptoProvider: setup.cryptoProviders.email,
      sudoKeyManager: keyManager,
      apiClient: setup.apiClient,
      sudoEmailClientConfig: config,
    } as ConstructorParameters<typeof DefaultSudoEmailClient>[0])

  /** The type and name of every public and private key in the key store. */
  const keyPairs = async (): Promise<string[]> =>
    (await keyManager.exportKeys())
      .filter(
        (key) =>
          key.type === KeyDataKeyType.RSAPrivateKey ||
          key.type === KeyDataKeyType.RSAPublicKey,
      )
      .map((key) => `${key.type}:${key.name}`)
      .sort()

  /** Id of the only key pair in the key store. */
  const onlyKeyPairId = async (): Promise<string> => {
    const ids = new Set(
      (await keyManager.exportKeys())
        .filter((key) => key.type === KeyDataKeyType.RSAPrivateKey)
        .map((key) => key.name),
    )
    expect(ids.size).toBe(1)
    return [...ids][0]
  }

  /** Asks `client` to provision `existing`'s address again. */
  const provisionDuplicate = async (
    existing: EmailAddress,
    client: SudoEmailClient,
    keyId?: string,
  ): Promise<EmailAddress> =>
    await client.provisionEmailAddress({
      emailAddress: existing.emailAddress,
      ownershipProofToken,
      keyId,
    })

  /**
   * Provisions an email address, and an email alias forwarding to it.
   * Returns `undefined` if the environment doesn't support email aliases.
   */
  const provisionAlias = async (): Promise<
    { aliasAddress: string; realAddress: string } | undefined
  > => {
    if (!(await instanceUnderTest.getConfigurationData()).emailAliasesEnabled) {
      log.debug('Email aliases are not enabled, skipping test')
      return undefined
    }
    const realAddress = await provisionEmailAddress(
      ownershipProofToken,
      instanceUnderTest,
    )
    emailAddresses.push(realAddress)
    const alias = await provisionEmailAlias(
      ownershipProofToken,
      instanceUnderTest,
      { realAddress: realAddress.emailAddress },
    )
    emailAliasIds.push(alias.id)
    return { aliasAddress: alias.aliasAddress, realAddress: alias.realAddress }
  }

  /** Asks `client` to provision the alias again. */
  const provisionAliasDuplicate = async (
    existing: { aliasAddress: string; realAddress: string },
    client: SudoEmailClient,
  ) =>
    await client.provisionEmailAlias({
      aliasAddress: existing.aliasAddress,
      realAddress: existing.realAddress,
      ownershipProofToken,
    })

  describe('email addresses', () => {
    it('removes the key pair generated for a rejected provisioning', async () => {
      const existing = await provisionEmailAddress(
        ownershipProofToken,
        instanceUnderTest,
      )
      emailAddresses.push(existing)
      const keyPairsBefore = await keyPairs()

      await expect(
        provisionDuplicate(existing, instanceUnderTest),
      ).rejects.toThrow(AddressUnavailableError)

      await expect(keyPairs()).resolves.toStrictEqual(keyPairsBefore)
    })

    it('keeps a key pair the caller supplied', async () => {
      const existing = await provisionEmailAddress(
        ownershipProofToken,
        instanceUnderTest,
      )
      emailAddresses.push(existing)
      const keyId = await onlyKeyPairId()
      const keyPairsBefore = await keyPairs()

      // Rejected as unavailable or, where keys can't be shared, as a duplicate key.
      await expect(
        provisionDuplicate(existing, instanceUnderTest, keyId),
      ).rejects.toThrow()

      expect(await keyManager.getPublicKey(keyId)).toBeDefined()
      await expect(keyPairs()).resolves.toStrictEqual(keyPairsBefore)
    })

    it('keeps the singleton key pair when it is enforced', async () => {
      const existing = await provisionEmailAddress(
        ownershipProofToken,
        instanceUnderTest,
      )
      emailAddresses.push(existing)
      const singletonClient = makeClient({ enforceSingletonPublicKey: true })
      const { keyPair } = await singletonClient.createSingletonKeysIfAbsent()
      const keyPairsBefore = await keyPairs()

      // Rejected as unavailable or, where keys can't be shared, as a duplicate key.
      await expect(
        provisionDuplicate(existing, singletonClient),
      ).rejects.toThrow()

      await expect(
        singletonClient.createSingletonKeysIfAbsent(),
      ).resolves.toStrictEqual({
        keyPair: { created: false, keyId: keyPair.keyId },
      })
      await expect(keyPairs()).resolves.toStrictEqual(keyPairsBefore)
    })
  })

  describe('email aliases', () => {
    it('removes the key pair generated for a rejected provisioning', async () => {
      const existing = await provisionAlias()
      if (!existing) {
        return
      }
      const keyPairsBefore = await keyPairs()

      await expect(
        provisionAliasDuplicate(existing, instanceUnderTest),
      ).rejects.toThrow(EmailAliasAlreadyExistsError)

      await expect(keyPairs()).resolves.toStrictEqual(keyPairsBefore)
    })

    it('keeps the singleton key pair when it is enforced', async () => {
      const existing = await provisionAlias()
      if (!existing) {
        return
      }
      const singletonClient = makeClient({ enforceSingletonPublicKey: true })
      const { keyPair } = await singletonClient.createSingletonKeysIfAbsent()
      const keyPairsBefore = await keyPairs()

      await expect(
        provisionAliasDuplicate(existing, singletonClient),
      ).rejects.toThrow()

      await expect(
        singletonClient.createSingletonKeysIfAbsent(),
      ).resolves.toStrictEqual({
        keyPair: { created: false, keyId: keyPair.keyId },
      })
      await expect(keyPairs()).resolves.toStrictEqual(keyPairsBefore)
    })
  })
})
