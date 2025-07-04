/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CachePolicy, DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import {
  EmailMessageService,
  ListScheduledDraftMessagesOutput,
  ScheduledDraftMessageFilterInput,
} from '../../entities/message/emailMessageService'
import { EmailAccountService } from '../../entities/account/emailAccountService'
import { AddressNotFoundError } from '../../../../public'

/**
 * Input for `ListScheduledDraftMessagesForEmailAddressIdUseCase`.
 *
 * @interface ListScheduledDraftMessagesForEmailAddressIdUseCaseInput
 * @property {string} emailAddressId The identifier of the email address to list for.
 * @property {ScheduledDraftMessageFilterInput} filter Properties used to filter the results.
 * @property {number} limit Number of records to return. If omitted, the limit defaults to 10.
 * @property {string} nextToken A token generated by a previous call to `EmailMessageService.listScheduledDraftMessagesForEmailAddressId`.
 */
export interface ListScheduledDraftMessagesForEmailAddressIdUseCaseInput {
  emailAddressId: string
  filter?: ScheduledDraftMessageFilterInput
  limit?: number
  nextToken?: string
}

export class ListScheduledDraftMessagesForEmailAddressIdUseCase {
  private readonly log: Logger

  constructor(
    private readonly emailAccountService: EmailAccountService,
    private readonly emailMessageService: EmailMessageService,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    emailAddressId,
    filter,
    limit,
    nextToken,
  }: ListScheduledDraftMessagesForEmailAddressIdUseCaseInput): Promise<ListScheduledDraftMessagesOutput> {
    this.log.debug(this.execute.name, { emailAddressId })
    const account = await this.emailAccountService.get({
      id: emailAddressId,
      cachePolicy: CachePolicy.RemoteOnly,
    })
    if (!account) {
      throw new AddressNotFoundError()
    }

    return await this.emailMessageService.listScheduledDraftMessagesForEmailAddressId(
      {
        emailAddressId,
        filter,
        limit,
        nextToken,
      },
    )
  }
}
