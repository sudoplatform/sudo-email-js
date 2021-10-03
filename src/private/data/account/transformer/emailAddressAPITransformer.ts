import { EmailAddress } from '../../../../public/typings/emailAddress'
import { EmailAccountEntity } from '../../../domain/entities/account/emailAccountEntity'

export class EmailAddressAPITransformer {
  transformEntity(entity: EmailAccountEntity): EmailAddress {
    const transformed: EmailAddress = {
      id: entity.id,
      owner: entity.owner,
      owners: entity.owners.map(({ id, issuer }) => ({ id, issuer })),
      identityId: entity.identityId,
      emailAddress: entity.emailAddress.emailAddress,
      size: entity.size,
      version: entity.version,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      lastReceivedAt: entity.lastReceivedAt,
    }
    if (entity.emailAddress.alias) {
      transformed.alias = entity.emailAddress.alias
    }
    return transformed
  }
}
