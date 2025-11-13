/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CachePolicy } from '@sudoplatform/sudo-common'
import { Pagination } from './common'
import { EmailAddressDetail } from '../typings/emailAddress'
import { EmailAttachment } from '../typings/emailAttachment'
import { EmailMessageDateRange } from '../typings/emailMessageDateRange'
import { SortOrder } from '../typings/sortOrder'

/**
 * Input for `SudoEmailClient.getEmailMessage`.
 *
 * @interface GetEmailMessageInput
 * @property {string} id The identifier of the email message to be retrieved.
 * @property {CachePolicy} cachePolicy Determines how the email message will be fetched. Default usage is `remoteOnly`.
 */
export interface GetEmailMessageInput {
  id: string
  cachePolicy?: CachePolicy
}

/**
 * Input for `SudoEmailClient.listEmailMessages`.
 *
 * @interface ListEmailMessagesInput
 * @property {EmailMessageDateRange} dateRange Email messages matching the specified date range inclusive will be fetched.
 * @property {CachePolicy} cachePolicy Determines how the email messages will be fetched. Default usage is `remoteOnly`.
 * @property {SortOrder} sortOrder The direction in which the email messages are sorted. Defaults to descending.
 * @property {boolean} includeDeletedMessages A flag to indicate if deleted messages should be included. Defaults to false.
 */
export interface ListEmailMessagesInput extends Pagination {
  dateRange?: EmailMessageDateRange
  cachePolicy?: CachePolicy
  sortOrder?: SortOrder
  includeDeletedMessages?: boolean
}

/**
 * Input for `SudoEmailClient.listEmailMessagesForEmailAddressId`.
 *
 * @interface ListEmailMessagesForEmailAddressIdInput
 * @property {string} emailAddressId The identifier of the email address associated with the email message.
 * @property {EmailMessageDateRange} dateRange Email messages matching the specified date range inclusive will be fetched.
 * @property {CachePolicy} cachePolicy Determines how the email messages will be fetched. Default usage is `remoteOnly`.
 * @property {SortOrder} sortOrder The direction in which the email messages are sorted. Defaults to descending.
 * @property {boolean} includeDeletedMessages A flag to indicate if deleted messages should be included. Defaults to false.
 */
export interface ListEmailMessagesForEmailAddressIdInput extends Pagination {
  emailAddressId: string
  dateRange?: EmailMessageDateRange
  cachePolicy?: CachePolicy
  sortOrder?: SortOrder
  includeDeletedMessages?: boolean
}

/**
 * Input for `SudoEmailClient.listEmailMessagesForEmailFolderId`.
 *
 * @interface ListEmailMessagesForEmailFolderIdInput
 * @property {string} folderId The identifier of the email folder that contains the email message.
 * @property {EmailMessageDateRange} dateRange Email messages matching the specified date range inclusive will be fetched.
 * @property {CachePolicy} cachePolicy Determines how the email messages will be fetched. Default usage is `remoteOnly`.
 * @property {SortOrder} sortOrder The direction in which the email messages are sorted. Defaults to descending.
 * @property {boolean} includeDeletedMessages A flag to indicate if deleted messages should be included. Defaults to false.
 */
export interface ListEmailMessagesForEmailFolderIdInput extends Pagination {
  folderId: string
  dateRange?: EmailMessageDateRange
  cachePolicy?: CachePolicy
  sortOrder?: SortOrder
  includeDeletedMessages?: boolean
}

/**
 * Representation of the email headers formatted under the RFC-6854 (supersedes RFC 822).
 * (https://tools.ietf.org/html/rfc6854) standard. Some further rules (beyond RFC 6854) must also be
 * applied to the data:
 *  - At least one recipient must exist (to, cc, bcc).
 *  - For all email addresses:
 *    - Total length (including both local part and domain) must not exceed 256 characters.
 *    - Local part must not exceed more than 64 characters.
 *    - Input domain parts (domain separated by `.`) must not exceed 63 characters.
 *    - Address must match standard email address pattern:
 *       `^[a-zA-Z0-9](\.?[-_a-zA-Z0-9])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$`.
 *
 * @interface InternetMessageFormatHeader
 * @property {EmailAddressDetail} from The email address belonging to the sender.
 * @property {EmailAddressDetail[]} to The email addresses belonging to the primary recipients.
 * @property {EmailAddressDetail[]} cc The email addresses belonging to the secondary recipients.
 * @property {EmailAddressDetail[]} bcc The email addresses belonging to additional recipients.
 * @property {EmailAddressDetail[]} replyTo The email addresses in which responses are to be sent.
 * @property {string} subject The subject line of the email message.
 */
export interface InternetMessageFormatHeader {
  from: EmailAddressDetail
  to: EmailAddressDetail[]
  cc: EmailAddressDetail[]
  bcc: EmailAddressDetail[]
  replyTo: EmailAddressDetail[]
  subject: string
}

/**
 * Input object containing information required to send an email message.
 *
 * @property {string} senderEmailAddressId Identifier of the email address being used to
 *  send the email. The identifier must match the identifier of the address of the `from` field
 *  in the RFC 6854 data.
 * @property {InternetMessageFormatHeader} emailMessageHeader The email message headers.
 * @property {string} body The text body of the email message.
 * @property {EmailAttachment[]} attachments List of attached files to be sent with the message.
 *  Default is an empty list.
 * @property {EmailAttachment[]} inlineAttachments List of inline attachments to be sent with the message.
 *  Default is an empty list.
 * @property {string} replyingMessageId Optional identifier of the message being replied to.
 * @property {string} forwardingMessageId Optional identifier of the message being forwarded.
 */
export interface SendEmailMessageInput {
  senderEmailAddressId: string
  emailMessageHeader: InternetMessageFormatHeader
  body: string
  attachments: EmailAttachment[]
  inlineAttachments: EmailAttachment[]
  replyingMessageId?: string
  forwardingMessageId?: string
}

/**
 * Input object containing information required to send a masked email message.
 *
 * @property {string} senderEmailMaskId Identifier of the email mask being used to
 *  send the email. The identifier must match the identifier of the address of the `from` field
 *  in the RFC 6854 data.
 * @property {InternetMessageFormatHeader} emailMessageHeader The email message headers.
 * @property {string} body The text body of the email message.
 * @property {EmailAttachment[]} attachments List of attached files to be sent with the message.
 *  Default is an empty list.
 * @property {EmailAttachment[]} inlineAttachments List of inline attachments to be sent with the message.
 *  Default is an empty list.
 * @property {string} replyingMessageId Optional identifier of the message being replied to.
 * @property {string} forwardingMessageId Optional identifier of the message being forwarded.
 */
export interface SendMaskedEmailMessageInput {
  senderEmailMaskId: string
  emailMessageHeader: InternetMessageFormatHeader
  body: string
  attachments: EmailAttachment[]
  inlineAttachments: EmailAttachment[]
  replyingMessageId?: string
  forwardingMessageId?: string
}

/**
 * Input for `SudoEmailClient.updateEmailMessages`.
 *
 * @interface UpdateEmailMessagesInput
 * @property {string[]} ids A list of one or more identifiers of the email messages to be updated. There is a limit of
 *   100 email message ids per API request. Exceeding this will cause an error to be thrown.
 * @property values The new value(s) to set for each listed email message.
 */
export interface UpdateEmailMessagesInput {
  ids: string[]
  values: { folderId?: string; seen?: boolean }
}

/**
 * Input for `SudoEmailClient.getEmailMessageRfc822Data`.
 *
 * @interface GetEmailMessageRfc822DataInput
 * @property {string} id The identifier of the email message RFC 822 data to be retrieved.
 * @property {string} emailAddressId The identifier of the email address associated with the email message.
 */
export interface GetEmailMessageRfc822DataInput {
  id: string
  emailAddressId: string
}

/**
 * Input for `SudoEmailClient.getEmailMessageWithBody`.
 *
 * @interface GetEmailMessageWithBodyInput
 * @property {string} id The identifier of the email message RFC 822 data to be retrieved.
 * @property {string} emailAddressId The identifier of the email address associated with the email message.
 */
export interface GetEmailMessageWithBodyInput {
  id: string
  emailAddressId: string
}
