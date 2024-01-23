/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { DraftEmailMessageMetadataEntity } from '../../entities/message/draftEmailMessageMetadataEntity'
import { EmailMessageService } from '../../entities/message/emailMessageService'

/**
 * Input for `ListDraftEmailMessagesUseCase` use case.
 *
 * @interface ListDraftEmailMessagesUseCaseInput
 * @property {string} emailAddressId Identifier of the email address associated with the draft email messages.
 */
interface ListDraftEmailMessageMetadataUseCaseInput {
  emailAddressId: string
}

/**
 * Output for `ListDraftEmailMessagesUseCase` use case.
 *
 * @interface ListDraftEmailMessagesUseCaseOutput
 * @property {string[]} ids Identifiers of the draft email messages.
 */
interface ListDraftEmailMessageMetadataUseCaseOutput {
  metadata: DraftEmailMessageMetadataEntity[]
}

/**
 * Application business logic for retrieving a list of ids of draft email messages.
 */
export class ListDraftEmailMessageMetadataUseCase {
  private readonly log: Logger
  constructor(private readonly emailMessageService: EmailMessageService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    emailAddressId,
  }: ListDraftEmailMessageMetadataUseCaseInput): Promise<ListDraftEmailMessageMetadataUseCaseOutput> {
    this.log.debug(this.constructor.name, { emailAddressId })
    const result = await this.emailMessageService.listDraftsMetadata({
      emailAddressId,
    })
    return { metadata: result }
  }
}
