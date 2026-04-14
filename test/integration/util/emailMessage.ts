/**
 * Copyright © 2026 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EmailAddressDetail,
  EmailAttachment,
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
 * Tries multiple patterns in priority order:
 * 1. HTML tag pattern: 6 digits within HTML tags (e.g., >123456<)
 * 2. Standalone line: 6 digits on their own line, excluding color specs
 * 3. Word boundary: Any 6 digits with word boundaries, excluding color specs
 *
 * @param {string} body HTML body string
 * @returns {string} OTP within the verification code email, or empty string if not found
 */
export function extractOtp(body: string | false): string {
  if (!body) return ''

  // Pattern 1: 6 digits within HTML tags
  const htmlTagMatch = body.match(/>(\d{6})</)?.[1]
  if (htmlTagMatch) {
    return htmlTagMatch
  }

  // Pattern 2: Line with only 6 digits (not preceded by #)
  const lines = body.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    // Match 6 digits on their own line, not preceded by #
    if (/^(?!#)\d{6}$/.test(trimmed)) {
      return trimmed
    }
  }

  // Pattern 3: Any 6 digits with word boundaries (not preceded by #)
  // Using negative lookbehind to avoid matching hex colors like #000000
  const boundaryMatch = body.match(/(?<!#)\b(\d{6})\b/)?.[1]
  if (boundaryMatch) {
    return boundaryMatch
  }

  return ''
}
