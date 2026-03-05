/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
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

/**
 * Given a HTML body of a verification code email, extracts the OTP.
 * @param {string} body HTML body string
 * @returns {string} OTP within the verification code email
 */
export function extractOtp(body: string | false): string {
  if (!body) return ''
  return body.match(/(?<=otp">)\d+/gm)?.[0] ?? ''
}
