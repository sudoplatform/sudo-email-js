import { CachePolicy } from '@sudoplatform/sudo-common'
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
      cachePolicy: CachePolicy.RemoteOnly,
    })
    .then((r) => r.items.find((f) => f.folderName === folderName))
}
