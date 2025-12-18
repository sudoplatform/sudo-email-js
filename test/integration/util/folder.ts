/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailFolder, SudoEmailClient } from '../../../src'

export const getFolderByName = async ({
  emailClient,
  emailAddressId,
  folderName,
}: {
  emailClient: SudoEmailClient
  emailAddressId: string
  folderName: string
}): Promise<EmailFolder | undefined> => {
  return await emailClient
    .listEmailFoldersForEmailAddressId({
      emailAddressId,
    })
    .then((r) => r.items.find((f) => f.folderName === folderName))
}
