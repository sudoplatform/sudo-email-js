/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import {
  EmailAttachment,
  InNetworkAddressNotFoundError,
  InternetMessageFormatHeader,
  LimitExceededError,
} from '../../../../public'
import { EmailMessageDetails } from '../../../util/rfc822MessageDataProcessor'
import { EmailAccountService } from '../../entities/account/emailAccountService'
import { EmailConfigurationDataService } from '../../entities/configuration/configurationDataService'
import { EmailMessageService } from '../../entities/message/emailMessageService'
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
    const {
      sendEncryptedEmailEnabled,
      emailMessageMaxOutboundMessageSize,
      emailMessageRecipientsLimit,
      encryptedEmailMessageRecipientsLimit,
    } = await this.configurationDataService.getConfigurationData()

    const { from, to, cc, bcc, replyTo, subject } = emailMessageHeader
    const message: EmailMessageDetails = {
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

    // Indicate if outgoing message is forwarding and/or replying to another message
    if (forwardingMessageId) {
      message.forwardMessageId = forwardingMessageId
    }
    if (replyingMessageId) {
      message.replyMessageId = replyingMessageId
    }

    const allRecipients: string[] = []
    to?.forEach((addr) => allRecipients.push(addr.emailAddress))
    cc?.forEach((addr) => allRecipients.push(addr.emailAddress))
    bcc?.forEach((addr) => allRecipients.push(addr.emailAddress))

    if (!sendEncryptedEmailEnabled) {
      if (allRecipients.length > emailMessageRecipientsLimit) {
        throw new LimitExceededError(
          `Cannot send message to more than ${emailMessageRecipientsLimit} recipients`,
        )
      }
      // Process non-encrypted email message
      return await this.messageService.sendMessage({
        message,
        senderEmailAddressId,
        emailMessageMaxOutboundMessageSize,
      })
    }

    const domains = await this.domainService.getConfiguredEmailDomains({})

    // Check if any recipient's domain is not one of ours
    const allRecipientsInternal =
      allRecipients.length > 0 &&
      allRecipients.every((address) =>
        domains.some((domain) => address.includes(domain.domain)),
      )

    if (allRecipientsInternal) {
      // If we do not have an external recipient, lookup public key information for each recipient and sender
      const emailAddressesPublicInfo =
        await this.accountService.lookupPublicInfo({
          emailAddresses: [...allRecipients, from.emailAddress],
        })
      // Check whether recipient addresses and associated public keys exist in the platform
      const isInNetwork = allRecipients.every((r) =>
        emailAddressesPublicInfo.some((p) => p.emailAddress === r),
      )
      if (!isInNetwork) {
        throw new InNetworkAddressNotFoundError(
          'At least one email address does not exist in network',
        )
      } else {
        if (allRecipients.length > encryptedEmailMessageRecipientsLimit) {
          throw new LimitExceededError(
            `Cannot send encrypted message to more than ${encryptedEmailMessageRecipientsLimit} recipients`,
          )
        }
        // Process encrypted email message
        return await this.messageService.sendEncryptedMessage({
          message,
          senderEmailAddressId,
          emailAddressesPublicInfo,
          emailMessageMaxOutboundMessageSize,
        })
      }
    } else {
      // Otherwise, we must send unencrypted
      if (allRecipients.length > emailMessageRecipientsLimit) {
        throw new LimitExceededError(
          `Cannot send message to more than ${emailMessageRecipientsLimit} recipients`,
        )
      }
      // Process non-encrypted email message
      return await this.messageService.sendMessage({
        message,
        senderEmailAddressId,
        emailMessageMaxOutboundMessageSize,
      })
    }
  }
}
