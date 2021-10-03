interface EmailAddressDetail {
  displayName?: string
  emailAddress: string
}
export interface EmailMessageDetails {
  from: EmailAddressDetail[]
  to: EmailAddressDetail[]
  cc: EmailAddressDetail[]
  bcc: EmailAddressDetail[]
  replyTo: EmailAddressDetail[]
  subject?: string
  body: string
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
  const message = [
    'Content-Type: text/plain; charset="UTF-8"\n',
    'MIME-Version: 1.0\n',
    'to: ',
    details.to.map(emailAddressDetailToString),
    '\n',
    'cc: ',
    details.cc.map(emailAddressDetailToString),
    '\n',
    'bcc: ',
    details.bcc.map(emailAddressDetailToString),
    '\n',
    'from: ',
    details.from.map(emailAddressDetailToString),
    '\n',
    'subject: ',
    details.subject,
    '\n',
    '\n',
    details.body,
  ]
  return message.join('')
}
