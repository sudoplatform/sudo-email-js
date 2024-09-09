import {
  EmailMessageDetails,
  Rfc822MessageDataProcessor,
} from './rfc822MessageDataProcessor'

// (in conformance with how MySudo strips images)
const IMAGE_REPLACEMENT_TEXT = '-IMAGE REMOVED-<br/>'
const IMAGE_REPLACEMENT_REGEX = /<img(?<=<img)[^>]*>/g

export interface EncodeableMessageDetails
  extends Pick<EmailMessageDetails, 'from' | 'to' | 'cc' | 'subject' | 'body'> {
  date?: Date
}

export class MessageFormatter {
  public static formatAsReplyingMessage(
    message: EmailMessageDetails,
    replyMessage: EncodeableMessageDetails,
  ): EmailMessageDetails {
    if (!message.subject || message.subject.length === 0) {
      message.subject = `Re: ${replyMessage.subject ?? ''}`
    }
    const encodedReplyMessage = this.encodeReplyMessage(replyMessage)
    message.body = message.body + `\n\n${encodedReplyMessage}`
    message.isHtml = true

    return message
  }

  public static formatAsForwardingMessage(
    message: EmailMessageDetails,
    forwardMessage: EncodeableMessageDetails,
  ): EmailMessageDetails {
    if (!message.subject || message.subject.length === 0) {
      message.subject = `Fwd: ${forwardMessage.subject ?? ''}`
    }
    const encodedForwardMessage = this.encodeForwardMessage(forwardMessage)
    message.body = message.body + `\n\n${encodedForwardMessage}`
    message.isHtml = true

    return message
  }

  /**
   * Create a plaintext reply message string from the given message details.
   * @param messageDetails Details of the message to be formatted.
   */
  public static encodeReplyMessage(
    messageDetails: EncodeableMessageDetails,
  ): string {
    const { from, date, subject, body } = messageDetails

    let replyMessage =
      '<div class="replyMessage"><br/></div>\n' +
      '<div class="replyMessage"><br/></div>\n' +
      '<div class="replyMessage"><br/></div>\n' +
      '<div class="replyMessage"><br/></div>\n' +
      '<hr>\n'

    // Format 'from' addresses line
    if (from && from.length > 0) {
      const fromAddressesLine = from
        .map((emailAddressDetail) =>
          Rfc822MessageDataProcessor.emailAddressDetailToString(
            emailAddressDetail,
          ),
        )
        .join(',')
      replyMessage += `<div class="replyMessage">From: ${fromAddressesLine}</div>\n`
    }

    // Format date line
    if (date) {
      const formattedDate = this.formatDateForEmail(date)
      replyMessage += `<div class="replyMessage">Date: ${formattedDate}</div>\n`
    }

    // Format subject line
    replyMessage += `<div class="replyMessage">Subject: ${subject ?? ''}</div>\n`

    // Format message body and strip all html image tags
    const formattedBody =
      body?.replace(IMAGE_REPLACEMENT_REGEX, IMAGE_REPLACEMENT_TEXT) ?? ''
    replyMessage += `<div><br/>${formattedBody}<br/></div>`

    return replyMessage
  }

  /**
   * Create a plaintext forward message string from the given message details.
   * @param messageDetails Details of the message to be formatted.
   */
  public static encodeForwardMessage(
    messageDetails: EncodeableMessageDetails,
  ): string {
    const { from, date, subject, to, cc, body } = messageDetails

    let forwardMessage =
      '<div class="forwardMessage"><br/></div>\n' +
      '<div class="forwardMessage"><br/></div>\n' +
      '<div class="forwardMessage"><br/></div>\n' +
      '<div class="forwardMessage"><br/></div>\n' +
      '<div class="forwardMessage">---------- Forwarded message ----------</div>\n'

    const fromAddresses =
      from?.map((addressDetail) =>
        Rfc822MessageDataProcessor.emailAddressDetailToString(addressDetail),
      ) ?? []
    const toAddresses =
      to?.map((addressDetail) =>
        Rfc822MessageDataProcessor.emailAddressDetailToString(addressDetail),
      ) ?? []
    const ccAddresses =
      cc?.map((addressDetail) =>
        Rfc822MessageDataProcessor.emailAddressDetailToString(addressDetail),
      ) ?? []

    // Format 'from' addresses line
    if (fromAddresses.length > 0) {
      const fromAddressesLine = fromAddresses.join(',')
      forwardMessage += `<div class="forwardMessage">From: ${fromAddressesLine}</div>\n`
    }

    // Format date line
    if (date) {
      const formattedDate = this.formatDateForEmail(date)
      forwardMessage += `<div class="forwardMessage">Date: ${formattedDate}</div>\n`
    }

    // Format subject line
    forwardMessage += `<div class="forwardMessage">Subject: ${subject ?? ''}</div>\n`

    // Format lines containing from and/or cc addresses
    if (toAddresses.length > 0 || ccAddresses.length > 0) {
      // eslint-disable-next-line quotes
      forwardMessage += `<div class="forwardMessage">\n`
      if (toAddresses.length > 0) {
        const toAddressesLine = toAddresses.join(',')
        forwardMessage += `To: ${toAddressesLine}<br/>\n`
      }
      if (ccAddresses.length > 0) {
        const ccAddressesLine = ccAddresses.join(',')
        forwardMessage += `Cc: ${ccAddressesLine}<br/>\n`
      }
      forwardMessage += '</div>\n'
    }

    // Format message body
    forwardMessage += `<div><br/>${body ?? ''}<br/></div>`

    return forwardMessage
  }

  /**
   * Create a date/time string in the format 'Tuesday, 2 June 2020 at 9:47 AM'
   * from the given `date` object.
   * @param date The date object to be formatted.
   */
  public static formatDateForEmail(date: Date): string {
    const locale = 'en-US'
    const weekday = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
    }).format(date)
    const day = new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(date)
    const month = new Intl.DateTimeFormat(locale, { month: 'long' }).format(
      date,
    )
    const year = new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(
      date,
    )
    const time = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date)

    const formattedDate = `${weekday}, ${day} ${month} ${year} at ${time}`
    return formattedDate
  }
}
