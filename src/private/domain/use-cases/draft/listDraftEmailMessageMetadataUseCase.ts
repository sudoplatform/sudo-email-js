/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailAccountService } from '../../entities/account/emailAccountService'
import { DraftEmailMessageMetadataEntity } from '../../entities/message/draftEmailMessageMetadataEntity'
import { EmailMessageService } from '../../entities/message/emailMessageService'

/**
 * Output for `ListDraftEmailMessageMetadataUseCase` use case.
 *
 * @interface ListDraftEmailMessagesMetadataUseCaseOutput
 * @property {DraftEmailMessageMetadataEntity[]} metadata List of draft email message metadata.
 */
interface ListDraftEmailMessageMetadataUseCaseOutput {
  metadata: DraftEmailMessageMetadataEntity[]
}

/**
 * Application business logic for retrieving a list of draft email message metadata
 * for the user.
 */
export class ListDraftEmailMessageMetadataUseCase {
  private readonly log: Logger
  constructor(
    private readonly emailAccountService: EmailAccountService,
    private readonly emailMessageService: EmailMessageService,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute(): Promise<ListDraftEmailMessageMetadataUseCaseOutput> {
    this.log.debug(this.constructor.name)

    const result: DraftEmailMessageMetadataEntity[] = []

    let nextToken: string | undefined = undefined
    do {
      const emailAccounts = await this.emailAccountService.list({ nextToken })
      nextToken = emailAccounts.nextToken

      await Promise.all(
        emailAccounts.emailAccounts.map(async (account) => {
          const metadata =
            await this.emailMessageService.listDraftsMetadataForEmailAddressId({
              emailAddressId: account.id,
            })
          result.push(...metadata)
        }),
      )
    } while (nextToken)

    return { metadata: result }
  }
}
