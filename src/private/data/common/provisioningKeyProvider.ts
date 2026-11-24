/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AccountLockedError,
  DefaultLogger,
  IllegalArgumentError,
  InsufficientEntitlementsError,
  InvalidOwnershipProofError,
  InvalidTokenError,
  KeyNotFoundError,
  LimitExceededError as CommonLimitExceededError,
  Logger,
  NoEntitlementsError,
  NotAuthorizedError,
  NotRegisteredError,
  NotSignedInError,
  VersionMismatchError,
} from '@sudoplatform/sudo-common'
import {
  AddressNotFoundError,
  AddressUnavailableError,
  EmailAliasAlreadyExistsError,
  EmailAliasNotFoundError,
  InvalidAddressError,
  InvalidArgumentError,
  InvalidEmailContentsError,
  InvalidEmailDomainError,
  InvalidKeyRingIdError,
  LimitExceededError,
  SingletonKeyPairNotFoundError,
  UnauthorizedAddressError,
} from '../../../public/errors'
import { DeviceKey, DeviceKeyWorker, KeyType } from './deviceKeyWorker'

/**
 * Options for how the client manages the key pairs that email addresses and
 * email aliases are provisioned with.
 *
 * @property {boolean} enforceSingletonPublicKey Whether every email address
 *  and email alias is provisioned with one shared key pair. The client never
 *  creates it implicitly. Defaults to `false`.
 * @property {boolean} allowCallerManagedKeys Whether the caller may supply the
 *  key pair to provision with. Defaults to `true`.
 */
export type KeyManagementConfig = {
  enforceSingletonPublicKey: boolean
  allowCallerManagedKeys: boolean
}

/**
 * The public key an email address or email alias is provisioned with.
 *
 * @property {DeviceKey} key The public key to register with the service.
 * @property {boolean} isGeneratedForProvisioning Whether the key pair was
 *  generated for this provisioning, so belongs to it alone and may be removed
 *  if the provisioning is rejected. `false` for a key pair the caller supplied
 *  and for the singleton key pair.
 */
export interface ProvisioningKey {
  key: DeviceKey
  isGeneratedForProvisioning: boolean
}

/**
 * Whether an error proves that the service did not carry out a request.
 *
 * Only typed rejections qualify. Anything that could follow a request the
 * service accepted (a network failure, a service error, an unrecognised error)
 * doesn't, so callers keep state such as a provisioning key rather than
 * discard it for an email address that may exist.
 *
 * @param error The error thrown by the API client.
 */
export const isDefinitiveRejection = (error: unknown): boolean =>
  error instanceof NotRegisteredError ||
  error instanceof NotAuthorizedError ||
  error instanceof NotSignedInError ||
  error instanceof InsufficientEntitlementsError ||
  error instanceof NoEntitlementsError ||
  error instanceof AccountLockedError ||
  error instanceof VersionMismatchError ||
  error instanceof InvalidTokenError ||
  error instanceof InvalidOwnershipProofError ||
  error instanceof IllegalArgumentError ||
  error instanceof CommonLimitExceededError ||
  error instanceof LimitExceededError ||
  error instanceof InvalidArgumentError ||
  error instanceof InvalidAddressError ||
  error instanceof InvalidEmailDomainError ||
  error instanceof InvalidEmailContentsError ||
  error instanceof InvalidKeyRingIdError ||
  error instanceof AddressUnavailableError ||
  error instanceof AddressNotFoundError ||
  error instanceof UnauthorizedAddressError ||
  error instanceof EmailAliasAlreadyExistsError ||
  error instanceof EmailAliasNotFoundError

/**
 * Chooses the key pair an email address or email alias is provisioned with,
 * following the client's key management options.
 */
export class ProvisioningKeyProvider {
  private readonly log: Logger

  constructor(
    private readonly deviceKeyWorker: DeviceKeyWorker,
    private readonly config: KeyManagementConfig = {
      allowCallerManagedKeys: true,
      enforceSingletonPublicKey: false,
    },
  ) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  /**
   * The key to provision with.
   *
   * - A `keyId` the caller supplied is used as is, if the client allows caller
   *   managed keys, even with a singleton key pair enforced.
   * - Otherwise, with a singleton key pair enforced, the singleton is used.
   *   It is never created here.
   * - Otherwise a key pair is generated for this provisioning.
   *
   * @param keyId Identifier of the key pair the caller supplied, if any.
   *
   * @throws {@link InvalidArgumentError} if `keyId` is supplied but the client
   *  doesn't allow caller managed keys.
   * @throws {@link KeyNotFoundError} if the supplied key pair isn't in the key
   *  store.
   * @throws {@link SingletonKeyPairNotFoundError} if the enforced singleton
   *  isn't in the key store.
   */
  async key(keyId?: string): Promise<ProvisioningKey> {
    if (keyId !== undefined) {
      if (!(this.config?.allowCallerManagedKeys ?? true)) {
        throw new InvalidArgumentError(
          'keyId can not be supplied when allowCallerManagedKeys is false',
        )
      }
      const key = await this.deviceKeyWorker.getPublicKeyWithId(keyId)
      if (!key) {
        throw new KeyNotFoundError(`Key pair id not found: ${keyId}`)
      }
      return { key, isGeneratedForProvisioning: false }
    }
    if (this.config?.enforceSingletonPublicKey) {
      const key = await this.deviceKeyWorker.getSingletonKeyPair()
      if (!key) {
        throw new SingletonKeyPairNotFoundError()
      }
      return { key, isGeneratedForProvisioning: false }
    }
    return {
      key: await this.deviceKeyWorker.generateKeyPair(),
      isGeneratedForProvisioning: true,
    }
  }

  /**
   * Removes a key pair generated for a provisioning the service definitely
   * didn't carry out. Does nothing for a key pair the caller supplied or for
   * the singleton.
   *
   * Best effort: a failure is logged, never thrown, so it can't replace the
   * provisioning error.
   *
   * @param provisioningKey The key the provisioning used.
   */
  async discardRejectedKey(provisioningKey: ProvisioningKey): Promise<void> {
    if (!provisioningKey.isGeneratedForProvisioning) {
      return
    }
    try {
      await this.deviceKeyWorker.removeKey(
        provisioningKey.key.id,
        KeyType.KeyPair,
      )
    } catch (err) {
      this.log.warn('Removing key pair after a rejected provisioning failed', {
        keyId: provisioningKey.key.id,
        err,
      })
    }
  }

  /**
   * Runs the provisioning with the given key, removing a key pair generated
   * for it if the provisioning is definitely rejected, or if `request` fails
   * before it sends anything.
   *
   * @param provisioningKey The key the provisioning uses.
   * @param buildRequest Builds the request. A failure here means nothing was
   *  sent.
   * @param send Sends the request built by `buildRequest`.
   */
  async withRejectionCleanup<Request, Result>(
    provisioningKey: ProvisioningKey,
    buildRequest: () => Promise<Request>,
    send: (request: Request) => Promise<Result>,
  ): Promise<Result> {
    let request: Request
    try {
      request = await buildRequest()
    } catch (err) {
      // Nothing was sent, so the service didn't act on it.
      await this.discardRejectedKey(provisioningKey)
      throw err
    }
    try {
      return await send(request)
    } catch (err) {
      if (isDefinitiveRejection(err)) {
        await this.discardRejectedKey(provisioningKey)
      }
      throw err
    }
  }
}
