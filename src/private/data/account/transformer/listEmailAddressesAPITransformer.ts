import { ListOperationResultStatus } from '@sudoplatform/sudo-common'
import { ListEmailAddressesResult } from '../../../../public/typings/listOperationResult'
import { EmailAccountEntity } from '../../../domain/entities/account/emailAccountEntity'

export class ListEmailAddressesAPITransformer {
  transform(
    entities: EmailAccountEntity[],
    nextToken?: string,
  ): ListEmailAddressesResult {
    const items = entities
      .filter((entity) => entity.status.type === 'Completed')
      .map((entity) => ({
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
        ...(entity.emailAddress.alias && { alias: entity.emailAddress.alias }),
      }))
    const failed = entities
      .filter((entity) => entity.status.type === 'Failed')
      .map((entity) => ({
        item: {
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
        },
        cause:
          entity.status.type === 'Failed' ? entity.status.cause : new Error(),
      }))
    if (failed.length > 0) {
      return {
        status: ListOperationResultStatus.Partial,
        items,
        failed,
        nextToken,
      }
    } else {
      return { status: ListOperationResultStatus.Success, items, nextToken }
    }
  }
}
