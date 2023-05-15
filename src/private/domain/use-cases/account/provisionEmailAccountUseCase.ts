/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailAccountEntity } from '../../entities/account/emailAccountEntity'
import { EmailAccountService } from '../../entities/account/emailAccountService'
import { EmailAddressEntity } from '../../entities/account/emailAddressEntity'

/**
 * Input for `ProvisionEmailAccountUseCase` use case.
 *
 * @interface ProvisionEmailAccountUseCaseInput
 * @property {EmailAddressEntity} emailAddressEntity The email address to provision, in the form `${localPart}@${domain}`.
 * @property {string} ownershipProofToken A signed ownership proof of the Sudo to be associated with the provisioned email address.
 */
interface ProvisionEmailAccountUseCaseInput {
  emailAddressEntity: EmailAddressEntity
  ownershipProofToken: string
}

/**
 * Application business logic for provisioning an email account.
 */
export class ProvisionEmailAccountUseCase {
  private readonly log: Logger
  public constructor(
    private readonly emailAccountService: EmailAccountService,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    emailAddressEntity,
    ownershipProofToken,
  }: ProvisionEmailAccountUseCaseInput): Promise<EmailAccountEntity> {
    this.log.debug(this.constructor.name, {
      emailAddressEntity,
      ownershipProofToken,
    })
    return await this.emailAccountService.create({
      emailAddressEntity,
      ownershipProofToken,
    })
  }
}
