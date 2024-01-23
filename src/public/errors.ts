/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

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

export class LimitExceededError extends EmailError {
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
