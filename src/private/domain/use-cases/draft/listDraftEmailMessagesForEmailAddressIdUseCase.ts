/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { DraftEmailMessageEntity } from '../../entities/message/draftEmailMessageEntity'
import { EmailMessageService } from '../../entities/message/emailMessageService'

/**
 * Input for `ListDraftEmailMessagesForEmailAddressIdUseCase` use case.
 *
 * @interface ListDraftEmailMessagesForEmailAddressIdUseCaseInput
 * @property {string} emailAddressId Identifier of the email address associated with the draft email messages.
 */
interface ListDraftEmailMessagesForEmailAddressIdUseCaseInput {
  emailAddressId: string
}

/**
 * Output for `ListDraftEmailMessagesForEmailAddressIdUseCase` use case.
 *
 * @interface ListDraftEmailMessagesForEmailAddressIdUseCaseOutput
 * @property {DraftEmailMessageEntity[]} draftMessages List of draft email messages.
 */
interface ListDraftEmailMessagesForEmailAddressIdUseCaseOutput {
  draftMessages: DraftEmailMessageEntity[]
}

/**
 * Application business logic for retrieving a list of draft email message metadata
 * and content for the specified email address.
 */
export class ListDraftEmailMessagesForEmailAddressIdUseCase {
  private readonly log: Logger
  constructor(private readonly emailMessageService: EmailMessageService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    emailAddressId,
  }: ListDraftEmailMessagesForEmailAddressIdUseCaseInput): Promise<ListDraftEmailMessagesForEmailAddressIdUseCaseOutput> {
    this.log.debug(this.constructor.name, { emailAddressId })
    const metadata =
      await this.emailMessageService.listDraftsMetadataForEmailAddressId({
        emailAddressId,
      })
    const draftMessages = await Promise.all(
      metadata.map(async (m) => {
        const draft = await this.emailMessageService.getDraft({
          id: m.id,
          emailAddressId,
        })
        return draft
      }),
    )
    const result = draftMessages.filter(
      (draft) => draft !== undefined,
    ) as DraftEmailMessageEntity[]

    return { draftMessages: result }
  }
}
