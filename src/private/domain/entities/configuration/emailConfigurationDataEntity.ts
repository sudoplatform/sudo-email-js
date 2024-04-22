/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Core entity representation of configuration data.
 *
 * @interface ConfigurationData
 * @property {number} deleteEmailMessagesLimit The number of email messages that can be deleted at a time.
 * @property {number} updateEmailMessagesLimit The number of email messages that can be updated at a time.
 * @property {number} emailMessageMaxInboundMessageSize The maximum allowed size of an inbound email message.
 * @property {number} emailMessageMaxOutboundMessageSize The maximum allowed size of an outbound email message.
 * @property {number} emailMessageRecipientsLimit The maximum number of recipients for an out-of-network email message.
 * @property {number} encryptedEmailMessageRecipientsLimit The maximum number of recipients for an in-network encrypted
 *  email message.
 */
export interface EmailConfigurationDataEntity {
  deleteEmailMessagesLimit: number
  updateEmailMessagesLimit: number
  emailMessageMaxInboundMessageSize: number
  emailMessageMaxOutboundMessageSize: number
  emailMessageRecipientsLimit: number
  encryptedEmailMessageRecipientsLimit: number
}
