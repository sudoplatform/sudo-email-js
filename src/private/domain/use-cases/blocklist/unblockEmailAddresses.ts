/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailAddressBlocklistService } from '../../entities/blocklist/emailAddressBlocklistService'
import { BlockEmailAddressesBulkUpdateResult } from '../../../../gen/graphqlTypes'

/**
 * Input for `UnblockEmailAddressesUseCase`
 *
 * @interface UnblockEmailAddressesUseCaseInput
 * @property {string} owner The id of the owner of the user
 * @property {string[]} blockedAddresses List of the addresses to unblock
 */
export interface UnblockEmailAddressesUseCaseInput {
  owner: string
  unblockedAddresses: string[]
}

/**
 * Application business logic for unblocking email addresses
 */
export class UnblockEmailAddressesUseCase {
  private readonly log: Logger
  constructor(
    private readonly emailBlocklistService: EmailAddressBlocklistService,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    owner,
    unblockedAddresses,
  }: UnblockEmailAddressesUseCaseInput): Promise<BlockEmailAddressesBulkUpdateResult> {
    this.log.debug(this.constructor.name, {
      owner,
      unblockedAddresses,
    })

    return await this.emailBlocklistService.unblockEmailAddressesForOwner({
      owner,
      unblockedAddresses,
    })
  }
}
