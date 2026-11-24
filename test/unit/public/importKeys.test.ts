/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  DefaultSudoKeyArchive,
  KeyData,
  KeyDataKeyFormat,
  KeyDataKeyType,
  SudoKeyManager,
} from '@sudoplatform/sudo-common'
import { anything, instance, mock, reset, verify, when } from 'ts-mockito'
import { MockedClass } from 'vitest'
import {
  InvalidArgumentError,
  InvalidKeyArchiveError,
  KeyArchiveNotImportableError,
  SudoEmailClient,
} from '../../../src'
import { DefaultDeviceKeyWorker } from '../../../src/private/data/common/deviceKeyWorker'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock('../../../src/private/data/common/deviceKeyWorker')

describe('SudoEmailClient.importKeys Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  const ViMockDeviceKeyWorker = DefaultDeviceKeyWorker as MockedClass<
    typeof DefaultDeviceKeyWorker
  >
  const mockDeviceKeyWorker = mock<DefaultDeviceKeyWorker>()
  let instanceUnderTest: SudoEmailClient
  let mockKeyManager: SudoKeyManager

  const clientNamespace = 'sudo-email'

  const privateKey = (namespace: string, name: string): KeyData => ({
    name,
    namespace,
    data: new Uint8Array([1, 2, 3]).buffer,
    type: KeyDataKeyType.RSAPrivateKey,
    format: KeyDataKeyFormat.PKCS8,
  })

  const archiveOf = async (keys: KeyData[]): Promise<ArrayBuffer> => {
    // The archive only needs a key manager to export from.
    const exporter = {
      namespace: clientNamespace,
      exportKeys: async () => keys,
    } as unknown as SudoKeyManager
    const archive = new DefaultSudoKeyArchive(exporter)
    await archive.loadKeys()
    return await archive.archive(undefined)
  }

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockDeviceKeyWorker)
    ViMockDeviceKeyWorker.mockImplementation(function () {
      return instance(mockDeviceKeyWorker)
    })
    instanceUnderTest = sudoEmailClientTestsBase.getInstanceUnderTest()
    mockKeyManager = sudoEmailClientTestsBase.getMockSudoKeyManager()
    when(mockKeyManager.namespace).thenReturn(clientNamespace)
  })

  it('throws InvalidArgumentError if no data provided to import', async () => {
    await expect(
      instanceUnderTest.importKeys(new ArrayBuffer(0)),
    ).rejects.toThrow(InvalidArgumentError)
  })

  it('throws InvalidKeyArchiveError, leaving existing keys, if the archive is invalid', async () => {
    await expect(
      instanceUnderTest.importKeys(new Uint8Array([1, 2, 3]).buffer),
    ).rejects.toThrow(InvalidKeyArchiveError)
    verify(mockKeyManager.removeAllKeys()).never()
  })

  it('imports nothing, leaving existing keys, if the archive has no keys', async () => {
    await instanceUnderTest.importKeys(await archiveOf([]))
    verify(mockKeyManager.removeAllKeys()).never()
    verify(mockKeyManager.addPrivateKey(anything(), anything())).never()
    verify(mockDeviceKeyWorker.restoreSingletonPublicKey()).never()
  })

  it('throws KeyArchiveNotImportableError, leaving existing keys, for keys from another namespace', async () => {
    const archive = await archiveOf([privateKey('com.other.namespace', 'key')])
    const error = await instanceUnderTest.importKeys(archive).catch((e) => e)
    expect(error).toBeInstanceOf(KeyArchiveNotImportableError)
    expect(error.message).toContain(
      `1 of 1 keys can't be imported into key namespace "${clientNamespace}"`,
    )
    expect(error.message).toContain('"com.other.namespace"')
    verify(mockKeyManager.removeAllKeys()).never()
    verify(mockKeyManager.addPrivateKey(anything(), anything())).never()
  })

  it('imports nothing if any one key is not importable', async () => {
    const archive = await archiveOf([
      privateKey(clientNamespace, 'good'),
      privateKey('com.other.namespace', 'bad'),
    ])
    await expect(instanceUnderTest.importKeys(archive)).rejects.toThrow(
      KeyArchiveNotImportableError,
    )
    verify(mockKeyManager.removeAllKeys()).never()
    verify(mockKeyManager.addPrivateKey(anything(), anything())).never()
  })

  it('replaces existing keys with the archive keys and restores the singleton public key', async () => {
    await instanceUnderTest.importKeys(
      await archiveOf([privateKey(clientNamespace, 'good')]),
    )
    verify(mockKeyManager.removeAllKeys()).once()
    verify(mockKeyManager.addPrivateKey(anything(), 'good')).once()
    verify(mockDeviceKeyWorker.restoreSingletonPublicKey()).once()
  })
})
