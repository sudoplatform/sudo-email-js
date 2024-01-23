/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import { EmailFolderService } from '../../entities/folder/emailFolderService'
import { EmailFolderEntity } from '../../entities/folder/emailFolderEntity'

/**
 * Input for `CreateCustomEmailFolderUseCase` use case.
 *
 * @interface CreateCustomEmailFolderUseCaseInput
 * @property {string} emailAddressId The identifier of the email address associated with the custom email folder.
 * @property {string} customFolderName The name of the custom email folder to be created.
 */
interface CreateCustomEmailFolderUseCaseInput {
  emailAddressId: string
  customFolderName: string
}

/**
 * Application business logic for creating a custom email folder.
 */
export class CreateCustomEmailFolderUseCase {
  private readonly log: Logger
  constructor(private readonly emailFolderService: EmailFolderService) {
    this.log = new DefaultLogger(this.constructor.name)
  }

  async execute({
    emailAddressId,
    customFolderName,
  }: CreateCustomEmailFolderUseCaseInput): Promise<EmailFolderEntity> {
    this.log.debug(this.constructor.name, {
      emailAddressId,
      customFolderName,
    })
    return await this.emailFolderService.createCustomEmailFolderForEmailAddressId(
      {
        emailAddressId,
        customFolderName,
      },
    )
  }
}
