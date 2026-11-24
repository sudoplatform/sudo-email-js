/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */
import { instance, mock, reset, verify, when } from 'ts-mockito'
import { MockedClass } from 'vitest'
import { InvalidConfigError } from '../../../src'
import { DefaultDeviceKeyWorker } from '../../../src/private/data/common/deviceKeyWorker'
import { EntityDataFactory } from '../data-factory/entity'
import { SudoEmailClientTestBase } from '../../util/sudoEmailClientTestsBase'

vi.mock('../../../src/private/data/common/deviceKeyWorker')

describe('SudoEmailClient.createSingletonKeysIfAbsent Test Suite', () => {
  const sudoEmailClientTestsBase = new SudoEmailClientTestBase()
  const ViMockDeviceKeyWorker = DefaultDeviceKeyWorker as MockedClass<
    typeof DefaultDeviceKeyWorker
  >

  const mockDeviceKeyWorker = mock<DefaultDeviceKeyWorker>()

  beforeEach(() => {
    sudoEmailClientTestsBase.resetMocks()
    reset(mockDeviceKeyWorker)
    ViMockDeviceKeyWorker.mockImplementation(function () {
      return instance(mockDeviceKeyWorker)
    })
  })

  it('throws InvalidConfigError if the client does not enforce a singleton key pair', async () => {
    const client = sudoEmailClientTestsBase.getInstanceUnderTest()
    await expect(client.createSingletonKeysIfAbsent()).rejects.toThrow(
      InvalidConfigError,
    )
    verify(mockDeviceKeyWorker.createSingletonKeyPairIfAbsent()).never()
  })

  it.each([true, false])(
    'reports the key id, and whether it was created (%s)',
    async (created) => {
      when(mockDeviceKeyWorker.createSingletonKeyPairIfAbsent()).thenResolve({
        key: { ...EntityDataFactory.deviceKey, id: 'singleton' },
        created,
      })
      const client = sudoEmailClientTestsBase.getInstanceUnderTest({
        enforceSingletonPublicKey: true,
      })
      await expect(client.createSingletonKeysIfAbsent()).resolves.toStrictEqual(
        { keyPair: { created, keyId: 'singleton' } },
      )
    },
  )
})
