/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EmailAddressDetail,
  EmailAttachment,
  InternetMessageFormatHeader,
  SendEmailMessageInput,
} from '../../../src'

export type SendMessageInputSansSenderId = Omit<
  SendEmailMessageInput,
  'senderEmailAddressId'
>

export const constructSendMessageInputSansSenderId = ({
  from,
  to = [],
  cc = [],
  bcc = [],
  replyTo = [],
  subject = 'Test subject',
  body = 'Hello, World',
  attachments = [],
  inlineAttachments = [],
  forwardingMessageId,
  replyingMessageId,
}: {
  from: EmailAddressDetail
  to?: EmailAddressDetail[]
  cc?: EmailAddressDetail[]
  bcc?: EmailAddressDetail[]
  replyTo?: EmailAddressDetail[]
  body?: string
  subject?: string
  attachments?: EmailAttachment[]
  inlineAttachments?: EmailAttachment[]
  forwardingMessageId?: string
  replyingMessageId?: string
}): SendMessageInputSansSenderId => {
  return {
    emailMessageHeader: {
      from,
      to,
      cc,
      bcc,
      replyTo,
      subject,
    },
    body,
    attachments,
    inlineAttachments,
    forwardingMessageId,
    replyingMessageId,
  }
}
