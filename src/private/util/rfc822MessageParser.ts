/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { createMimeMessage } from 'mail-mime-builder'
import { simpleParser, AddressObject } from 'mailparser'
import {
  EmailAddressDetail,
  EmailAttachment,
  EncryptionStatus,
  InternalError,
} from '../../public'
import {
  AttachmentOptions,
  MailboxAddrObject,
  ContentTransferEncoding,
} from 'mail-mime-builder/umd/types'
import { Base64 } from '@sudoplatform/sudo-common'

export interface EmailMessageDetails {
  from: EmailAddressDetail[]
  to?: EmailAddressDetail[]
  cc?: EmailAddressDetail[]
  bcc?: EmailAddressDetail[]
  replyTo?: EmailAddressDetail[]
  subject?: string
  body?: string
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
export class Rfc822MessageParser {
  /**
   * Encodes the given email into an RFC822 compliant buffer
   *
   * @param {EmailMessageDetails} email The email to be encoded
   * @returns ArrayBuffer
   */
  public static encodeToRfc822DataBuffer(
    email: EmailMessageDetails,
  ): ArrayBuffer {
    const parsed = Rfc822MessageParser.encodeToRfc822DataStr(email)
    return new TextEncoder().encode(parsed)
  }

  /**
   * Encodes the given email into an RFC822 compliant string
   *
   * @param {EmailMessageDetails} email The email to be encoded
   * @returns string
   */
  public static encodeToRfc822DataStr({
    from,
    to,
    cc,
    bcc,
    replyTo,
    subject,
    body,
    attachments,
    inlineAttachments,
    encryptionStatus = EncryptionStatus.UNENCRYPTED,
  }: EmailMessageDetails): string {
    const msg = createMimeMessage()
    if (from && from.length > 0) {
      msg.setSender(
        Rfc822MessageParser.emailAddressDetailToMailboxAddrObject(from[0]),
      )
    }
    msg.setRecipients(
      to?.map(Rfc822MessageParser.emailAddressDetailToMailboxAddrObject) ?? [],
    )
    msg.setCc(
      cc?.map(Rfc822MessageParser.emailAddressDetailToMailboxAddrObject) ?? [],
    )
    msg.setBcc(
      bcc?.map(Rfc822MessageParser.emailAddressDetailToMailboxAddrObject) ?? [],
    )
    msg.setReplyTo(
      replyTo?.map(Rfc822MessageParser.emailAddressDetailToMailboxAddrObject) ??
        [],
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
    }

    attachments?.forEach((attachment) => {
      msg.addAttachment(
        Rfc822MessageParser.emailAttachmentToAttachmentOptions(attachment),
      )
    })

    inlineAttachments?.forEach((attachment) => {
      msg.addAttachment(
        Rfc822MessageParser.emailAttachmentToAttachmentOptions(attachment),
      )
    })

    const rawMsg = msg.asRaw()
    // Decode and encoded words in the email i.e. Subject, display names
    return Rfc822MessageParser.decodeEncodedWords(rawMsg)
  }

  /**
   * Decodes an RFC822 compliant email string into a EmailMessageDetails object
   * @param {string} data The message to be decoded
   * @returns EmailMessageDetails
   */
  public static async decodeRfc822Data(
    data: string,
  ): Promise<EmailMessageDetails> {
    const parsed = await simpleParser(data, { skipTextToHtml: true })

    const from: EmailAddressDetail[] =
      parsed.from?.value.map((addr) => ({
        emailAddress: addr.address ?? '',
        displayName: addr.name,
      })) ?? []
    const replyTo: EmailAddressDetail[] =
      parsed.replyTo?.value.map((addr) => ({
        emailAddress: addr.address ?? '',
        displayName: addr.name,
      })) ?? []

    const to = Rfc822MessageParser.addressObjectToEmailAddressDetailArray(
      parsed.to,
    )
    const cc = Rfc822MessageParser.addressObjectToEmailAddressDetailArray(
      parsed.cc,
    )
    const bcc = Rfc822MessageParser.addressObjectToEmailAddressDetailArray(
      parsed.bcc,
    )

    const body = parsed.text?.trim()
    const subject = parsed.subject

    const encryptionHeader = parsed.headers.get(
      EMAIL_HEADER_NAME_ENCRYPTION.toLowerCase(),
    )

    const encryptionStatus =
      encryptionHeader?.valueOf() === PLATFORM_ENCRYPTION
        ? EncryptionStatus.ENCRYPTED
        : EncryptionStatus.UNENCRYPTED

    const attachments: EmailAttachment[] = []
    const inlineAttachments: EmailAttachment[] = []
    console.log({ parsAtt: parsed.attachments })
    parsed.attachments.forEach((a) => {
      const contentTransferEncoding =
        a.headers.get(CONTENT_TRANSFER_ENCODING.toLowerCase())?.valueOf() ??
        'base64'

      const attachment: EmailAttachment = {
        data: Base64.encodeString(new TextDecoder().decode(a.content)),
        filename: a.filename ?? '',
        contentTransferEncoding:
          contentTransferEncoding as ContentTransferEncoding,
        mimeType: a.contentType,
        contentId: a.contentId?.replace(/(<|>)/g, ''),
        inlineAttachment: a.contentDisposition === 'inline',
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
      subject,
      encryptionStatus,
      attachments,
      inlineAttachments,
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
   * Supposedly, the `to`, `cc`, and `bcc` properties on the `ParsedMail` object can be
   * arrays of `AddressObject`s. But, the `AddressObject` already contains an array of
   * email addresses to represent the actual recipients. This function converts those properties
   * to an array of our EmailAddressDetail objects.
   *
   * I've looked through the source code of the library and done some
   * testing and as far as I can tell there is no path where that can actually happen so
   * I can say with some confidence that the outer loop of the nested loop below will
   * only run once.
   *
   * @param {AddressObject | AddressObject[] | undefined} addressObject The value of the `to` `cc` or `bcc` properties of the `ParsedMail` object
   * @return {EmailAddressDetail[]}
   */
  private static addressObjectToEmailAddressDetailArray(
    addressObject: AddressObject | AddressObject[] | undefined,
  ): EmailAddressDetail[] {
    if (addressObject && !Array.isArray(addressObject)) {
      addressObject = [addressObject]
    }
    const result: EmailAddressDetail[] = []
    addressObject?.forEach((ao) =>
      ao.value.forEach((a) =>
        result.push({ emailAddress: a.address ?? '', displayName: a.name }),
      ),
    )
    return result
  }
}
