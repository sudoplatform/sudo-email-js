/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailAddressBlocklistService } from '../../entities/blocklist/emailAddressBlocklistService'
import { BlockEmailAddressesBulkUpdateResult } from '../../../../gen/graphqlTypes'

/**
 * Input for `BlockEmailAddressesUseCase`
 *
 * @interface BlockEmailAddressesUseCaseInput
 * @property {string} owner The id of the owner of the user creating the blocklist
 * @property {string[]} blockedAddresses List of the addresses to block
 */
export interface BlockEmailAddressesUseCaseInput {
  owner: string
  blockedAddresses: string[]
}

/**
 * Application business logic for blocking email addresses
 */
export class BlockEmailAddressesUseCase {
  private readonly log: Logger
  constructor(
    private readonly emailBlocklistService: EmailAddressBlocklistService,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    owner,
    blockedAddresses,
  }: BlockEmailAddressesUseCaseInput): Promise<BlockEmailAddressesBulkUpdateResult> {
    this.log.debug(this.constructor.name, {
      owner,
      blockedAddresses,
    })

    return await this.emailBlocklistService.blockEmailAddressesForOwner({
      owner,
      blockedAddresses,
    })
  }
}
