/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailAttachment } from './emailAttachment'

/**
 * Representation of an email message's body and attachments in the Sudo Platform Email SDK
 * 
 * @interface EmailMessageWithBody
 * @property {string} id The unique identifier of the email message
 * @property {string} body The body of the email message
 * @property {EmailAttachment[]} attachments An array of the EmailAttachments associated with the email message
 * @property {EmailAttachment[]} inlineAttachments An array of the inline EmailAttachments associated with the email message
 */
export interface EmailMessageWithBody {
  id: string
  body: string
  attachments: EmailAttachment[]
  inlineAttachments: EmailAttachment[]
}