/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  KeyNotFoundError,
  LimitExceededError as CommonLimitExceededError,
  NotAuthorizedError,
  RequestFailedError,
  ServiceError,
  UnknownGraphQLError,
} from '@sudoplatform/sudo-common'
import { anything, instance, mock, reset, verify, when } from 'ts-mockito'
import {
  DeviceKeyWorker,
  KeyType,
} from '../../../../../src/private/data/common/deviceKeyWorker'
import {
  ProvisioningKeyProvider,
  isDefinitiveRejection,
} from '../../../../../src/private/data/common/provisioningKeyProvider'
import {
  AddressUnavailableError,
  InvalidArgumentError,
  SingletonKeyPairNotFoundError,
} from '../../../../../src/public/errors'
import { EntityDataFactory } from '../../../data-factory/entity'

describe('ProvisioningKeyProvider Test Suite', () => {
  const generatedKey = EntityDataFactory.deviceKey
  const singletonKey = { ...EntityDataFactory.deviceKey, id: 'singleton' }
  const suppliedKey = { ...EntityDataFactory.deviceKey, id: 'supplied' }
  const mockDeviceKeyWorker = mock<DeviceKeyWorker>()

  const providerWith = (
    config: {
      enforceSingletonPublicKey: boolean
      allowCallerManagedKeys: boolean
    } = {
      allowCallerManagedKeys: true,
      enforceSingletonPublicKey: false,
    },
  ) => new ProvisioningKeyProvider(instance(mockDeviceKeyWorker), config)

  beforeEach(() => {
    reset(mockDeviceKeyWorker)
    when(mockDeviceKeyWorker.generateKeyPair()).thenResolve(generatedKey)
    when(mockDeviceKeyWorker.getSingletonKeyPair()).thenResolve(singletonKey)
    when(mockDeviceKeyWorker.getPublicKeyWithId('supplied')).thenResolve(
      suppliedKey,
    )
    when(mockDeviceKeyWorker.getPublicKeyWithId('missing')).thenResolve(
      undefined,
    )
  })

  describe('key', () => {
    it('generates a key pair by default', async () => {
      await expect(providerWith().key()).resolves.toStrictEqual({
        key: generatedKey,
        isGeneratedForProvisioning: true,
      })
    })

    it('uses a supplied key id by default', async () => {
      await expect(providerWith().key('supplied')).resolves.toStrictEqual({
        key: suppliedKey,
        isGeneratedForProvisioning: false,
      })
      verify(mockDeviceKeyWorker.generateKeyPair()).never()
    })

    it('throws KeyNotFoundError if the supplied key pair is not in the key store', async () => {
      await expect(providerWith().key('missing')).rejects.toThrow(
        KeyNotFoundError,
      )
    })

    it('rejects a supplied key id if caller managed keys are not allowed', async () => {
      await expect(
        providerWith({
          allowCallerManagedKeys: false,
          enforceSingletonPublicKey: false,
        }).key('supplied'),
      ).rejects.toThrow(InvalidArgumentError)
      verify(mockDeviceKeyWorker.getPublicKeyWithId(anything())).never()
    })

    it('uses the singleton when enforced', async () => {
      await expect(
        providerWith({
          allowCallerManagedKeys: true,
          enforceSingletonPublicKey: true,
        }).key(),
      ).resolves.toStrictEqual({
        key: singletonKey,
        isGeneratedForProvisioning: false,
      })
      verify(mockDeviceKeyWorker.generateKeyPair()).never()
    })

    it('prefers a supplied key id over the enforced singleton', async () => {
      await expect(
        providerWith({
          allowCallerManagedKeys: true,
          enforceSingletonPublicKey: true,
        }).key('supplied'),
      ).resolves.toStrictEqual({
        key: suppliedKey,
        isGeneratedForProvisioning: false,
      })
    })

    it('throws SingletonKeyPairNotFoundError if the enforced singleton is absent, and does not create it', async () => {
      when(mockDeviceKeyWorker.getSingletonKeyPair()).thenResolve(undefined)
      await expect(
        providerWith({
          allowCallerManagedKeys: true,
          enforceSingletonPublicKey: true,
        }).key(),
      ).rejects.toThrow(SingletonKeyPairNotFoundError)
      verify(mockDeviceKeyWorker.createSingletonKeyPairIfAbsent()).never()
      verify(mockDeviceKeyWorker.generateKeyPair()).never()
    })
  })

  describe('withRejectionCleanup', () => {
    const generated = { key: generatedKey, isGeneratedForProvisioning: true }
    const notGenerated = {
      key: suppliedKey,
      isGeneratedForProvisioning: false,
    }

    it('returns the result and keeps the key on success', async () => {
      await expect(
        providerWith().withRejectionCleanup(
          generated,
          async () => 'request',
          async (request) => `${request} sent`,
        ),
      ).resolves.toBe('request sent')
      verify(mockDeviceKeyWorker.removeKey(anything(), anything())).never()
    })

    it('removes a generated key pair if the service rejects the request', async () => {
      await expect(
        providerWith().withRejectionCleanup(
          generated,
          async () => 'request',
          async () => {
            throw new AddressUnavailableError()
          },
        ),
      ).rejects.toThrow(AddressUnavailableError)
      verify(
        mockDeviceKeyWorker.removeKey(generatedKey.id, KeyType.KeyPair),
      ).once()
    })

    it('removes a generated key pair if building the request fails', async () => {
      await expect(
        providerWith().withRejectionCleanup(
          generated,
          async () => {
            throw new KeyNotFoundError()
          },
          async () => 'never',
        ),
      ).rejects.toThrow(KeyNotFoundError)
      verify(
        mockDeviceKeyWorker.removeKey(generatedKey.id, KeyType.KeyPair),
      ).once()
    })

    it('keeps a generated key pair if the outcome is unknown', async () => {
      await expect(
        providerWith().withRejectionCleanup(
          generated,
          async () => 'request',
          async () => {
            throw new ServiceError('boom')
          },
        ),
      ).rejects.toThrow(ServiceError)
      verify(mockDeviceKeyWorker.removeKey(anything(), anything())).never()
    })

    it('never removes a key pair it did not generate', async () => {
      await expect(
        providerWith().withRejectionCleanup(
          notGenerated,
          async () => 'request',
          async () => {
            throw new AddressUnavailableError()
          },
        ),
      ).rejects.toThrow(AddressUnavailableError)
      verify(mockDeviceKeyWorker.removeKey(anything(), anything())).never()
    })

    it('throws the provisioning error even if removing the key pair fails', async () => {
      when(
        mockDeviceKeyWorker.removeKey(generatedKey.id, KeyType.KeyPair),
      ).thenReject(new Error('remove failed'))
      await expect(
        providerWith().withRejectionCleanup(
          generated,
          async () => 'request',
          async () => {
            throw new AddressUnavailableError()
          },
        ),
      ).rejects.toThrow(AddressUnavailableError)
    })
  })

  describe('isDefinitiveRejection', () => {
    it.each([
      ['NotAuthorizedError', new NotAuthorizedError()],
      ['common LimitExceededError', new CommonLimitExceededError()],
      ['InvalidArgumentError', new InvalidArgumentError()],
      ['AddressUnavailableError', new AddressUnavailableError()],
    ])('is true for %s', (_, error) => {
      expect(isDefinitiveRejection(error)).toBe(true)
    })

    it.each([
      ['ServiceError', new ServiceError('x')],
      ['RequestFailedError', new RequestFailedError(new Error('x'))],
      ['UnknownGraphQLError', new UnknownGraphQLError(new Error('x'))],
      ['a plain Error', new Error('x')],
    ])('is false for %s', (_, error) => {
      expect(isDefinitiveRejection(error)).toBe(false)
    })
  })
})
