/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailFolderService } from '../../entities/folder/emailFolderService'
import { EmailFolderEntity } from '../../entities/folder/emailFolderEntity'

/**
 * Input for `DeleteCustomEmailFolderUseCase` use case.
 *
 * @interface DeleteCustomEmailFolderUseCaseInput
 * @property {string} emailFolderId The identifier of the email folder to delete.
 * @property {string} emailAddressId The identifier of the email address associated with the folder.
 */
interface DeleteCustomEmailFolderUseCaseInput {
  emailFolderId: string
  emailAddressId: string
}

/**
 * Application business logic for deleting a custom email folder.
 */
export class DeleteCustomEmailFolderUseCase {
  private readonly log: Logger
  constructor(private readonly emailFolderService: EmailFolderService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    emailFolderId,
    emailAddressId,
  }: DeleteCustomEmailFolderUseCaseInput): Promise<
    EmailFolderEntity | undefined
  > {
    this.log.debug(this.execute.name, {
      emailFolderId,
      emailAddressId,
    })
    return await this.emailFolderService.deleteCustomEmailFolderForEmailAddressId(
      {
        emailFolderId,
        emailAddressId,
      },
    )
  }
}
