/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailAttachment } from '../../../../public'

/**
 * Secure data package containing the encrypted email body and keys as attachments
 *
 * @interface SecurePackage
 * @property {Set<EmailAttachment>} keyAttachments The key used to seal the body, itself sealed by each recipients' public key as attachments
 * @property {EmailAttachment} bodyAttachment The body of the email sealed using a symmetric key as an attachment
 */
export class SecurePackage {
  private keyAttachments: Set<EmailAttachment>
  private bodyAttachment: EmailAttachment

  constructor(
    keyAttachments: Set<EmailAttachment>,
    bodyAttachment: EmailAttachment,
  ) {
    this.keyAttachments = keyAttachments
    this.bodyAttachment = bodyAttachment
  }

  toArray(): EmailAttachment[] {
    return [...Array.from(this.keyAttachments), this.bodyAttachment]
  }

  getKeyAttachments(): EmailAttachment[] {
    return [...this.keyAttachments]
  }

  getBodyAttachment(): EmailAttachment {
    return this.bodyAttachment
  }
}
