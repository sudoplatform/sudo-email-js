/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailAccountEntity } from '../../entities/account/emailAccountEntity'
import { EmailAccountService } from '../../entities/account/emailAccountService'
import { EmailMessageBodyCache } from '../../entities/message/emailMessageBodyCache'

/**
 * Application business logic for deprovisioning an email account.
 */
export class DeprovisionEmailAccountUseCase {
  private readonly log: Logger

  public constructor(
    private readonly emailAccountService: EmailAccountService,
    private readonly emailMessageBodyCache: EmailMessageBodyCache,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute(id: string): Promise<EmailAccountEntity> {
    this.log.debug(this.constructor.name, {
      id,
    })
    const result = await this.emailAccountService.delete({
      emailAddressId: id,
    })
    // Flush cached message bodies for the deprovisioned email address
    await this.emailMessageBodyCache.flush({ emailAddressId: id })
    return result
  }
}
