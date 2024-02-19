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
import { BlockEmailAddressesBulkUpdateResult } from '../../../../gen/graphqlTypes'
import { SudoUserClient } from '@sudoplatform/sudo-user'

/**
 * Input for `BlockEmailAddressesUseCase`
 *
 * @interface BlockEmailAddressesUseCaseInput
 * @property {string[]} blockedAddresses List of the addresses to block
 */
export interface BlockEmailAddressesUseCaseInput {
  blockedAddresses: string[]
}

/**
 * Application business logic for blocking email addresses
 */
export class BlockEmailAddressesUseCase {
  private readonly log: Logger
  constructor(
    private readonly emailBlocklistService: EmailAddressBlocklistService,
    private readonly userClient: SudoUserClient,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    blockedAddresses,
  }: BlockEmailAddressesUseCaseInput): Promise<BlockEmailAddressesBulkUpdateResult> {
    this.log.debug(this.constructor.name, {
      blockedAddresses,
    })
    // Blocklists are 'owned' by the user for now.
    const owner = await this.userClient.getSubject()

    if (!owner) {
      throw new NotSignedInError()
    }

    return await this.emailBlocklistService.blockEmailAddressesForOwner({
      owner,
      blockedAddresses,
    })
  }
}
