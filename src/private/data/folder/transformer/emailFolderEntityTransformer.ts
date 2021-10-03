import { EmailFolder } from '../../../../gen/graphqlTypes'
import { EmailFolderEntity } from '../../../domain/entities/folder/emailFolderEntity'

export class EmailFolderEntityTransformer {
  transformGraphQL(data: EmailFolder): EmailFolderEntity {
    return {
      id: data.id,
      owner: data.owner,
      owners: data.owners.map(({ id, issuer }) => ({
        id,
        issuer,
      })),
      emailAddressId: data.emailAddressId,
      folderName: data.folderName,
      size: data.size,
      unseenCount: data.unseenCount,
      ttl: data.ttl,
      version: data.version,
      createdAt: new Date(data.createdAtEpochMs),
      updatedAt: new Date(data.updatedAtEpochMs),
    }
  }
}
