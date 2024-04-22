/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailConfigurationDataService } from '../../entities/configuration/configurationDataService'

export interface GetConfigurationDataUseCaseOutput {
  deleteEmailMessagesLimit: number
  updateEmailMessagesLimit: number
  emailMessageMaxInboundMessageSize: number
  emailMessageMaxOutboundMessageSize: number
  emailMessageRecipientsLimit: number
  encryptedEmailMessageRecipientsLimit: number
}

/**
 * Application business logic for retrieving configuration data.
 */
export class GetConfigurationDataUseCase {
  private readonly log: Logger

  public constructor(
    private readonly configurationDataService: EmailConfigurationDataService,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute(): Promise<GetConfigurationDataUseCaseOutput> {
    this.log.debug(this.constructor.name)
    return await this.configurationDataService.getConfigurationData()
  }
}
