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
 * Input for `UnblockEmailAddressesByHashedValueUseCase`
 *
 * @interface UnblockEmailAddressesByHashedValueUseCaseInput
 * @property {string[]} hashedValues List of the hashedValues to unblock
 */
export interface UnblockEmailAddressesByHashedValueUseCaseInput {
  hashedValues: string[]
}

/**
 * Application business logic for unblocking email addresses
 */
export class UnblockEmailAddressesByHashedValueUseCase {
  private readonly log: Logger
  constructor(
    private readonly emailBlocklistService: EmailAddressBlocklistService,
    private readonly userClient: SudoUserClient,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    hashedValues,
  }: UnblockEmailAddressesByHashedValueUseCaseInput): Promise<BlockEmailAddressesBulkUpdateResult> {
    this.log.debug(this.constructor.name, {
      hashedValues,
    })
    // Blocklists are 'owned' by the user for now.
    const owner = await this.userClient.getSubject()

    if (!owner) {
      throw new NotSignedInError()
    }

    return await this.emailBlocklistService.unblockEmailAddressesByHashedValue({
      owner,
      hashedValues,
    })
  }
}
