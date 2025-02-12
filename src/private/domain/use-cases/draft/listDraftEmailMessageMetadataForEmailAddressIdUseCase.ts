/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { DraftEmailMessageMetadataEntity } from '../../entities/message/draftEmailMessageMetadataEntity'
import { EmailMessageService } from '../../entities/message/emailMessageService'

/**
 * Input for `ListDraftEmailMessageMetadataForEmailAddressIdUseCase` use case.
 *
 * @interface ListDraftEmailMessageMetadataForEmailAddressIdUseCaseInput
 * @property {string} emailAddressId Identifier of the email address associated with the draft email messages.
 */
interface ListDraftEmailMessageMetadataForEmailAddressIdUseCaseInput {
  emailAddressId: string
}

/**
 * Output for `ListDraftEmailMessageMetadataForEmailAddressIdUseCase` use case.
 *
 * @interface ListDraftEmailMessageMetadataForEmailAddressIdUseCaseOutput
 * @property {DraftEmailMessageMetadataEntity[]} metadata List of draft email message metadata.
 */
interface ListDraftEmailMessageMetadataForEmailAddressIdUseCaseOutput {
  metadata: DraftEmailMessageMetadataEntity[]
}

/**
 * Application business logic for retrieving a list of draft email message metadata
 * for the specified email address.
 */
export class ListDraftEmailMessageMetadataForEmailAddressIdUseCase {
  private readonly log: Logger
  constructor(private readonly emailMessageService: EmailMessageService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    emailAddressId,
  }: ListDraftEmailMessageMetadataForEmailAddressIdUseCaseInput): Promise<ListDraftEmailMessageMetadataForEmailAddressIdUseCaseOutput> {
    this.log.debug(this.constructor.name, { emailAddressId })
    const result =
      await this.emailMessageService.listDraftsMetadataForEmailAddressId({
        emailAddressId,
      })
    return { metadata: result }
  }
}
