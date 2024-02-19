/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DefaultLogger,
  Logger,
  NotSignedInError,
} from '@sudoplatform/sudo-common'
import { EmailAddressBlocklistService } from '../../entities/blocklist/emailAddressBlocklistService'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { UnsealedBlockedAddress } from '../../../../public/typings/blockedAddresses'

/**
 * Application business logic for getting email address blocklist
 */
export class GetEmailAddressBlocklistUseCase {
  private readonly log: Logger
  constructor(
    private readonly emailBlocklistService: EmailAddressBlocklistService,
    private readonly userClient: SudoUserClient,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute(): Promise<UnsealedBlockedAddress[]> {
    this.log.debug(this.constructor.name)
    // Blocklists are 'owned' by the user for now.
    const owner = await this.userClient.getSubject()

    if (!owner) {
      throw new NotSignedInError()
    }

    const result =
      await this.emailBlocklistService.getEmailAddressBlocklistForOwner(owner)

    return result
  }
}
