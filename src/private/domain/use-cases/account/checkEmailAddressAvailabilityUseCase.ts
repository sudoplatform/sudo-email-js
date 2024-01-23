/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { InvalidArgumentError } from '../../../../public/errors'
import { EmailAccountService } from '../../entities/account/emailAccountService'
import { EmailAddressEntity } from '../../entities/account/emailAddressEntity'
import { EmailDomainEntity } from '../../entities/account/emailDomainEntity'

/**
 * Input for `CheckEmailAddressAvailabilityUseCase` use case.
 *
 * @property {string[]} localParts The local parts of the email address to check.
 * @property {EmailDomainEntity[]} domains The domains of the email address to check.
 */
interface CheckEmailAddressAvailabilityUseCaseInput {
  localParts: string[]
  domains?: EmailDomainEntity[]
}

/**
 * Application business logic for checking the availability of an email address.
 */
export class CheckEmailAddressAvailabilityUseCase {
  private readonly log: Logger

  constructor(private readonly emailAccountService: EmailAccountService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    localParts,
    domains,
  }: CheckEmailAddressAvailabilityUseCaseInput): Promise<EmailAddressEntity[]> {
    this.log.debug(this.constructor.name, {
      localParts,
      domains,
    })
    if (!localParts.length) {
      throw new InvalidArgumentError()
    }
    const availableAddresses = await this.emailAccountService.checkAvailability(
      {
        localParts,
        domains,
      },
    )
    return availableAddresses
  }
}
