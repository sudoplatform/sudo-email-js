import { SealedEmailMessage } from '../../../../gen/graphqlTypes'
import { SealedEmailMessageEntity } from '../../../domain/entities/message/sealedEmailMessageEntity'
import { EmailMessageDirectionTransformer } from './emailMessageDirectionTransformer'
import { EmailMessageStateTransformer } from './emailMessageStateTransformer'

export class SealedEmailMessageEntityTransformer {
  transformGraphQL(data: SealedEmailMessage): SealedEmailMessageEntity {
    const directionTransformer = new EmailMessageDirectionTransformer()
    const stateTransformer = new EmailMessageStateTransformer()
    return {
      id: data.id,
      owner: data.owner,
      owners: data.owners.map(({ id, issuer }) => ({ id, issuer })),
      emailAddressId: data.emailAddressId,
      keyId: data.rfc822Header.keyId,
      algorithm: data.rfc822Header.algorithm,
      folderId: data.folderId,
      direction: directionTransformer.fromGraphQLtoAPI(data.direction),
      seen: data.seen,
      state: stateTransformer.fromGraphQLtoAPI(data.state),
      clientRefId: data.clientRefId,
      rfc822Header: data.rfc822Header.base64EncodedSealedData,
      version: data.version,
      sortDate: new Date(data.sortDateEpochMs),
      createdAt: new Date(data.createdAtEpochMs),
      updatedAt: new Date(data.updatedAtEpochMs),
    }
  }
}
