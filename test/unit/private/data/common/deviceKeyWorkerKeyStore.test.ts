/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Buffer as BufferUtil,
  DefaultConfigurationManager,
  DefaultSudoKeyArchive,
  DefaultSudoKeyManager,
  KeyArchiveKeyType,
  SudoKeyManager,
} from '@sudoplatform/sudo-common'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { WebSudoCryptoProvider } from '@sudoplatform/sudo-web-crypto-provider'
import { gzipSync } from 'zlib'
import { v4 } from 'uuid'
import { instance, mock } from 'ts-mockito'
import {
  DefaultSudoEmailClient,
  InvalidKeyArchiveError,
  KeyArchiveNotImportableError,
  SudoEmailClient,
} from '../../../../../src'
import { ApiClient } from '../../../../../src/private/data/common/apiClient'
import {
  DefaultDeviceKeyWorker,
  KeyType,
} from '../../../../../src/private/data/common/deviceKeyWorker'
import { PrivateSudoEmailClientOptions } from '../../../../../src/private/data/common/privateSudoEmailClientOptions'

/**
 * Tests the singleton key pair, key removal and key export / import against a real `WebSudoCryptoProvider` and
 * `DefaultSudoKeyManager` (in-memory store), isolated in a namespace of its own, rather than mocks of them.
 *
 * Needs no backend.
 */
describe('Key store backed key management Test Suite', () => {
  const identityServiceConfig = {
    region: 'region',
    poolId: 'poolId',
    clientId: 'clientId',
    identityPoolId: 'identityPoolId',
    apiUrl: 'apiUrl',
    transientBucket: 'transientBucket',
    registrationMethods: [],
    bucket: 'bucket',
  }
  const emailServiceConfig = {
    region: 'region',
    apiUrl: 'apiUrl',
    transientBucket: 'transientBucket',
    bucket: 'bucket',
  }
  const plaintext = BufferUtil.fromString('Sealed to the singleton key pair')

  interface KeyStore {
    namespace: string
    keyManager: SudoKeyManager
    keyWorker: DefaultDeviceKeyWorker
    client: SudoEmailClient
  }

  /** Creates a key store in a namespace of its own, and a client and key worker using it. */
  const createKeyStore = (
    namespace = `key-store-${v4()}`,
    enforceSingletonPublicKey = true,
  ): KeyStore => {
    const cryptoProvider = new WebSudoCryptoProvider(
      namespace,
      'com.sudoplatform.appservicename',
    )
    const keyManager = new DefaultSudoKeyManager(cryptoProvider)
    const options: PrivateSudoEmailClientOptions = {
      sudoUserClient: mock<SudoUserClient>() as unknown as SudoUserClient,
      sudoCryptoProvider: cryptoProvider,
      sudoKeyManager: keyManager,
      apiClient: instance(mock<ApiClient>()),
      identityServiceConfig,
      emailServiceConfig,
      sudoEmailClientConfig: { enforceSingletonPublicKey },
    }
    return {
      namespace,
      keyManager,
      keyWorker: new DefaultDeviceKeyWorker(keyManager),
      client: new DefaultSudoEmailClient(options),
    }
  }

  /** A raw version 3 key archive holding `keys`, which need not be valid. */
  const rawArchive = (keys: Record<string, unknown>[]): ArrayBuffer => {
    const json = JSON.stringify({
      Version: 3,
      Type: 'Insecure',
      MetaInfo: {},
      Keys: keys,
    })
    const zipped = gzipSync(Buffer.from(json))
    return zipped.buffer.slice(
      zipped.byteOffset,
      zipped.byteOffset + zipped.byteLength,
    ) as ArrayBuffer
  }

  const rawPassword = (name: string, extra: Record<string, unknown> = {}) => ({
    Name: name,
    Type: 'password',
    Data: Buffer.from('secret').toString('base64'),
    Synchronizable: false,
    ...extra,
  })

  /** Seals `plaintext` to the key pair's public key and opens it with its private key. */
  const sealAndOpen = async (
    keyWorker: DefaultDeviceKeyWorker,
    keyId: string,
  ): Promise<string> => {
    const sealed = await keyWorker.sealString({
      payload: plaintext,
      keyId,
      keyType: KeyType.KeyPair,
    })
    return await keyWorker.unsealString({
      encrypted: sealed,
      keyId,
      keyType: KeyType.KeyPair,
    })
  }

  /** An archive with one password in `namespace` and one in namespace `eml`. */
  const mixedNamespaceArchive = (namespace: string): ArrayBuffer =>
    rawArchive([
      rawPassword('importable', { NameSpace: namespace }),
      rawPassword('elsewhere', { NameSpace: 'eml' }),
    ])

  beforeAll(() => {
    DefaultConfigurationManager.getInstance().setConfig(
      JSON.stringify({
        identityService: identityServiceConfig,
        emService: emailServiceConfig,
      }),
    )
  })

  describe('singleton key pair', () => {
    it('getSingletonKeyPair with no singleton returns undefined and creates nothing', async () => {
      const { keyWorker, keyManager } = createKeyStore()

      await expect(keyWorker.getSingletonKeyPair()).resolves.toBeUndefined()
      await expect(keyManager.exportKeys()).resolves.toHaveLength(0)
    })

    it('createSingletonKeyPairIfAbsent creates once, then returns the same key', async () => {
      const { keyWorker } = createKeyStore()

      const first = await keyWorker.createSingletonKeyPairIfAbsent()
      const second = await keyWorker.createSingletonKeyPairIfAbsent()
      const read = await keyWorker.getSingletonKeyPair()

      expect(first.created).toBe(true)
      expect(second.created).toBe(false)
      expect(second.key.id).toBe(first.key.id)
      expect(read).toStrictEqual(first.key)
      expect(first.key.data.length).toBeGreaterThan(0)
    })

    it('createSingletonKeyPairIfAbsent creates one key under concurrent calls', async () => {
      const { keyWorker } = createKeyStore()

      const results = await Promise.all([
        keyWorker.createSingletonKeyPairIfAbsent(),
        keyWorker.createSingletonKeyPairIfAbsent(),
        keyWorker.createSingletonKeyPairIfAbsent(),
      ])

      expect(results.filter((r) => r.created)).toHaveLength(1)
      expect(new Set(results.map((r) => r.key.id)).size).toBe(1)
    })

    it('createSingletonKeyPairIfAbsent replaces a singleton whose private key is missing', async () => {
      const { keyWorker, keyManager } = createKeyStore()
      const original = await keyWorker.createSingletonKeyPairIfAbsent()
      await keyManager.deleteKeyPair(original.key.id)

      const missing = await keyWorker.getSingletonKeyPair()
      const replacement = await keyWorker.createSingletonKeyPairIfAbsent()

      expect(missing).toBeUndefined()
      expect(replacement.created).toBe(true)
      expect(replacement.key.id).not.toBe(original.key.id)
      await expect(keyWorker.getSingletonKeyPair()).resolves.toStrictEqual(
        replacement.key,
      )
    })

    it('seals to the singleton public key so only its private key opens it', async () => {
      const { keyWorker } = createKeyStore()
      const singleton = await keyWorker.createSingletonKeyPairIfAbsent()

      await expect(sealAndOpen(keyWorker, singleton.key.id)).resolves.toBe(
        'Sealed to the singleton key pair',
      )
    })
  })

  describe('key removal', () => {
    it('removing a generated key pair leaves the singleton', async () => {
      const { keyWorker, keyManager } = createKeyStore()
      const singleton = await keyWorker.createSingletonKeyPairIfAbsent()
      const generated = await keyWorker.generateKeyPair()
      expect(generated.id).not.toBe(singleton.key.id)

      await keyWorker.removeKey(generated.id, KeyType.KeyPair)

      await expect(
        keyManager.getPrivateKey(generated.id),
      ).resolves.toBeUndefined()
      await expect(
        keyManager.getPublicKey(generated.id),
      ).resolves.toBeUndefined()
      await expect(keyWorker.getSingletonKeyPair()).resolves.toStrictEqual(
        singleton.key,
      )
    })
  })

  describe('restoreSingletonPublicKey', () => {
    /** Exports as `exportKeys` does (no public keys), removes every key, and imports the archive's keys directly. */
    const exportRemoveAndImport = async ({
      keyManager,
    }: KeyStore): Promise<void> => {
      const exporter = new DefaultSudoKeyArchive(keyManager, {
        excludedKeyTypes: new Set([KeyArchiveKeyType.PublicKey]),
      })
      await exporter.loadKeys()
      const archive = await exporter.archive(undefined)
      await keyManager.removeAllKeys()
      const importer = new DefaultSudoKeyArchive(keyManager, {
        archiveData: archive,
      })
      await importer.unarchive(undefined)
      await importer.saveKeys()
    }

    it('derives the same public key from the imported private key', async () => {
      const store = createKeyStore()
      const singleton = await store.keyWorker.createSingletonKeyPairIfAbsent()
      await exportRemoveAndImport(store)
      await expect(
        store.keyManager.getPublicKey(singleton.key.id),
      ).resolves.toBeUndefined()

      await store.keyWorker.restoreSingletonPublicKey()

      const restored = await store.keyManager.getPublicKey(singleton.key.id)
      expect(restored).toBeDefined()
      await expect(
        store.keyWorker.getSingletonKeyPair(),
      ).resolves.toStrictEqual(singleton.key)
      await expect(
        sealAndOpen(store.keyWorker, singleton.key.id),
      ).resolves.toBe('Sealed to the singleton key pair')
    })

    it('is repaired on read if the public key is missing', async () => {
      const store = createKeyStore()
      const singleton = await store.keyWorker.createSingletonKeyPairIfAbsent()
      await exportRemoveAndImport(store)

      await expect(
        store.keyWorker.getSingletonKeyPair(),
      ).resolves.toStrictEqual(singleton.key)
    })

    it('does nothing if the public key is present', async () => {
      const store = createKeyStore()
      const singleton = await store.keyWorker.createSingletonKeyPairIfAbsent()

      await store.keyWorker.restoreSingletonPublicKey()

      await expect(
        store.keyWorker.getSingletonKeyPair(),
      ).resolves.toStrictEqual(singleton.key)
    })

    it('does nothing if there is no singleton', async () => {
      const { keyWorker, keyManager } = createKeyStore()

      await keyWorker.restoreSingletonPublicKey()

      await expect(keyManager.exportKeys()).resolves.toHaveLength(0)
    })
  })

  describe('export / import', () => {
    it('importKeys restores the singleton with a usable public key', async () => {
      const source = createKeyStore()
      const singleton = await source.keyWorker.createSingletonKeyPairIfAbsent()
      const archive = await source.client.exportKeys()

      // Another browser's key store, in the same namespace.
      const target = createKeyStore(source.namespace)
      await expect(
        target.keyWorker.getSingletonKeyPair(),
      ).resolves.toBeUndefined()
      await target.client.importKeys(archive)

      // The archive leaves public keys out, so import must derive the singleton's public key again.
      await expect(
        target.keyWorker.getSingletonKeyPair(),
      ).resolves.toStrictEqual(singleton.key)
      await expect(
        target.client.createSingletonKeysIfAbsent(),
      ).resolves.toStrictEqual({
        keyPair: { created: false, keyId: singleton.key.id },
      })
      await expect(
        sealAndOpen(target.keyWorker, singleton.key.id),
      ).resolves.toBe('Sealed to the singleton key pair')
    })

    it('importKeys opens data sealed before the export', async () => {
      const source = createKeyStore()
      const singleton = await source.keyWorker.createSingletonKeyPairIfAbsent()
      const sealed = await source.keyWorker.sealString({
        payload: plaintext,
        keyId: singleton.key.id,
        keyType: KeyType.KeyPair,
      })
      const archive = await source.client.exportKeys()

      const target = createKeyStore(source.namespace)
      await target.client.importKeys(archive)

      await expect(
        target.keyWorker.unsealString({
          encrypted: sealed,
          keyId: singleton.key.id,
          keyType: KeyType.KeyPair,
        }),
      ).resolves.toBe('Sealed to the singleton key pair')
    })

    it('importKeys replaces the existing keys', async () => {
      const source = createKeyStore()
      const singleton = await source.keyWorker.createSingletonKeyPairIfAbsent()
      const archive = await source.client.exportKeys()

      const target = createKeyStore(source.namespace)
      const other = await target.keyWorker.createSingletonKeyPairIfAbsent()
      expect(other.key.id).not.toBe(singleton.key.id)
      await target.client.importKeys(archive)

      await expect(
        target.keyWorker.getSingletonKeyPair(),
      ).resolves.toStrictEqual(singleton.key)
      await expect(
        target.keyManager.getPrivateKey(other.key.id),
      ).resolves.toBeUndefined()
    })

    describe('archives that are not importable', () => {
      /** Asserts the store's singleton key pair is still the one created before the import. */
      const expectUnchanged = async (
        store: KeyStore,
        singleton: Awaited<
          ReturnType<DefaultDeviceKeyWorker['createSingletonKeyPairIfAbsent']>
        >,
      ) => {
        await expect(
          store.keyWorker.getSingletonKeyPair(),
        ).resolves.toStrictEqual(singleton.key)
        await expect(
          store.keyManager.getPrivateKey(singleton.key.id),
        ).resolves.toBeDefined()
      }

      it('other namespace throws KeyArchiveNotImportableError and keeps the existing keys', async () => {
        // As from a client created with a different key namespace, such as another app or platform.
        const store = createKeyStore()
        const existing = await store.keyWorker.createSingletonKeyPairIfAbsent()
        const other = createKeyStore()
        await other.keyWorker.createSingletonKeyPairIfAbsent()
        const archive = await other.client.exportKeys()

        const error = await store.client.importKeys(archive).catch((err) => err)

        expect(error).toBeInstanceOf(KeyArchiveNotImportableError)
        expect(error.message).toContain(`"${other.namespace}"`)
        expect(error.message).toContain(
          `can't be imported into key namespace "${store.namespace}"`,
        )
        await expectUnchanged(store, existing)
      })

      it('some keys unimportable imports none and keeps the existing keys', async () => {
        const store = createKeyStore()
        const existing = await store.keyWorker.createSingletonKeyPairIfAbsent()
        const mixed = mixedNamespaceArchive(store.namespace)
        await expect(store.client.importKeys(mixed)).rejects.toThrow(
          new KeyArchiveNotImportableError(
            `1 of 2 keys can't be imported into key namespace "${store.namespace}". Their namespaces: "eml".`,
          ),
        )

        await expect(
          store.keyManager.getPassword('importable'),
        ).resolves.toBeUndefined()
        await expectUnchanged(store, existing)
      })

      it('keys with no namespace throw KeyArchiveNotImportableError and keep the existing keys', async () => {
        // Android's archives may leave NameSpace out.
        const store = createKeyStore()
        const existing = await store.keyWorker.createSingletonKeyPairIfAbsent()

        await expect(
          store.client.importKeys(rawArchive([rawPassword('from-android')])),
        ).rejects.toThrow(
          new KeyArchiveNotImportableError(
            `1 of 1 keys can't be imported into key namespace "${store.namespace}". Their namespaces: none.`,
          ),
        )

        await expectUnchanged(store, existing)
      })

      it('an unknown key type throws KeyArchiveNotImportableError and keeps the existing keys', async () => {
        const store = createKeyStore()
        const existing = await store.keyWorker.createSingletonKeyPairIfAbsent()
        const archive = rawArchive([
          rawPassword('mystery', {
            NameSpace: store.namespace,
            Type: 'Mystery',
          }),
        ])

        await expect(store.client.importKeys(archive)).rejects.toThrow(
          KeyArchiveNotImportableError,
        )

        await expectUnchanged(store, existing)
      })

      it('an archive with no keys imports nothing and keeps the existing keys', async () => {
        // For example, exported by a user with no provisioned email addresses.
        const store = createKeyStore()
        const existing = await store.keyWorker.createSingletonKeyPairIfAbsent()

        await store.client.importKeys(rawArchive([]))

        await expectUnchanged(store, existing)
      })

      it('an invalid archive throws InvalidKeyArchiveError and keeps the existing keys', async () => {
        const store = createKeyStore()
        const existing = await store.keyWorker.createSingletonKeyPairIfAbsent()

        await expect(
          store.client.importKeys(BufferUtil.fromString('not a key archive')),
        ).rejects.toThrow(InvalidKeyArchiveError)

        await expectUnchanged(store, existing)
      })
    })
  })
})
