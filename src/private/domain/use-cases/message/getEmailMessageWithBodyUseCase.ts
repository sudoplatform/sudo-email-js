/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailAttachment } from '../../../../public'
import { EmailMessageService } from '../../entities/message/emailMessageService'

/**
 * Input for `GetEmailMessageWithBodyUseCase` use case.
 *
 * @interface GetEmailMessageWithBodyUseCaseInput
 * @property {string} id The identifier of the email message to be retrieved.
 * @property {string} emailAddressId The identifier of the email address associated with the email message.
 */
interface GetEmailMessageWithBodyUseCaseInput {
  id: string
  emailAddressId: string
}

/**
 * Output for `GetEmailMessageWithBodyUseCase` use case.
 *
 * @interface GetEmailMessageWithBodyUseCaseOutput
 * @property {string} id The unique identifier of the email message
 * @property {string} body The body of the email message
 * @property {EmailAttachment[]} attachments An array of the EmailAttachments associated with the email message
 * @property {EmailAttachment[]} inlineAttachments An array of the inline EmailAttachments associated with the email message
 */
interface GetEmailMessageWithBodyUseCaseOutput {
  id: string
  body: string
  attachments: EmailAttachment[]
  inlineAttachments: EmailAttachment[]
}

/**
 * Application business logic for retrieving and email message with body and attachments
 */
export class GetEmailMessageWithBodyUseCase {
  private readonly log: Logger

  constructor(private emailMessageService: EmailMessageService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    id,
    emailAddressId,
  }: GetEmailMessageWithBodyUseCaseInput): Promise<
    GetEmailMessageWithBodyUseCaseOutput | undefined
  > {
    this.log.debug(this.execute.name, { id, emailAddressId })

    const message = await this.emailMessageService.getEmailMessageWithBody({
      id,
      emailAddressId,
    })

    return message
  }
}
