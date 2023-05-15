/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AppSyncError,
  DefaultLogger,
  Logger,
  mapGraphQLToClientError,
  NotRegisteredError,
  ServiceError,
  VersionMismatchError,
} from '@sudoplatform/sudo-common'
import {
  AddressNotFoundError,
  AddressUnavailableError,
  InvalidAddressError,
  InvalidArgumentError,
  InvalidEmailContentsError,
  InvalidEmailDomainError,
  InvalidKeyRingIdError,
  LimitExceededError,
  UnauthorizedAddressError,
} from '../../../../public/errors'

export class ErrorTransformer {
  private readonly log: Logger

  constructor() {
    this.log = new DefaultLogger(this.constructor.name)
  }

  toClientError(error: AppSyncError): Error {
    this.log.debug('GraphQL call failed', { error })
    switch (error.errorType) {
      case 'sudoplatform.email.IdentityContextMissing':
        return new NotRegisteredError(error.message)
      case 'sudoplatform.email.EmailValidation':
        return new InvalidAddressError(error.message)
      case 'sudoplatform.email.InvalidKeyRingIdError':
        return new InvalidKeyRingIdError(error.message)
      case 'sudoplatform.email.AddressUnavailable':
        return new AddressUnavailableError(error.message)
      case 'sudoplatform.email.AddressNotFound':
        return new AddressNotFoundError('The specified address was not found')
      case 'sudoplatform.email.InvalidEmailDomain':
        return new InvalidEmailDomainError(error.message)
      case 'DynamoDB:ConditionalCheckFailedException':
        return new VersionMismatchError()
      case 'sudoplatform.LimitExceededError':
        return new LimitExceededError()
      case 'sudoplatform.email.UnauthorizedAddress':
        return new UnauthorizedAddressError()
      case 'sudoplatform.email.InvalidEmailContents':
        return new InvalidEmailContentsError()
      case 'sudoplatform.InvalidArgumentError':
        return new InvalidArgumentError(error.message)
      case 'sudoplatform.ServiceError':
        return new ServiceError(error.message)
      default:
        return mapGraphQLToClientError(error)
    }
  }
}
