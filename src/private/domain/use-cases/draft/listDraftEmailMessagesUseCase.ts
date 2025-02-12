/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailAccountService } from '../../entities/account/emailAccountService'
import { DraftEmailMessageEntity } from '../../entities/message/draftEmailMessageEntity'
import { EmailMessageService } from '../../entities/message/emailMessageService'

/**
 * Output for `ListDraftEmailMessagesUseCase` use case.
 *
 * @interface ListDraftEmailMessagesUseCaseOutput
 * @property {DraftEmailMessageEntity[]} draftMessages List of draft email messages.
 */
interface ListDraftEmailMessagesUseCaseOutput {
  draftMessages: DraftEmailMessageEntity[]
}

/**
 * Application business logic for retrieving a list of draft email message metadata
 * and content for the user.
 */
export class ListDraftEmailMessagesUseCase {
  private readonly log: Logger
  constructor(
    private readonly emailAccountService: EmailAccountService,
    private readonly emailMessageService: EmailMessageService,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute(): Promise<ListDraftEmailMessagesUseCaseOutput> {
    this.log.debug(this.constructor.name)

    const result: DraftEmailMessageEntity[] = []

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
          const draftContent = await Promise.all(
            metadata.map(async (m) => {
              return this.emailMessageService.getDraft({
                id: m.id,
                emailAddressId: account.id,
              })
            }),
          )
          const draftMessages = draftContent.filter(
            (draft) => draft !== undefined,
          ) as DraftEmailMessageEntity[]

          result.push(...draftMessages)
        }),
      )
    } while (nextToken)

    return { draftMessages: result }
  }
}
