/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailFolderService } from '../../entities/folder/emailFolderService'
import { EmailFolderEntity } from '../../entities/folder/emailFolderEntity'

interface CustomFolderUpdateUseCaseValues {
  customFolderName?: string
}
/**
 * Input for `UpdateCustomEmailFolderUseCase` use case.
 *
 * @interface UpdateCustomEmailFolderUseCaseInput
 * @property {string} emailFolderId The identifier of the email folder to update.
 * @property {string} emailAddressId The identifier of the email address associated with the folder.
 * @property {CustomFolderUpdateUseCaseValues} values The values to update.
 * @property {boolean} allowSymmetricKeyGeneration (optional) If false and no symmetric key is found, a KeyNotFoundError will be thrown. Defaults to true.
 */
interface UpdateCustomEmailFolderUseCaseInput {
  emailFolderId: string
  emailAddressId: string
  values: CustomFolderUpdateUseCaseValues
  allowSymmetricKeyGeneration?: boolean
}

/**
 * Application business log for updating a custom email folder.
 */
export class UpdateCustomEmailFolderUseCase {
  private readonly log: Logger
  constructor(private readonly emailFolderService: EmailFolderService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    emailAddressId,
    emailFolderId,
    values,
    allowSymmetricKeyGeneration = true,
  }: UpdateCustomEmailFolderUseCaseInput): Promise<EmailFolderEntity> {
    this.log.debug(this.execute.name, {
      emailAddressId,
      emailFolderId,
      values,
      allowSymmetricKeyGeneration,
    })

    return await this.emailFolderService.updateCustomEmailFolderForEmailAddressId(
      {
        emailAddressId,
        emailFolderId,
        values,
        allowSymmetricKeyGeneration,
      },
    )
  }
}
