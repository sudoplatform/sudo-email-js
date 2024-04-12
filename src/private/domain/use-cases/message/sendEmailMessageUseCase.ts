/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailMessageService } from '../../entities/message/emailMessageService'
import {
  EmailMessageDetails,
  Rfc822MessageDataProcessor,
} from '../../../util/rfc822MessageDataProcessor'
import { EmailAccountService } from '../../entities/account/emailAccountService'
import {
  EmailAttachment,
  EncryptionStatus,
  InternetMessageFormatHeader,
} from '../../../../public'

/**
 * Input object containing information required to send an email message.
 *
 * @property {string} senderEmailAddressId [Identifier of the [EmailAddress] being used to
 *  send the email. The identifier must match the identifier of the address of the `from` field
 *  in the RFC 6854 data.
 * @property {InternetMessageFormatHeader} emailMessageHeader The email message headers.
 * @property {string} body The text body of the email message.
 * @property {EmailAttachment[]} attachments List of attached files to be sent with the message.
 *  Default is an empty list.
 * @property {EmailAttachment[]} inlineAttachments List of inline attachments to be sent with the message.
 *  Default is an empty list.
 */
interface SendEmailMessageUseCaseInput {
  senderEmailAddressId: string
  emailMessageHeader: InternetMessageFormatHeader
  body: string
  attachments: EmailAttachment[]
  inlineAttachments: EmailAttachment[]
}

/**
 * Application business logic for sending an email message.
 */
export class SendEmailMessageUseCase {
  private readonly log: Logger

  constructor(
    private readonly messageService: EmailMessageService,
    private readonly accountService: EmailAccountService,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    senderEmailAddressId,
    emailMessageHeader,
    body,
    attachments,
    inlineAttachments,
  }: SendEmailMessageUseCaseInput): Promise<string> {
    this.log.debug(this.constructor.name, {
      senderEmailAddressId,
      emailMessageHeader,
      body,
      attachments,
      inlineAttachments,
    })
    const { from, to, cc, bcc, replyTo, subject } = emailMessageHeader
    const recipients: string[] = []
    to?.forEach((addr) => recipients.push(addr.emailAddress))
    cc?.forEach((addr) => recipients.push(addr.emailAddress))
    bcc?.forEach((addr) => recipients.push(addr.emailAddress))

    const recipientsPublicInfo = await this.accountService.lookupPublicInfo({
      emailAddresses: recipients,
    })

    const allRecipientsHavePubKey = recipients.every((v) =>
      recipientsPublicInfo.some((p) => p.emailAddress === v),
    )

    if (allRecipientsHavePubKey) {
      const message: EmailMessageDetails = {
        from: [from],
        to,
        cc,
        bcc,
        replyTo,
        subject,
        body,
        attachments,
        inlineAttachments,
      }
      return await this.messageService.sendEncryptedMessage({
        message,
        senderEmailAddressId,
        recipientsPublicInfo,
      })
    } else {
      const rfc822Data =
        Rfc822MessageDataProcessor.encodeToInternetMessageBuffer({
          from: [from],
          to,
          cc,
          bcc,
          replyTo,
          subject,
          body,
          attachments,
          inlineAttachments,
          encryptionStatus: EncryptionStatus.UNENCRYPTED,
        })
      return await this.messageService.sendMessage({
        rfc822Data,
        senderEmailAddressId,
      })
    }
  }
}
