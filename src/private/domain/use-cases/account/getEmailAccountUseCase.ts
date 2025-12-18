/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailAccountService } from '../../entities/account/emailAccountService'
import { FolderUseCaseOutput } from '../shared/folder'

/**
 * Input for `GetEmailAccountUseCase` use case.
 *
 * @interface GetEmailAccountInput
 * @property {string} id The identifier of the email account to attempt to retrieve.
 */
interface GetEmailAccountUseCaseInput {
  id: string
}

interface GetEmailAccountUseCaseOutput {
  id: string
  owner: string
  owners: Array<{ id: string; issuer: string }>
  identityId: string
  keyRingId: string
  emailAddress: { emailAddress: string }
  size: number
  numberOfEmailMessages: number
  version: number
  createdAt: Date
  updatedAt: Date
  lastReceivedAt: Date | undefined
  status: { type: 'Completed' } | { type: 'Failed'; cause: Error }
  folders: Array<FolderUseCaseOutput>
}

/**
 * Application business logic for retrieving an email account.
 */
export class GetEmailAccountUseCase {
  private readonly log: Logger

  constructor(private readonly emailAccountService: EmailAccountService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    id,
  }: GetEmailAccountUseCaseInput): Promise<
    GetEmailAccountUseCaseOutput | undefined
  > {
    this.log.debug(this.constructor.name, {
      id,
    })
    return await this.emailAccountService.get({
      id,
    })
  }
}
