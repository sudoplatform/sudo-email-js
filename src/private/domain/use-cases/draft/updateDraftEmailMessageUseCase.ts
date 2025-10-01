/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CachePolicy, DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import {
  AddressNotFoundError,
  MessageNotFoundError,
} from '../../../../public/errors'
import { EmailAccountService } from '../../entities/account/emailAccountService'
import { EmailMessageService } from '../../entities/message/emailMessageService'
import { EmailConfigurationDataService } from '../../entities/configuration/configurationDataService'
import { EmailDomainService } from '../../entities/emailDomain/emailDomainService'
import { EmailMessageUtil } from '../../../util/emailMessageUtil'
import { EmailCryptoService } from '../../entities/secure/emailCryptoService'

/**
 * Input for `UpdateDraftEmailMessageUseCase` use case.
 *
 * @interface UpdateDraftEmailMessageInput
 * @property {string} id The identifier of the draft email message to update.
 * @property {ArrayBuffer} rfc822Data RFC 822 formatted data of the draft email message. This will completely replace the existing data.
 * @property {string} senderEmailAddressId Identifier of the sender email address that is composing the draft email message.
 */
interface UpdateDraftEmailMessageUseCaseInput {
  id: string
  rfc822Data: ArrayBuffer
  senderEmailAddressId: string
}

interface UpdateDraftEmailMessageUseCaseOutput {
  id: string
  emailAddressId: string
  updatedAt: Date
}

/**
 * Application business logic for updating a draft email message.
 */
export class UpdateDraftEmailMessageUseCase {
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
    id,
    rfc822Data,
    senderEmailAddressId,
  }: UpdateDraftEmailMessageUseCaseInput): Promise<UpdateDraftEmailMessageUseCaseOutput> {
    this.log.debug(this.constructor.name, {
      id,
      rfc822Data,
      senderEmailAddressId,
    })
    const account = await this.emailAccountService.get({
      id: senderEmailAddressId,
      cachePolicy: CachePolicy.RemoteOnly,
    })
    if (!account) {
      throw new AddressNotFoundError()
    }
    const draft = await this.emailMessageService.getDraft({
      id,
      emailAddressId: senderEmailAddressId,
    })
    if (!draft) {
      throw new MessageNotFoundError()
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
      id,
    })

    return metadata
  }
}
