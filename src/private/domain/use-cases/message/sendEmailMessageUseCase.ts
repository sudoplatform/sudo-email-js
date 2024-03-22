/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailMessageService } from '../../entities/message/emailMessageService'
import { Rfc822MessageParser } from '../../../util/rfc822MessageParser'
import { arrayBufferToString } from '../../../util/buffer'
import { EmailAccountService } from '../../entities/account/emailAccountService'

/**
 * Input for `SendEmailMessageUseCase` use case.
 *
 * @interface SendEmailMessageUseCaseInput
 * @property {ArrayBuffer} rfc822Data RFC 822 formatted email message data.
 * @property {string} senderEmailAddressId The identifier of the email address used to send the email.
 */
interface SendEmailMessageUseCaseInput {
  rfc822Data: ArrayBuffer
  senderEmailAddressId: string
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
    rfc822Data,
    senderEmailAddressId,
  }: SendEmailMessageUseCaseInput): Promise<string> {
    this.log.debug(this.constructor.name, { rfc822Data, senderEmailAddressId })
    const message = await Rfc822MessageParser.decodeRfc822Data(
      arrayBufferToString(rfc822Data),
    )
    const recipients: string[] = []
    message.to?.forEach((addr) => recipients.push(addr.emailAddress))
    message.cc?.forEach((addr) => recipients.push(addr.emailAddress))
    message.bcc?.forEach((addr) => recipients.push(addr.emailAddress))

    const recipientsPublicInfo = await this.accountService.lookupPublicInfo({
      emailAddresses: recipients,
    })

    const allRecipientsHavePubKey = recipients.every((v) =>
      recipientsPublicInfo.some((p) => p.emailAddress === v),
    )

    if (allRecipientsHavePubKey) {
      return await this.messageService.sendEncryptedMessage({
        message,
        senderEmailAddressId,
        recipientsPublicInfo,
      })
    } else {
      return await this.messageService.sendMessage({
        rfc822Data,
        senderEmailAddressId,
      })
    }
  }
}
