/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailAccountEntity } from '../../entities/account/emailAccountEntity'
import { EmailAccountService } from '../../entities/account/emailAccountService'

/**
 * Application business logic for deprovisioning an email account.
 */
export class DeprovisionEmailAccountUseCase {
  private readonly log: Logger

  public constructor(
    private readonly emailAccountService: EmailAccountService,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute(id: string): Promise<EmailAccountEntity> {
    this.log.debug(this.constructor.name, {
      id,
    })
    return await this.emailAccountService.delete({
      emailAddressId: id,
    })
  }
}
