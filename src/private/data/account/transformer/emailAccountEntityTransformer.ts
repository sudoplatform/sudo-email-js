import { EmailAddress } from '../../../../gen/graphqlTypes'
import { EmailAccountEntity } from '../../../domain/entities/account/emailAccountEntity'
import { EmailFolderEntityTransformer } from '../../folder/transformer/emailFolderEntityTransformer'
import { EmailAddressEntityTransformer } from './emailAddressEntityTransformer'

export class EmailAccountEntityTransformer {
  transformGraphQL(data: EmailAddress): EmailAccountEntity {
    const emailAddressTransformer = new EmailAddressEntityTransformer()
    const emailFolderTransformer = new EmailFolderEntityTransformer()
    return {
      id: data.id,
      owner: data.owner,
      owners: data.owners.map(({ id, issuer }) => ({ id, issuer })),
      identityId: data.identityId,
      keyRingId: data.keyRingId,
      emailAddress: emailAddressTransformer.transform(data.emailAddress),
      size: data.size,
      version: data.version,
      createdAt: new Date(data.createdAtEpochMs),
      updatedAt: new Date(data.updatedAtEpochMs),
      lastReceivedAt:
        data.lastReceivedAtEpochMs === undefined ||
        data.lastReceivedAtEpochMs === null
          ? undefined
          : new Date(data.lastReceivedAtEpochMs),
      status: { type: 'Completed' },
      folders: data.folders.map((folder) =>
        emailFolderTransformer.transformGraphQL(folder),
      ),
    }
  }
}
