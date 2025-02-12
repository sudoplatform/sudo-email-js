/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DefaultLogger,
  Logger,
  NotSignedInError,
} from '@sudoplatform/sudo-common'
import { EmailAddressBlocklistService } from '../../entities/blocklist/emailAddressBlocklistService'
import { BlockEmailAddressesBulkUpdateResult } from '../../../../gen/graphqlTypes'
import { SudoUserClient } from '@sudoplatform/sudo-user'

/**
 * Input for `UnblockEmailAddressesUseCase`
 *
 * @interface UnblockEmailAddressesUseCaseInput
 * @property {string[]} blockedAddresses List of the addresses to unblock
 */
export interface UnblockEmailAddressesUseCaseInput {
  unblockedAddresses: string[]
}

/**
 * Application business logic for unblocking email addresses
 */
export class UnblockEmailAddressesUseCase {
  private readonly log: Logger
  constructor(
    private readonly emailBlocklistService: EmailAddressBlocklistService,
    private readonly userClient: SudoUserClient,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    unblockedAddresses,
  }: UnblockEmailAddressesUseCaseInput): Promise<BlockEmailAddressesBulkUpdateResult> {
    this.log.debug(this.constructor.name, {
      unblockedAddresses,
    })
    // Blocklists are 'owned' by the user for now.
    const owner = await this.userClient.getSubject()

    if (!owner) {
      throw new NotSignedInError()
    }

    return await this.emailBlocklistService.unblockEmailAddressesForOwner({
      owner,
      unblockedAddresses,
    })
  }
}
