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
import { BlockedEmailAddressAction } from '../../../../public/typings'
import { EmailAccountService } from '../../entities/account/emailAccountService'
import { AddressNotFoundError } from '../../../../public'

/**
 * Input for `BlockEmailAddressesUseCase`
 *
 * @interface BlockEmailAddressesUseCaseInput
 * @property {string[]} blockedAddresses List of the addresses to block
 * @property {BlockedEmailAddressAction} action Action to take on incoming emails
 * @property {string} emailAddressId If passed, block only effects this email address
 */
export interface BlockEmailAddressesUseCaseInput {
  blockedAddresses: string[]
  action: BlockedEmailAddressAction
  emailAddressId?: string
}

/**
 * Application business logic for blocking email addresses
 */
export class BlockEmailAddressesUseCase {
  private readonly log: Logger
  constructor(
    private readonly emailBlocklistService: EmailAddressBlocklistService,
    private readonly userClient: SudoUserClient,
    private readonly emailAccountService: EmailAccountService,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    blockedAddresses,
    action,
    emailAddressId,
  }: BlockEmailAddressesUseCaseInput): Promise<BlockEmailAddressesBulkUpdateResult> {
    this.log.debug(this.constructor.name, {
      blockedAddresses,
    })

    const owner = await this.userClient.getSubject()

    if (!owner) {
      throw new NotSignedInError()
    }

    if (emailAddressId) {
      const emailAddress = await this.emailAccountService.get({
        id: emailAddressId,
      })
      if (!emailAddress) {
        throw new AddressNotFoundError()
      }
      return await this.emailBlocklistService.blockEmailAddressesForEmailAddressId(
        {
          owner,
          emailAddressId,
          blockedAddresses,
          action,
        },
      )
    } else {
      return await this.emailBlocklistService.blockEmailAddressesForOwner({
        owner,
        blockedAddresses,
        action,
      })
    }
  }
}
