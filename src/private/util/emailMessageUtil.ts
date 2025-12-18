/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DecodeError } from '@sudoplatform/sudo-common'
import {
  EmailAttachment,
  EncryptionStatus,
  InNetworkAddressNotFoundError,
  InternalError,
  InvalidEmailContentsError,
  LimitExceededError,
  MessageSizeLimitExceededError,
} from '../../public'
import { EmailAccountService } from '../domain/entities/account/emailAccountService'
import { EmailAddressPublicInfoEntity } from '../domain/entities/account/emailAddressPublicInfoEntity'
import { EmailConfigurationDataEntity } from '../domain/entities/configuration/emailConfigurationDataEntity'
import { EmailDomainService } from '../domain/entities/emailDomain/emailDomainService'
import { EmailCryptoService } from '../domain/entities/secure/emailCryptoService'
import { arrayBufferToString } from './buffer'
import {
  EmailMessageDetails,
  Rfc822MessageDataProcessor,
} from './rfc822MessageDataProcessor'
import {
  LEGACY_BODY_CONTENT_ID,
  LEGACY_KEY_EXCHANGE_CONTENT_ID,
  SecureEmailAttachmentType,
} from '../domain/entities/secure/secureEmailAttachmentType'
import { SecurePackage } from '../domain/entities/secure/securePackage'
import { EmailDomainEntity } from '../domain/entities/emailDomain/emailDomainEntity'

export class EmailMessageUtil {
  private readonly accountService?: EmailAccountService
  private readonly emailCryptoService?: EmailCryptoService
  private readonly domainService?: EmailDomainService
  constructor({
    accountService,
    emailCryptoService,
    domainService,
  }: {
    accountService?: EmailAccountService
    emailCryptoService?: EmailCryptoService
    domainService?: EmailDomainService
  }) {
    this.accountService = accountService
    this.emailCryptoService = emailCryptoService
    this.domainService = domainService
  }

  async processMessageForS3Upload(
    rfc822Data: ArrayBuffer,
    config: EmailConfigurationDataEntity,
  ): Promise<ArrayBuffer> {
    if (!this.domainService) {
      throw new InternalError('EmailDomainService not provided')
    }
    let processedRfc822Data = rfc822Data
    const {
      sendEncryptedEmailEnabled,
      emailMessageMaxOutboundMessageSize,
      emailMessageRecipientsLimit,
      encryptedEmailMessageRecipientsLimit,
      prohibitedFileExtensions,
    } = config

    const messageDetails =
      await Rfc822MessageDataProcessor.parseInternetMessageData(
        arrayBufferToString(processedRfc822Data),
      )

    this.verifyAttachmentValidity(
      prohibitedFileExtensions,
      messageDetails.attachments ?? [],
      messageDetails.inlineAttachments ?? [],
    )
    const { to, cc, bcc } = messageDetails

    const allRecipients: string[] = []
    to?.forEach((addr) => allRecipients.push(addr.emailAddress))
    cc?.forEach((addr) => allRecipients.push(addr.emailAddress))
    bcc?.forEach((addr) => allRecipients.push(addr.emailAddress))

    const domains = await this.domainService.getConfiguredEmailDomains()

    // Check if any recipient's domain is not one of ours
    const allRecipientsInternal = EmailMessageUtil.allRecipientsInternal(
      allRecipients,
      domains,
    )

    if (allRecipientsInternal && sendEncryptedEmailEnabled) {
      if (allRecipients.length > encryptedEmailMessageRecipientsLimit) {
        throw new LimitExceededError(
          `Cannot send message to more than ${encryptedEmailMessageRecipientsLimit} recipients`,
        )
      }
      // If we do not have an external recipient, lookup public key information for each recipient and sender
      const emailAddressesPublicInfo = await this.retrieveAndVerifyPublicInfo(
        allRecipients,
        messageDetails.from[0].emailAddress,
      )

      processedRfc822Data = await this.encryptInNetworkMessage(
        messageDetails,
        emailAddressesPublicInfo,
      )
    } else if (allRecipients.length > emailMessageRecipientsLimit) {
      throw new LimitExceededError(
        `Cannot send message to more than ${emailMessageRecipientsLimit} recipients`,
      )
    }
    if (processedRfc822Data.byteLength > emailMessageMaxOutboundMessageSize) {
      throw new MessageSizeLimitExceededError(
        `Email message size exceeded. Limit: ${emailMessageMaxOutboundMessageSize} bytes`,
      )
    }
    return processedRfc822Data
  }

  public static allRecipientsInternal(
    allRecipients: string[],
    internalDomains: EmailDomainEntity[],
  ): boolean {
    return (
      allRecipients.length > 0 &&
      allRecipients.every((address) =>
        internalDomains.some((domain) =>
          address.toLowerCase().includes(domain.domain),
        ),
      )
    )
  }

  async processDownloadedEncryptedMessage(
    decodedString: string,
  ): Promise<ArrayBuffer> {
    if (!this.emailCryptoService) {
      throw new InternalError('EmailCryptoService not provided')
    }
    const decodedEncryptedMessage =
      await Rfc822MessageDataProcessor.parseInternetMessageData(decodedString)

    if (
      !decodedEncryptedMessage.attachments ||
      decodedEncryptedMessage.attachments.length === 0
    ) {
      throw new DecodeError('Error decoding encrypted mesage')
    }
    const keyAttachments = new Set(
      decodedEncryptedMessage.attachments?.filter(
        (att) =>
          att.contentId?.includes(
            SecureEmailAttachmentType.KEY_EXCHANGE.contentId,
          ) || att.contentId?.includes(LEGACY_KEY_EXCHANGE_CONTENT_ID),
      ),
    )
    if (keyAttachments.size === 0) {
      throw new DecodeError('Could not find key attachments')
    }
    const bodyAttachment = decodedEncryptedMessage.attachments.find(
      (att) =>
        att.contentId === SecureEmailAttachmentType.BODY.contentId ||
        att.contentId === LEGACY_BODY_CONTENT_ID,
    )
    if (!bodyAttachment) {
      throw new DecodeError('Could not find body attachment')
    }
    const securePackage = new SecurePackage(keyAttachments, bodyAttachment)
    const decodedUnencryptedMessage =
      await this.emailCryptoService.decrypt(securePackage)
    return decodedUnencryptedMessage
  }

  verifyAttachmentValidity(
    prohibitedFileExtensions: string[],
    attachments: EmailAttachment[],
    inlineAttachments: EmailAttachment[],
  ) {
    ;[...attachments, ...inlineAttachments].forEach((attachment) => {
      // Note this calculation will prohibit filenames with no extensions that match
      // a prohibited extension
      const extension = attachment.filename.split('.').pop()?.toLowerCase()
      if (extension && prohibitedFileExtensions.includes(`.${extension}`)) {
        throw new InvalidEmailContentsError(
          `Unsupported file extension ${extension}`,
        )
      }
    })
  }

  async retrieveAndVerifyPublicInfo(recipients: string[], sender: string) {
    if (!this.accountService) {
      throw new InternalError('EmailAccountService not provided')
    }
    const emailAddressesPublicInfo = await this.accountService.lookupPublicInfo(
      {
        emailAddresses: [...recipients, sender],
      },
    )
    // Check whether recipient addresses and associated public keys exist in the platform
    const isInNetwork = recipients.every((r) =>
      emailAddressesPublicInfo.some((p) => p.emailAddress === r),
    )
    if (!isInNetwork) {
      throw new InNetworkAddressNotFoundError(
        'At least one email address does not exist in network',
      )
    }
    return emailAddressesPublicInfo
  }

  async encryptInNetworkMessage(
    message: EmailMessageDetails,
    emailAddressesPublicInfo: EmailAddressPublicInfoEntity[],
  ): Promise<ArrayBuffer> {
    if (!this.emailCryptoService) {
      throw new InternalError('EmailCryptoService not provided')
    }
    const rfc822Data = Rfc822MessageDataProcessor.encodeToInternetMessageBuffer(
      message,
      { decodeEncodedFields: true },
    )

    const uniqueEmailAddressPublicInfo: EmailAddressPublicInfoEntity[] = []
    emailAddressesPublicInfo.forEach((info) => {
      if (!uniqueEmailAddressPublicInfo.some((v) => v.keyId === info.keyId)) {
        uniqueEmailAddressPublicInfo.push(info)
      }
    })

    const encryptedEmailMessage = await this.emailCryptoService.encrypt(
      rfc822Data,
      uniqueEmailAddressPublicInfo,
    )
    const secureAttachments = encryptedEmailMessage.toArray()

    const encryptedRfc822Data =
      Rfc822MessageDataProcessor.encodeToInternetMessageBuffer({
        ...message,
        attachments: secureAttachments,
        encryptionStatus: EncryptionStatus.ENCRYPTED,
      })
    return encryptedRfc822Data
  }
}
