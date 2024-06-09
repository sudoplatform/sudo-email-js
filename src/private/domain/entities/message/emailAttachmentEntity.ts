/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { ContentTransferEncoding } from 'mail-mime-builder/umd/types'

/**
 * Representation of an email attachment used in the Sudo Platform Email SDK.
 *
 * @property {string} fileName The name of the email attachment file.
 * @property {string} contentId Identifier used to identify an attachment within an email body.
 * @property {string} mimeType The type of content that is attached.
 * @property {string} contentTransferEncoding The encoding type of the content
 * @property {boolean} inlineAttachment Flag indicating whether this is an inline attachment or not.
 * @property {string} data The email attachment data as a base64 encoded string.
 */
export interface EmailAttachmentEntity {
  filename: string
  contentId?: string
  mimeType: string
  contentTransferEncoding?: ContentTransferEncoding
  inlineAttachment: boolean
  data: string
}
