/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { Direction, State } from '../../../../public/typings/emailMessage'
import { EmailMessageService } from '../../entities/message/emailMessageService'
import { EncryptionStatus } from '../../../../public'

/**
 * Input for `GetEmailMessageUseCase` use case.
 *
 * @interface GetEmailMessageInput
 * @property {string} id The identifier of the email message to attempt to retrieve.
 * @property {string} keyId The identifier of the key used to seal the email message.
 */
interface GetEmailMessageUseCaseInput {
  id: string
}
interface GetEmailMessageUseCaseOutput {
  id: string
  owner: string
  owners: Array<{ id: string; issuer: string }>
  emailAddressId: string
  keyId: string
  algorithm: string
  folderId: string
  previousFolderId?: string
  seen: boolean
  repliedTo: boolean
  forwarded: boolean
  direction: Direction
  state: State
  clientRefId?: string
  from: Array<{ emailAddress: string; displayName?: string }>
  to: Array<{ emailAddress: string; displayName?: string }>
  cc: Array<{ emailAddress: string; displayName?: string }>
  bcc: Array<{ emailAddress: string; displayName?: string }>
  replyTo: Array<{ emailAddress: string; displayName?: string }>
  subject?: string
  hasAttachments: boolean
  version: number
  sortDate: Date
  createdAt: Date
  updatedAt: Date
  status: { type: 'Completed' } | { type: 'Failed'; cause: Error }
  size: number
  encryptionStatus: EncryptionStatus
  date?: Date
}

/**
 * Application business logic for retrieving an email message.
 */
export class GetEmailMessageUseCase {
  private readonly log: Logger
  constructor(private readonly emailMessageService: EmailMessageService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    id,
  }: GetEmailMessageUseCaseInput): Promise<
    GetEmailMessageUseCaseOutput | undefined
  > {
    this.log.debug(this.constructor.name, {
      id,
    })
    return await this.emailMessageService.getMessage({
      id,
    })
  }
}
