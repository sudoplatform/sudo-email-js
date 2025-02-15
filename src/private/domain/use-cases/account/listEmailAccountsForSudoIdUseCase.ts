/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { CachePolicy, DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailAccountService } from '../../entities/account/emailAccountService'
import { FolderUseCaseOutput } from '../shared/folder'

/**
 * Input for `ListEmailAccountsForSudoIdUseCase` use case.
 *
 * @interface ListEmailAccountsForSudoIdUseCaseInput
 * @property {string} sudoId The identifier of the sudo owner associated with the email accounts.
 * @property {CachePolicy} cachePolicy Cache policy determines the strategy for accessing the email account records.
 * @property {number} limit Number of records to return. If omitted, the limit defaults to 10.
 * @property {string} nextToken A token generated by a previous call. This allows for pagination.
 */
interface ListEmailAccountsForSudoIdUseCaseInput {
  sudoId: string
  cachePolicy?: CachePolicy
  limit?: number | undefined
  nextToken?: string | undefined
}

/**
 * Output for `ListEmailAccountsBySudoIdUseCase` use case.
 *
 * @interface ListEmailAccountsForSudoIdUseCaseOutput
 * @property {Array} emailAccounts The list of email accounts retrieved in this use case.
 * @property {string} nextToken A token generated by a previous call. This allows for pagination.
 */
interface ListEmailAccountsForSudoIdUseCaseOutput {
  emailAccounts: Array<{
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
    folders: Array<FolderUseCaseOutput>
    status: { type: 'Completed' } | { type: 'Failed'; cause: Error }
  }>
  nextToken?: string
}

/**
 * Application business logic for listing email accounts for a sudo id.
 */
export class ListEmailAccountsForSudoIdUseCase {
  private readonly log: Logger
  constructor(private readonly emailAccountService: EmailAccountService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    sudoId,
    cachePolicy,
    limit,
    nextToken,
  }: ListEmailAccountsForSudoIdUseCaseInput): Promise<ListEmailAccountsForSudoIdUseCaseOutput> {
    this.log.debug(this.constructor.name, {
      sudoId,
      cachePolicy,
      limit,
      nextToken,
    })
    return await this.emailAccountService.listForSudoId({
      sudoId,
      cachePolicy,
      limit,
      nextToken,
    })
  }
}
