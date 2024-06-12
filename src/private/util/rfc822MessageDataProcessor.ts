/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { MIMETextError, createMimeMessage } from 'mail-mime-builder'
import {
  EmailAddressDetail,
  EmailAttachment,
  EncryptionStatus,
  InternalError,
  InvalidEmailContentsError,
} from '../../public'
import {
  AttachmentOptions,
  MailboxAddrObject,
} from 'mail-mime-builder/umd/types'
import { Base64 } from '@sudoplatform/sudo-common'
import { stringToArrayBuffer } from './buffer'
import PostalMime, { Address } from 'postal-mime'
import { htmlToPlaintext } from './stringUtils'

export interface EmailMessageDetails {
  from: EmailAddressDetail[]
  to?: EmailAddressDetail[]
  cc?: EmailAddressDetail[]
  bcc?: EmailAddressDetail[]
  replyTo?: EmailAddressDetail[]
  subject?: string
  body?: string
  bodyHtml?: string
  attachments?: EmailAttachment[]
  inlineAttachments?: EmailAttachment[]
  encryptionStatus?: EncryptionStatus
}

export const EMAIL_HEADER_NAME_ENCRYPTION = 'X-Sudoplatform-Encryption'
export const PLATFORM_ENCRYPTION = 'sudoplatform'

export const CANNED_TEXT_BODY = 'Encrypted message attached'

const CONTENT_TRANSFER_ENCODING = 'Content-Transfer-Encoding'
const CONTENT_ID = 'Content-ID'

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
    email: EmailMessageDetails,
  ): ArrayBuffer {
    const parsed = Rfc822MessageDataProcessor.encodeToInternetMessageStr(email)
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
    subject,
    body,
    bodyHtml,
    attachments,
    inlineAttachments,
    encryptionStatus = EncryptionStatus.UNENCRYPTED,
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
    msg.setReplyTo(
      replyTo?.map(
        Rfc822MessageDataProcessor.emailAddressDetailToMailboxAddrObject,
      ) ?? [],
    )
    msg.setSubject(subject ?? '')

    if (encryptionStatus === EncryptionStatus.ENCRYPTED) {
      msg.setHeader(EMAIL_HEADER_NAME_ENCRYPTION, PLATFORM_ENCRYPTION)
      msg.addMessage({
        data: CANNED_TEXT_BODY,
        charset: 'UTF-8',
        contentType: 'text/plain',
      })
    } else {
      msg.addMessage({
        data: body ?? '',
        charset: 'UTF-8',
        contentType: 'text/plain',
      })
      msg.addMessage({
        data: bodyHtml ?? '',
        contentType: 'text/html',
        charset: 'UTF-8',
      })
    }

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
      const parsed = await PostalMime.parse(stringToArrayBuffer(data))

      const from: EmailAddressDetail[] = [
        {
          emailAddress: parsed.from?.address ?? '',
          displayName: parsed.from?.name,
        },
      ]
      const replyTo =
        Rfc822MessageDataProcessor.addressObjectToEmailAddressDetailArray(
          parsed.replyTo,
        )

      const to =
        Rfc822MessageDataProcessor.addressObjectToEmailAddressDetailArray(
          parsed.to,
        )
      const cc =
        Rfc822MessageDataProcessor.addressObjectToEmailAddressDetailArray(
          parsed.cc,
        )
      const bcc =
        Rfc822MessageDataProcessor.addressObjectToEmailAddressDetailArray(
          parsed.bcc,
        )

      const body = parsed.text
        ? parsed.text.trim()
        : htmlToPlaintext(parsed.html ?? '')
      const bodyHtml = parsed.html
      const subject = parsed.subject

      const encryptionHeader = parsed.headers.find(
        (h) => h.key === EMAIL_HEADER_NAME_ENCRYPTION.toLowerCase(),
      )

      const encryptionStatus =
        encryptionHeader?.value === PLATFORM_ENCRYPTION
          ? EncryptionStatus.ENCRYPTED
          : EncryptionStatus.UNENCRYPTED

      const attachments: EmailAttachment[] = []
      const inlineAttachments: EmailAttachment[] = []
      parsed.attachments.forEach((a) => {
        const attachment: EmailAttachment = {
          data: Base64.encode(a.content).trim(),
          filename: a.filename ?? '',
          contentTransferEncoding: 'base64',
          mimeType: a.mimeType,
          contentId: a.contentId?.replace(/(<|>)/g, ''),
          inlineAttachment: a.disposition === 'inline',
        }
        // This is necessary because inline attachments are included in the parsed object twice
        if (
          !attachments.some((a) => a.filename === attachment.filename) &&
          !inlineAttachments.some((a) => a.filename === attachment.filename)
        ) {
          attachment.inlineAttachment
            ? inlineAttachments.push(attachment)
            : attachments.push(attachment)
        }
      })

      return {
        from,
        to,
        cc,
        bcc,
        replyTo,
        body,
        bodyHtml,
        subject,
        encryptionStatus,
        attachments,
        inlineAttachments,
      }
    } catch (e) {
      console.error('Error decoding Rfc822 data', { e })
      throw e
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
    return {
      addr: address.emailAddress,
      name: address.displayName,
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
   * @param {Address[] | undefined} addressObject The value of the `replyTo`, `to`, `cc`, or `bcc` properties of the `Email` object
   * @return {EmailAddressDetail[]}
   */
  private static addressObjectToEmailAddressDetailArray(
    addressObject: Address[] | undefined,
  ): EmailAddressDetail[] {
    const result: EmailAddressDetail[] = []
    addressObject?.forEach((a) =>
      result.push({ emailAddress: a.address ?? '', displayName: a.name }),
    )

    return result
  }
}
