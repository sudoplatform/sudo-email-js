/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

export interface EmailAddressDetail {
  displayName?: string
  emailAddress: string
}
export interface EmailAttachment {
  contentType: string
  contentTransferEncoding: string
  content: string
  fileName: string
}

export interface EmailMessageDetails {
  from: EmailAddressDetail[]
  to: EmailAddressDetail[]
  cc: EmailAddressDetail[]
  bcc: EmailAddressDetail[]
  replyTo: EmailAddressDetail[]
  subject?: string
  body: string
  attachments: EmailAttachment[]
}

const emailAddressDetailToString = (detail: EmailAddressDetail): string => {
  if (detail.displayName) {
    return `${detail.displayName} <${detail.emailAddress}>`
  } else {
    return detail.emailAddress
  }
}

export const createEmailMessageRfc822String = (
  details: EmailMessageDetails,
): string => {
  const message: string[] = []
  if (details.attachments.length === 0) {
    message.push(
      'Content-Type: text/plain; charset="UTF-8"\n',
      'MIME-Version: 1.0\n',
      'to: ',
      ...details.to.map(emailAddressDetailToString),
      '\n',
      'cc: ',
      ...details.cc.map(emailAddressDetailToString),
      '\n',
      'bcc: ',
      ...details.bcc.map(emailAddressDetailToString),
      '\n',
      'from: ',
      ...details.from.map(emailAddressDetailToString),
      '\n',
      'subject: ',
      details.subject ?? '',
      '\n',
      '\n',
    )
    message.push(details.body)
  } else {
    message.push(
      'Content-Type: multipart/mixed; boundary="Part_1"\n',
      'MIME-Version: 1.0\n',
      'to: ',
      ...details.to.map(emailAddressDetailToString),
      '\n',
      'cc: ',
      ...details.cc.map(emailAddressDetailToString),
      '\n',
      'bcc: ',
      ...details.bcc.map(emailAddressDetailToString),
      '\n',
      'from: ',
      ...details.from.map(emailAddressDetailToString),
      '\n',
      'subject: ',
      details.subject ?? '',
      '\n',
      '\n',
      '--Part_1\n',
      'Content-Type: multipart/alternative; boundary="Part_2"\n',
      '\n',
      '--Part_2\n',
      'Content-Type: text/plain; charset=utf-8\n',
      'Content-Transfer-Encoding: 7bit\n',
      '\n',
    )
    message.push(details.body)
    message.push('\n', '--Part_2--\n')

    details.attachments.forEach((a) => {
      message.push(
        '\n',
        '--Part_1\n',
        `ContentType: ${a.contentType}; name="${a.fileName}"\n`,
        `Content-Transfer-Encoding: ${a.contentTransferEncoding}\n`,
        `Content-Disposition: attachment; filename="${a.fileName}"\n`,
        '\n',
        `${a.content}\n`,
      )
    })
    message.push('--Part_1--\n')
  }
  return message.join('')
}
