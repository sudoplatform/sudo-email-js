/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The types of attachments in an email message that is end-to-end encrypted
 *
 * @interface SecureEmailAttachmentTypeInterface
 * @property {string} fileName Name of the attachment file
 * @property {string} mimeType The attachment mimeType
 * @property {string} contentId The content identifier associated with the attachment
 */
export interface SecureEmailAttachmentTypeInterface {
  fileName: string
  mimeType: string
  contentId: string
}

export const LEGACY_KEY_EXCHANGE_MIME_TYPE = 'application/x-sudomail-key'
export const LEGACY_KEY_EXCHANGE_CONTENT_ID =
  'securekeyexhangedata@sudomail.com' // Intentional mispelling of 'exchange' to match legacy system
export const LEGACY_BODY_MIME_TYPE = 'application/x-sudomail-body'
export const LEGACY_BODY_CONTENT_ID = 'securebody@sudomail.com'

export const SecureEmailAttachmentType: {
  [key: string]: SecureEmailAttachmentTypeInterface
} = {
  KEY_EXCHANGE: {
    fileName: 'Secure Data',
    mimeType: 'application/x-sudoplatform-key',
    contentId: 'securekeyexchangedata@sudoplatform.com',
  },
  BODY: {
    fileName: 'Secure Email',
    mimeType: 'application/x-sudoplatform-body',
    contentId: 'securebody@sudoplatform.com',
  },
}
