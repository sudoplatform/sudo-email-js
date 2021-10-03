import { EmailAddress } from '../../../../gen/graphqlTypes'
import { EmailAccountEntity } from '../../../domain/entities/account/emailAccountEntity'
import { EmailAddressEntityTransformer } from './emailAddressEntityTransformer'

export class EmailAccountEntityTransformer {
  transformGraphQL(data: EmailAddress): EmailAccountEntity {
    const emailAddressTransformer = new EmailAddressEntityTransformer()
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
      lastReceivedAt: new Date(data.lastReceivedAtEpochMs),
      status: { type: 'Completed' },
    }
  }
}
