/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { AddressNotFoundError } from '../../../../public/errors'
import { EmailAccountService } from '../../entities/account/emailAccountService'
import { EmailMessageService } from '../../entities/message/emailMessageService'
import { EmailConfigurationDataService } from '../../entities/configuration/configurationDataService'
import { EmailDomainService } from '../../entities/emailDomain/emailDomainService'
import { EmailMessageUtil } from '../../../util/emailMessageUtil'
import { EmailCryptoService } from '../../entities/secure/emailCryptoService'

/**
 * Input for `SaveDraftEmailMessageUseCase` use case.
 *
 * @interface SaveDraftEmailMessageUseCaseInput
 * @property {ArrayBuffer} rfc822Data RFC 822 formatted data of the draft email message to save.
 * @property {string} senderEmailAddressId Identifier of the sender email address that is composing the draft email message.
 */
interface SaveDraftEmailMessageUseCaseInput {
  rfc822Data: ArrayBuffer
  senderEmailAddressId: string
}

interface SaveDraftEmailMessageUseCaseOutput {
  id: string
  emailAddressId: string
  updatedAt: Date
}
/**
 * Application business logic for saving a draft email message.
 */
export class SaveDraftEmailMessageUseCase {
  private readonly log: Logger

  constructor(
    private readonly emailAccountService: EmailAccountService,
    private readonly emailMessageService: EmailMessageService,
    private readonly domainService: EmailDomainService,
    private readonly configurationDataService: EmailConfigurationDataService,
    private readonly emailCryptoService: EmailCryptoService,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    rfc822Data,
    senderEmailAddressId,
  }: SaveDraftEmailMessageUseCaseInput): Promise<SaveDraftEmailMessageUseCaseOutput> {
    this.log.debug(this.constructor.name, { rfc822Data, senderEmailAddressId })
    const account = await this.emailAccountService.get({
      id: senderEmailAddressId,
    })
    if (!account) {
      throw new AddressNotFoundError()
    }
    const config = await this.configurationDataService.getConfigurationData()

    const emailMessageUtil = new EmailMessageUtil({
      accountService: this.emailAccountService,
      emailCryptoService: this.emailCryptoService,
      domainService: this.domainService,
    })

    const processedRfc822Data =
      await emailMessageUtil.processMessageForS3Upload(rfc822Data, config)

    const metadata = await this.emailMessageService.saveDraft({
      rfc822Data: processedRfc822Data,
      senderEmailAddressId,
    })
    return metadata
  }
}
