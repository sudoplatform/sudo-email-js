/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import type { EmailAddress } from './typings/emailAddress'

class EmailError extends Error {
  constructor(msg?: string) {
    super(msg)
    this.name = this.constructor.name
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

export class InternalError extends Error {
  constructor(msg: string) {
    super(msg)
  }
}

export class InvalidAddressError extends EmailError {
  constructor(msg?: string) {
    super(msg)
  }
}

export class InvalidEmailDomainError extends EmailError {
  constructor(msg?: string) {
    super(msg)
  }
}

export class InvalidKeyRingIdError extends EmailError {
  constructor(msg?: string) {
    super(msg)
  }
}

export class MissingKeyError extends EmailError {
  constructor(msg?: string) {
    super(msg)
  }
}

export class UnsupportedKeyTypeError extends EmailError {
  constructor(msg?: string) {
    super(msg)
  }
}

export class AddressUnavailableError extends EmailError {
  constructor(msg?: string) {
    super(msg)
  }
}

export class AddressNotFoundError extends EmailError {
  constructor(msg?: string) {
    super(msg)
  }
}

export class InNetworkAddressNotFoundError extends EmailError {
  constructor(msg?: string) {
    super(msg)
  }
}

export class LimitExceededError extends EmailError {
  constructor(msg?: string) {
    super(msg)
  }
}

export class MessageSizeLimitExceededError extends EmailError {
  constructor(msg?: string) {
    super(msg)
  }
}

export class InvalidArgumentError extends EmailError {
  constructor(msg?: string) {
    super(msg)
  }
}

export class UnauthorizedAddressError extends EmailError {
  constructor(msg?: string) {
    super(msg)
  }
}

export class InvalidEmailContentsError extends EmailError {
  constructor(msg?: string) {
    super(msg)
  }
}

export class MessageNotFoundError extends EmailError {
  constructor(msg?: string) {
    super(msg)
  }
}

export class EmailServiceConfigNotFoundError extends EmailError {
  constructor(msg?: string) {
    super(msg)
  }
}

export class S3UploadError extends EmailError {
  constructor(message: string) {
    super(message)
  }
}

export class EmailFolderNotFoundError extends EmailError {
  constructor(msg?: string) {
    super(msg)
  }
}

export class RecordNotFoundError extends EmailError {
  constructor(msg?: string) {
    super(msg)
  }
}

export class EmailAliasNotFoundError extends EmailError {
  constructor(msg?: string) {
    super(msg)
  }
}

export class EmailAliasAlreadyExistsError extends EmailError {
  constructor(msg?: string) {
    super(msg)
  }
}

export class EmailAliasLockedError extends EmailError {
  constructor(msg?: string) {
    super(msg)
  }
}

/**
 * Thrown when the client's configuration doesn't support the operation
 * called. For example, `createSingletonKeysIfAbsent` when the client doesn't
 * enforce a singleton key pair.
 */
export class InvalidConfigError extends EmailError {
  constructor(msg?: string) {
    super(msg)
  }
}

/**
 * Thrown when the client enforces a singleton key pair (see
 * `SudoEmailClientConfig.enforceSingletonPublicKey`), but it isn't in this
 * client's key store. Create it with `createSingletonKeysIfAbsent`, or import
 * the user's key backup with `importKeys`.
 */
export class SingletonKeyPairNotFoundError extends EmailError {
  constructor(msg?: string) {
    super(msg ?? 'The singleton key pair is not in the key store')
  }
}

/**
 * Thrown by `importKeys` when the key archive contains keys that this client
 * can't import, usually because they were exported under a different key
 * namespace, for example by another app or platform. Nothing was imported.
 */
export class KeyArchiveNotImportableError extends EmailError {
  constructor(msg?: string) {
    super(msg)
  }
}

/**
 * Thrown by `importKeys` when the key archive can't be read, for example
 * because it is corrupt or of an unsupported type or version. The client's
 * keys are unchanged.
 */
export class InvalidKeyArchiveError extends EmailError {
  constructor(msg?: string) {
    super(msg ?? 'The key archive is invalid')
  }
}

/**
 * Thrown by `deprovisionEmailAddress` when the service deprovisioned the email
 * address, but some of its key pairs couldn't be removed from the key store.
 *
 * Treat the email address as deprovisioned: `emailAddress` carries it. The key
 * pairs stay in the key store until `reset`.
 */
export class KeyPairRemovalFailedError extends EmailError {
  /** The email address that was deprovisioned. */
  public readonly emailAddress: EmailAddress
  /** Identifiers of the key pairs that couldn't be removed. */
  public readonly keyIds: string[]

  constructor(emailAddress: EmailAddress, keyIds: string[]) {
    super(
      `Email address ${emailAddress.id} was deprovisioned, but removing its key pairs failed`,
    )
    this.emailAddress = emailAddress
    this.keyIds = keyIds
  }
}
