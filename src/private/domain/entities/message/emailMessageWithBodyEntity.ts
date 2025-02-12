/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailAttachmentEntity } from './emailAttachmentEntity'

/**
 * Core entity representation of an email message with body and attachments
 *
 * @interface EmailMessageWithBodyEntity
 * @property {string} id Unique identifier of the email message.
 * @property {string} body The body of the email message.
 * @property {EmailAttachmentEntity[]} attachments Array of the attachments on the email message
 * @property {EmailAttachmentEntity[]} inlineAttachments Array of the inline attachments on the email message
 */
export interface EmailMessageWithBodyEntity {
  id: string
  body: string
  attachments: EmailAttachmentEntity[]
  inlineAttachments: EmailAttachmentEntity[]
}
