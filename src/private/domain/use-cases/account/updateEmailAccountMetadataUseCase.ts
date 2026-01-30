/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailAccountService } from '../../entities/account/emailAccountService'

/**
 * Input for `UpdateEmailAccountUseCase` use case.
 *
 * @interface UpdateEmailAccountMetadataUseCaseInput
 * @property {String} id The id of the email account to update.
 * @property values The new value(s) to set for each listed email account.
 */
interface UpdateEmailAccountMetadataUseCaseInput {
  id: string
  values: {
    alias?: string | null
  }
}

export class UpdateEmailAccountMetadataUseCase {
  private readonly log: Logger

  public constructor(
    private readonly emailAccountService: EmailAccountService,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    id,
    values,
  }: UpdateEmailAccountMetadataUseCaseInput): Promise<string> {
    this.log.debug(this.constructor.name, {
      id,
      values,
    })

    return await this.emailAccountService.updateMetadata({
      id,
      values,
    })
  }
}
