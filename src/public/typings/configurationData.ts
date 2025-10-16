/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The Sudo Platform SDK representation of configuration data.
 *
 * @interface ConfigurationData
 * @property {number} deleteEmailMessagesLimit The number of email messages that can be deleted at a time.
 * @property {number} updateEmailMessagesLimit The number of email messages that can be updated at a time.
 * @property {number} emailMessageMaxInboundMessageSize The maximum allowed size of an inbound email message.
 * @property {number} emailMessageMaxOutboundMessageSize The maximum allowed size of an outbound email message.
 * @property {number} emailMessageRecipientsLimit The maximum number of recipients for an out-of-network email message.
 * @property {number} encryptedEmailMessageRecipientsLimit The maximum number of recipients for an in-network encrypted
 *  email message.
 * @property {boolean} sendEncryptedEmailEnabled Flag indicating whether End-to-end encrypted send operations are enabled.
 * @property {string[]} prohibitedFileExtensions List of file extensions that are prohibited from being attached to an email message.
 * @property {boolean} emailMasksEnabled Flag indicating whether email masks are enabled.
 */
export interface ConfigurationData {
  deleteEmailMessagesLimit: number
  updateEmailMessagesLimit: number
  emailMessageMaxInboundMessageSize: number
  emailMessageMaxOutboundMessageSize: number
  emailMessageRecipientsLimit: number
  encryptedEmailMessageRecipientsLimit: number
  sendEncryptedEmailEnabled: boolean
  prohibitedFileExtensions: string[]
  emailMasksEnabled: boolean
}
