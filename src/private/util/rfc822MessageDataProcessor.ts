/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EmailAddressDetail,
  EmailAttachment,
  EncryptionStatus,
  InternalError,
  InvalidEmailContentsError,
} from '../../public'
import { Base64 } from '@sudoplatform/sudo-common'
import {
  AttachmentOptions,
  MIMETextError,
  Mailbox,
  MailboxAddrObject,
  createMimeMessage,
} from 'mimetext'
import { extract, parse } from 'letterparser'
import { LetterparserMailbox } from 'letterparser/lib/esm/extractor'
import { escapeBackslashesAndDoubleQuotes } from './stringUtils'

export interface EmailMessageDetails {
  from: EmailAddressDetail[]
  to?: EmailAddressDetail[]
  cc?: EmailAddressDetail[]
  bcc?: EmailAddressDetail[]
  replyTo?: EmailAddressDetail[]
  subject?: string
  body?: string
  isHtml?: boolean
  attachments?: EmailAttachment[]
  inlineAttachments?: EmailAttachment[]
  encryptionStatus?: EncryptionStatus
  forwardMessageId?: string
  replyMessageId?: string
}

export const EMAIL_HEADER_NAME_ENCRYPTION = 'X-Sudoplatform-Encryption'
export const PLATFORM_ENCRYPTION = 'sudoplatform'

export const CANNED_TEXT_BODY = 'Encrypted message attached'

const CONTENT_TRANSFER_ENCODING = 'Content-Transfer-Encoding'
const CONTENT_ID = 'Content-ID'

const IN_REPLY_TO_HEADER_NAME = 'In-Reply-To'
const REFERENCES_HEADER_NAME = 'References'

const encodedStringRegex = RegExp(
  /(?:=\?([\w-]+)\?([A-Z])\?([a-zA-Z0-9+\/=]*)\?=)/,
  'g',
)

/**
 * A class which handler the encoding and parsing of the RFC822 compatible email message content
 */
export class Rfc822MessageDataProcessor {
  /**
   * Encodes the given email into an RFC822 compliant buffer
   *
   * @param {EmailMessageDetails} email The email to be encoded
   * @returns ArrayBuffer
   */
  public static encodeToInternetMessageBuffer(
    emailMessage: EmailMessageDetails,
  ): ArrayBuffer {
    const parsed =
      Rfc822MessageDataProcessor.encodeToInternetMessageStr(emailMessage)
    return new TextEncoder().encode(parsed)
  }

  /**
   * Encodes the given email into an RFC822 compliant string
   *
   * @param {EmailMessageDetails} email The email to be encoded
   * @returns string
   */
  public static encodeToInternetMessageStr({
    from,
    to,
    cc,
    bcc,
    replyTo,
    subject = '',
    body = '',
    isHtml = true,
    attachments,
    inlineAttachments,
    encryptionStatus = EncryptionStatus.UNENCRYPTED,
    forwardMessageId,
    replyMessageId,
  }: EmailMessageDetails): string {
    const msg = createMimeMessage()
    if (from && from.length > 0) {
      msg.setSender(
        Rfc822MessageDataProcessor.emailAddressDetailToMailboxAddrObject(
          from[0],
        ),
      )
    }
    msg.setRecipients(
      to?.map(
        Rfc822MessageDataProcessor.emailAddressDetailToMailboxAddrObject,
      ) ?? [],
    )
    msg.setCc(
      cc?.map(
        Rfc822MessageDataProcessor.emailAddressDetailToMailboxAddrObject,
      ) ?? [],
    )
    msg.setBcc(
      bcc?.map(
        Rfc822MessageDataProcessor.emailAddressDetailToMailboxAddrObject,
      ) ?? [],
    )

    // mimetext currently only supports a single `replyTo` address
    // https://github.com/muratgozel/MIMEText/issues/69
    if (replyTo && replyTo?.length != 0) {
      const mailbox: Mailbox = new Mailbox(
        replyTo[0].displayName
          ? `${replyTo[0].displayName} <${replyTo[0].emailAddress}>`
          : replyTo[0].emailAddress,
      )
      msg.setHeader('Reply-To', mailbox)
    }

    if (encryptionStatus === EncryptionStatus.ENCRYPTED) {
      msg.setHeader(EMAIL_HEADER_NAME_ENCRYPTION, PLATFORM_ENCRYPTION)
      body = CANNED_TEXT_BODY
      isHtml = false
    } else {
      if (forwardMessageId) {
        msg.setHeader(REFERENCES_HEADER_NAME, `<${forwardMessageId}>`)
      } else if (replyMessageId) {
        msg.setHeader(IN_REPLY_TO_HEADER_NAME, `<${replyMessageId}>`)
      }
    }

    msg.setSubject(subject)
    msg.addMessage({
      data: body,
      contentType: isHtml ? 'text/html' : 'text/plain',
      charset: 'UTF-8',
    })

    attachments?.forEach((attachment) => {
      msg.addAttachment(
        Rfc822MessageDataProcessor.emailAttachmentToAttachmentOptions(
          attachment,
        ),
      )
    })

    inlineAttachments?.forEach((attachment) => {
      msg.addAttachment(
        Rfc822MessageDataProcessor.emailAttachmentToAttachmentOptions(
          attachment,
        ),
      )
    })

    try {
      const rawMsg = msg.asRaw()
      // Decode and encoded words in the email i.e. Subject, display names
      return Rfc822MessageDataProcessor.decodeEncodedWords(rawMsg)
    } catch (e) {
      console.error('Error encoding rfc822 data', { e })
      if (e instanceof MIMETextError) {
        throw new InvalidEmailContentsError(e.message)
      } else {
        throw e
      }
    }
  }

  /**
   * Decodes an RFC822 compliant email string into a EmailMessageDetails object
   * @param {string} data The message to be decoded
   * @returns EmailMessageDetails
   */
  public static async parseInternetMessageData(
    data: string,
  ): Promise<EmailMessageDetails> {
    try {
      const parsedMessage = extract(data)

      const from =
        Rfc822MessageDataProcessor.addressObjectToEmailAddressDetailArray(
          parsedMessage.from,
        )

      const replyTo =
        Rfc822MessageDataProcessor.addressObjectToEmailAddressDetailArray(
          parsedMessage.replyTo,
        )

      const to =
        Rfc822MessageDataProcessor.addressObjectToEmailAddressDetailArray(
          parsedMessage.to,
        )
      const cc =
        Rfc822MessageDataProcessor.addressObjectToEmailAddressDetailArray(
          parsedMessage.cc,
        )
      const bcc =
        Rfc822MessageDataProcessor.addressObjectToEmailAddressDetailArray(
          parsedMessage.bcc,
        )

      let body = ''
      let isHtml = false
      if (parsedMessage.html) {
        body = parsedMessage.html
        isHtml = true
      } else {
        body = parsedMessage.text ? parsedMessage.text.trim() : ''
      }
      const subject = parsedMessage.subject

      const parsedHeaders = parse(data)

      const encryptionHeader =
        parsedHeaders.headers[EMAIL_HEADER_NAME_ENCRYPTION]

      const encryptionStatus =
        encryptionHeader?.valueOf() === PLATFORM_ENCRYPTION
          ? EncryptionStatus.ENCRYPTED
          : EncryptionStatus.UNENCRYPTED

      const attachments: EmailAttachment[] = []
      const inlineAttachments: EmailAttachment[] = []
      parsedMessage.attachments?.forEach((a) => {
        let attachmentData = a.body
        if (typeof attachmentData !== 'string') {
          attachmentData = Base64.encode(attachmentData)
        } else {
          attachmentData = Base64.encodeString(attachmentData)
        }

        const attachment: EmailAttachment = {
          data: attachmentData.trim(),
          filename: a.filename ?? '',
          contentTransferEncoding: 'base64',
          mimeType: a.contentType.type,
          contentId: a.contentId?.replace(/(<|>)/g, ''),
          inlineAttachment:
            a.contentId && parsedMessage.html
              ? parsedMessage.html.includes(a.contentId)
              : false,
        }
        // This is necessary because inline attachments are included in the parsed object twice
        if (
          !attachments.some((a) => a.filename === attachment.filename) &&
          !inlineAttachments.some((a) => a.filename === attachment.filename)
        ) {
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          attachment.inlineAttachment
            ? inlineAttachments.push(attachment)
            : attachments.push(attachment)
        }
      })

      const messageDetails: EmailMessageDetails = {
        from,
        to,
        cc,
        bcc,
        replyTo,
        body,
        isHtml,
        subject,
        encryptionStatus,
        attachments,
        inlineAttachments,
      }

      if (!!parsedHeaders.headers[REFERENCES_HEADER_NAME]) {
        // The standard for this header is a list, so parse the last added value only.
        // We only ever track a single id.
        const chunks =
          parsedHeaders.headers[REFERENCES_HEADER_NAME].split(/,|, /)
        const forwardMessageId = chunks[chunks.length - 1].replace(/<|>/g, '')
        messageDetails.forwardMessageId = forwardMessageId
      }
      if (!!parsedHeaders.headers[IN_REPLY_TO_HEADER_NAME]) {
        const replyMessageId = parsedHeaders.headers[
          IN_REPLY_TO_HEADER_NAME
        ].replace(/<|>/g, '')
        messageDetails.replyMessageId = replyMessageId
      }

      return messageDetails
    } catch (e) {
      console.error('Error decoding Rfc822 data', { e })
      if (e instanceof Error) {
        console.error(e.stack)
      }
      throw e
    }
  }

  /**
   * Helper function to stringify an `EmailAddressDetails`
   */
  public static emailAddressDetailToString(
    address: EmailAddressDetail,
  ): string {
    if (address.displayName) {
      const name = escapeBackslashesAndDoubleQuotes(address.displayName)

      return `"${name}" <${address.emailAddress}>` // Wrap display name in double quotes and construct address
    } else {
      return address.emailAddress
    }
  }

  /**
   * Converts an EmailAddressDetail object to a MailboxAddrObject for use in mail-mime-builder functions
   * @param {EmailAddressDetail} address
   * @returns MailboxAddrObject
   */
  private static emailAddressDetailToMailboxAddrObject(
    address: EmailAddressDetail,
  ): MailboxAddrObject {
    if (address.displayName) {
      const name = escapeBackslashesAndDoubleQuotes(address.displayName)
      return {
        addr: address.emailAddress,
        name: `"${name}"`, // Wrap display name in double quotes
      }
    } else {
      return {
        addr: address.emailAddress,
      }
    }
  }

  /**
   * Converts an EmailAttachment object to an AttachmentOptions for use in mail-mime-builder functions
   * @param {EmailAttachment} attachment
   * @returns AttachmentOptions
   */
  private static emailAttachmentToAttachmentOptions(
    attachment: EmailAttachment,
  ): AttachmentOptions {
    return {
      data: attachment.data,
      contentType: attachment.mimeType,
      filename: attachment.filename,
      inline: attachment.inlineAttachment,
      headers: {
        [CONTENT_TRANSFER_ENCODING]: attachment.contentTransferEncoding,
        [CONTENT_ID]: attachment.contentId,
      },
    }
  }

  /**
   * `mail-mime-builder` encodes parts of the email (subject, display names etc) as Encoded Strings. This decodes them back
   * to plaintext.
   * @param {string} input The full RFC822 string as output by mail-mime-builder .asRaw() function
   * @returns string
   */
  private static decodeEncodedWords(input: string): string {
    let resultString = input
    const results = [...input.matchAll(encodedStringRegex)]

    if (!results) {
      // Nothing to do
      return resultString
    }
    results.forEach((match) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [group, charset, encoding, value] = match
      if (value === '') {
        // Found a match but its for an empty string
        resultString = resultString.replace(group, value)
      } else {
        let decoded = ''
        switch (encoding) {
          case 'B': // Base64
            const buf = Base64.decode(value)
            decoded = new TextDecoder().decode(buf)
            break
          default:
            throw new InternalError(`Unsupported encoding value ${encoding}`)
        }
        resultString = resultString.replace(group, decoded)
      }
    })

    return resultString
  }

  /**
   * Supposedly, the `to`, `cc`, and `bcc` properties on the `ParsedMail` object can be
   * arrays of `AddressObject`s however, the `AddressObject` already contains an array of
   * email addresses to represent the actual recipients. This function converts those properties
   * to an array of our EmailAddressDetail objects.
   *
   * I've looked through the source code of the library and done some
   * testing and as far as I can tell there is no path where that can actually happen so
   * I can say with some confidence that the outer loop of the nested loop below will
   * only run once.
   *
   * @param {AddressObject | AddressObject[] | undefined} addressObject The value of the `from`, `replyTo`, `to` `cc` or `bcc` properties of the `ParsedMail` object
   * @return {EmailAddressDetail[]}
   */
  private static addressObjectToEmailAddressDetailArray(
    addressObject: LetterparserMailbox | LetterparserMailbox[] | undefined,
  ): EmailAddressDetail[] {
    if (addressObject && !Array.isArray(addressObject)) {
      addressObject = [addressObject]
    }
    const result: EmailAddressDetail[] = []
    addressObject?.map((a) =>
      result.push({ emailAddress: a.address ?? '', displayName: a.name }),
    )
    return result
  }
}
