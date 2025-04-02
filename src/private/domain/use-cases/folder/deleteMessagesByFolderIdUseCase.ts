/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailFolderService } from '../../entities/folder/emailFolderService'

/**
 * Input for `DeleteMessagesByFolderIdUseCase`
 *
 * @interface DeleteMessagesByFolderIdUseCaseInput
 * @property {string} emailFolderId The identifier of the folder to delete messages from
 * @property {string} emailAddressId The identifier of the email address associated with the folder.
 * @property {boolean} hardDelete If true (default), messages will be completely deleted. If false, messages will be moved to TRASH, unless the folder itself is TRASH.
 */
interface DeleteMessagesByFolderIdUseCaseInput {
  emailFolderId: string
  emailAddressId: string
  hardDelete?: boolean
}

/**
 * Application logic for deleting messages from a folder
 */
export class DeleteMessagesByFolderIdUseCase {
  private readonly log: Logger

  constructor(private readonly emailFolderService: EmailFolderService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    emailAddressId,
    emailFolderId,
    hardDelete,
  }: DeleteMessagesByFolderIdUseCaseInput): Promise<string> {
    this.log.debug(this.execute.name, {
      emailAddressId,
      emailFolderId,
      hardDelete,
    })

    return await this.emailFolderService.deleteMessagesByFolderId({
      emailAddressId,
      emailFolderId,
      hardDelete,
    })
  }
}
