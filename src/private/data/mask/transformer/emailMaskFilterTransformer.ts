/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailMaskFilterInput as EmailMaskFilterEntity } from '../../../domain/entities/mask/emailMaskService'
import { EmailMaskFilterInput as EmailMaskFilterGraphQL } from '../../../../gen/graphqlTypes'
import { EmailMaskRealAddressTypeTransformer } from './emailMaskRealAddressTypeTransformer'
import { EmailMaskStatusTransformer } from './emailMaskStatusTransformer'
import { EmailMaskFilterInput } from '../../../../public/inputs/emailMask'

export class EmailMaskFilterTransformer {
  static toGraphQL(
    inputFilter: EmailMaskFilterEntity,
  ): EmailMaskFilterGraphQL | undefined {
    const graphQLFilter: EmailMaskFilterGraphQL = {}
    if (inputFilter.realAddressType) {
      const gqlRealAddressTypeFilter = inputFilter.realAddressType
      if (gqlRealAddressTypeFilter.equal) {
        graphQLFilter.realAddressType = {
          eq: EmailMaskRealAddressTypeTransformer.entityToGraphQL(
            gqlRealAddressTypeFilter.equal,
          ),
        }
      }
      if (gqlRealAddressTypeFilter.notEqual) {
        graphQLFilter.realAddressType = {
          ne: EmailMaskRealAddressTypeTransformer.entityToGraphQL(
            gqlRealAddressTypeFilter.notEqual,
          ),
        }
      }
      if (
        gqlRealAddressTypeFilter.notOneOf &&
        gqlRealAddressTypeFilter.notOneOf.length
      ) {
        graphQLFilter.realAddressType = {
          notIn: gqlRealAddressTypeFilter.notOneOf.map((s) =>
            EmailMaskRealAddressTypeTransformer.entityToGraphQL(s),
          ),
        }
      }
      if (
        gqlRealAddressTypeFilter.oneOf &&
        gqlRealAddressTypeFilter.oneOf.length
      ) {
        graphQLFilter.realAddressType = {
          in: gqlRealAddressTypeFilter.oneOf.map((s) =>
            EmailMaskRealAddressTypeTransformer.entityToGraphQL(s),
          ),
        }
      }
    }

    if (inputFilter.status) {
      const gqlStatusFilter = inputFilter.status
      if (gqlStatusFilter.equal) {
        graphQLFilter.status = {
          eq: EmailMaskStatusTransformer.entityToGraphQL(gqlStatusFilter.equal),
        }
      }
      if (gqlStatusFilter.notEqual) {
        graphQLFilter.status = {
          ne: EmailMaskStatusTransformer.entityToGraphQL(
            gqlStatusFilter.notEqual,
          ),
        }
      }
      if (gqlStatusFilter.notOneOf && gqlStatusFilter.notOneOf.length) {
        graphQLFilter.status = {
          notIn: gqlStatusFilter.notOneOf.map((s) =>
            EmailMaskStatusTransformer.entityToGraphQL(s),
          ),
        }
      }
      if (gqlStatusFilter.oneOf && gqlStatusFilter.oneOf.length) {
        graphQLFilter.status = {
          in: gqlStatusFilter.oneOf.map((s) =>
            EmailMaskStatusTransformer.entityToGraphQL(s),
          ),
        }
      }
    }
    return graphQLFilter
  }

  static apiToEntity(input: EmailMaskFilterInput): EmailMaskFilterEntity {
    const entity: EmailMaskFilterEntity = {}

    if (input.realAddressType) {
      const apiRealAddressTypeFilter = input.realAddressType
      if (apiRealAddressTypeFilter.equal) {
        entity.realAddressType = {
          equal: EmailMaskRealAddressTypeTransformer.apiToEntity(
            apiRealAddressTypeFilter.equal,
          ),
        }
      }

      if (apiRealAddressTypeFilter.notEqual) {
        entity.realAddressType = {
          notEqual: EmailMaskRealAddressTypeTransformer.apiToEntity(
            apiRealAddressTypeFilter.notEqual,
          ),
        }
      }

      if (
        apiRealAddressTypeFilter.notOneOf &&
        apiRealAddressTypeFilter.notOneOf.length
      ) {
        entity.realAddressType = {
          notOneOf: apiRealAddressTypeFilter.notOneOf.map((s) =>
            EmailMaskRealAddressTypeTransformer.apiToEntity(s),
          ),
        }
      }

      if (
        apiRealAddressTypeFilter.oneOf &&
        apiRealAddressTypeFilter.oneOf.length
      ) {
        entity.realAddressType = {
          oneOf: apiRealAddressTypeFilter.oneOf.map((s) =>
            EmailMaskRealAddressTypeTransformer.apiToEntity(s),
          ),
        }
      }
    }

    if (input.status) {
      const apiStatusFilter = input.status
      if (apiStatusFilter.equal) {
        entity.status = {
          equal: EmailMaskStatusTransformer.apiToEntity(apiStatusFilter.equal),
        }
      }

      if (apiStatusFilter.notEqual) {
        entity.status = {
          notEqual: EmailMaskStatusTransformer.apiToEntity(
            apiStatusFilter.notEqual,
          ),
        }
      }

      if (apiStatusFilter.notOneOf && apiStatusFilter.notOneOf.length) {
        entity.status = {
          notOneOf: apiStatusFilter.notOneOf.map((s) =>
            EmailMaskStatusTransformer.apiToEntity(s),
          ),
        }
      }

      if (apiStatusFilter.oneOf && apiStatusFilter.oneOf.length) {
        entity.status = {
          oneOf: apiStatusFilter.oneOf.map((s) =>
            EmailMaskStatusTransformer.apiToEntity(s),
          ),
        }
      }
    }

    return entity
  }
}
