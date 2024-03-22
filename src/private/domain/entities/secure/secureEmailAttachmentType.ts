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

export const SecureEmailAttachmentType: {
  [key: string]: SecureEmailAttachmentTypeInterface
} = {
  KEY_EXCHANGE: {
    fileName: 'Secure Data',
    mimeType: 'application/x-sudomail-key',
    contentId: 'securekeyexchangedata@sudomail.com',
  },
  BODY: {
    fileName: 'Secure Email',
    mimeType: 'application/x-sudomail-body',
    contentId: 'securebody@sudomail.com',
  },
}
