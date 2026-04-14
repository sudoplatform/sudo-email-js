/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailMessageService } from '../../entities/message/emailMessageService'

/**
 * Input for `GetDraftEmailMessageUseCase` use case.
 *
 * @interface GetDraftEmailMessageUseCaseInput
 * @property {string} id Identifier of the draft email message to be retrieved.
 * @property {string} emailAddressId Identifier of the email address associated with the draft email message.
 * @property {string} [emailMaskId] Identifier of the email mask associated with the draft email message, if any.
 */
interface GetDraftEmailMessageUseCaseInput {
  id: string
  emailAddressId: string
  emailMaskId?: string
}

/**
 * Output for `GetDraftEmailMessageUseCase` use case.
 *
 * @interface GetDraftEmailMessageUseCaseOutput
 * @property {string} id Identifier of the draft email message.
 * @property {string} emailAddressId Unique identifier of the email address associated with the draft
 *  email message.
 * @property {Date} updatedAt Time at which the draft was last updated.
 * @property {ArrayBuffer} rfc822Data RFC 822 formatted data of the draft email message.
 * @property {string} [emailMaskId] Unique identifier of the email mask associated with the draft email message, if any.
 */
export interface GetDraftEmailMessageUseCaseOutput {
  id: string
  emailAddressId: string
  updatedAt: Date
  rfc822Data: ArrayBuffer
  emailMaskId?: string
}

/**
 * Application business logic for retrieving a draft email message.
 */
export class GetDraftEmailMessageUseCase {
  private readonly log: Logger

  constructor(private readonly emailMessageService: EmailMessageService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    id,
    emailAddressId,
    emailMaskId,
  }: GetDraftEmailMessageUseCaseInput): Promise<
    GetDraftEmailMessageUseCaseOutput | undefined
  > {
    this.log.debug(this.constructor.name, { id, emailAddressId, emailMaskId })
    const message = await this.emailMessageService.getDraft({
      id,
      emailAddressId,
      emailMaskId,
    })
    if (message) {
      return {
        id,
        emailAddressId,
        updatedAt: message.updatedAt,
        rfc822Data: message.rfc822Data,
        emailMaskId: message.emailMaskId,
      }
    } else {
      return undefined
    }
  }
}
