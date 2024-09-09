/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CachePolicy, DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import {
  EmailAttachment,
  InNetworkAddressNotFoundError,
  InternetMessageFormatHeader,
  InvalidArgumentError,
} from '../../../../public'
import { EmailMessageDetails } from '../../../util/rfc822MessageDataProcessor'
import { EmailAccountService } from '../../entities/account/emailAccountService'
import { EmailConfigurationDataService } from '../../entities/configuration/configurationDataService'
import { EmailMessageService } from '../../entities/message/emailMessageService'
import { MessageFormatter } from '../../../util/messageFormatter'
import { EmailDomainService } from '../../entities/emailDomain/emailDomainService'

/**
 * Input object containing information required to send an email message.
 *
 * @property {string} senderEmailAddressId Identifier of the email address being used to
 *  send the email. The identifier must match the identifier of the address of the `from` field
 *  in the RFC 6854 data.
 * @property {InternetMessageFormatHeader} emailMessageHeader The email message headers.
 * @property {string} body The text body of the email message.
 * @property {EmailAttachment[]} attachments List of attached files to be sent with the message.
 *  Default is an empty list.
 * @property {EmailAttachment[]} inlineAttachments List of inline attachments to be sent with the message.
 *  Default is an empty list.
 * @property {string} replyingMessageId Identifier of the message being replied to.
 *  If this property is set, `forwardedMessageId` must not be set.
 * @property {string} forwardingMessageId Identifier of the message being forwarded.
 *  If this property is set, `replyingMessageId` must not be set.
 */
interface SendEmailMessageUseCaseInput {
  senderEmailAddressId: string
  emailMessageHeader: InternetMessageFormatHeader
  body: string
  attachments: EmailAttachment[]
  inlineAttachments: EmailAttachment[]
  replyingMessageId?: string
  forwardingMessageId?: string
}

/**
 * Output for the send email message use case.
 *
 * @interface  SendEmailMessageUseCaseOutput
 * @property {string} id The unique identifier of the message.
 * @property {Date} createdAt The timestamp in which the message was created.
 */
interface SendEmailMessageUseCaseOutput {
  id: string
  createdAt: Date
}

/**
 * Application business logic for sending an email message.
 */
export class SendEmailMessageUseCase {
  private readonly log: Logger

  constructor(
    private readonly messageService: EmailMessageService,
    private readonly accountService: EmailAccountService,
    private readonly domainService: EmailDomainService,
    private readonly configurationDataService: EmailConfigurationDataService,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    senderEmailAddressId,
    emailMessageHeader,
    body,
    attachments,
    inlineAttachments,
    replyingMessageId,
    forwardingMessageId,
  }: SendEmailMessageUseCaseInput): Promise<SendEmailMessageUseCaseOutput> {
    this.log.debug(this.constructor.name, {
      senderEmailAddressId,
      emailMessageHeader,
      body,
      attachments,
      inlineAttachments,
      replyingMessageId,
      forwardingMessageId,
    })
    const { sendEncryptedEmailEnabled, emailMessageMaxOutboundMessageSize } =
      await this.configurationDataService.getConfigurationData()

    if (replyingMessageId && forwardingMessageId) {
      throw new InvalidArgumentError(
        'Unable to send - received values for both `replyingMessageId` and `forwardingMessageId`',
      )
    }

    const { from, to, cc, bcc, replyTo, subject } = emailMessageHeader
    let message: EmailMessageDetails = {
      from: [from],
      to,
      cc,
      bcc,
      replyTo,
      subject,
      body: body,
      attachments,
      inlineAttachments,
    }

    if (replyingMessageId) {
      // Get message details associated with the reply message id.
      try {
        const [replyMessage, replyMessageWithBody] = await Promise.all([
          this.messageService.getMessage({
            id: replyingMessageId,
          }),
          this.messageService.getEmailMessageWithBody({
            id: replyingMessageId,
            emailAddressId: senderEmailAddressId,
          }),
        ])
        if (replyMessage && replyMessageWithBody) {
          message.replyMessageId = replyingMessageId
          message = MessageFormatter.formatAsReplyingMessage(message, {
            from: replyMessage.to,
            date: replyMessage.date,
            subject: replyMessage.subject,
            body: replyMessageWithBody.body,
          })
        }
      } catch (err) {
        // Don't cause a send failure - just log and continue
        this.log.error(
          `Failed to get reply message with id ${replyingMessageId}, error: ${(err as Error).message}`,
        )
      }
    } else if (forwardingMessageId) {
      // Get message details associated with the forward message id.
      try {
        const [forwardMessage, forwardMessageWithBody] = await Promise.all([
          this.messageService.getMessage({
            id: forwardingMessageId,
            cachePolicy: CachePolicy.CacheOnly,
          }),
          this.messageService.getEmailMessageWithBody({
            id: forwardingMessageId,
            emailAddressId: senderEmailAddressId,
          }),
        ])
        if (forwardMessage && forwardMessageWithBody) {
          message.forwardMessageId = forwardingMessageId
          message = MessageFormatter.formatAsForwardingMessage(message, {
            from: forwardMessage.from,
            to: forwardMessage.to,
            cc: forwardMessage.cc,
            date: forwardMessage.date,
            subject: forwardMessage.subject,
            body: forwardMessageWithBody.body,
          })

          // Add all attachments from the forwarded message to the current message
          attachments.push(...forwardMessageWithBody.attachments)
          attachments.push(...forwardMessageWithBody.inlineAttachments)
        }
      } catch (err) {
        // Don't cause a send failure - just log and continue
        this.log.error(
          `Failed to get forward message with id ${forwardingMessageId}, error: ${(err as Error).message}`,
        )
      }
    }

    if (!sendEncryptedEmailEnabled) {
      // Process non-encrypted email message
      return await this.messageService.sendMessage({
        message,
        senderEmailAddressId,
        emailMessageMaxOutboundMessageSize,
      })
    }

    const domains = await this.domainService.getConfiguredEmailDomains({})

    const allRecipients: string[] = []
    to?.forEach((addr) => allRecipients.push(addr.emailAddress))
    cc?.forEach((addr) => allRecipients.push(addr.emailAddress))
    bcc?.forEach((addr) => allRecipients.push(addr.emailAddress))

    // Identify whether recipients are internal or external based on their domains
    const internalRecipients: string[] = []
    const externalRecipients: string[] = []
    allRecipients.forEach((address) => {
      if (domains.some((domain) => address.includes(domain.domain))) {
        internalRecipients.push(address)
      } else {
        externalRecipients.push(address)
      }
    })

    if (internalRecipients.length) {
      // Lookup public key information for each internal recipient and sender
      const emailAddressesPublicInfo =
        await this.accountService.lookupPublicInfo({
          emailAddresses: [...internalRecipients, from.emailAddress],
        })
      // Check whether internal recipient addresses and associated public keys exist in the platform
      const isInNetwork = internalRecipients.every((r) =>
        emailAddressesPublicInfo.some((p) => p.emailAddress === r),
      )
      if (!isInNetwork) {
        throw new InNetworkAddressNotFoundError(
          'At least one email address does not exist in network',
        )
      }
      if (!externalRecipients.length) {
        // Process encrypted email message
        return await this.messageService.sendEncryptedMessage({
          message,
          senderEmailAddressId,
          emailAddressesPublicInfo,
          emailMessageMaxOutboundMessageSize,
        })
      } else {
        // Process non-encrypted email message
        return await this.messageService.sendMessage({
          message,
          senderEmailAddressId,
          emailMessageMaxOutboundMessageSize,
        })
      }
    } else {
      // Process non-encrypted email message
      return await this.messageService.sendMessage({
        message,
        senderEmailAddressId,
        emailMessageMaxOutboundMessageSize,
      })
    }
  }
}
