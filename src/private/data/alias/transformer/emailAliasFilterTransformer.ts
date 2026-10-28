/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailAliasFilterInput as EmailAliasFilterEntity } from '../../../domain/entities/alias/emailAliasService'
import { EmailMaskFilterInput as EmailMaskFilterGraphQL } from '../../../../gen/graphqlTypes'
import { EmailAliasRealAddressTypeTransformer } from './emailAliasRealAddressTypeTransformer'
import { EmailAliasStatusTransformer } from './emailAliasStatusTransformer'
import { EmailAliasFilterInput } from '../../../../public/inputs/emailAlias'

export class EmailAliasFilterTransformer {
  static toGraphQL(
    inputFilter: EmailAliasFilterEntity,
  ): EmailMaskFilterGraphQL | undefined {
    const graphQLFilter: EmailMaskFilterGraphQL = {}
    if (inputFilter.realAddressType) {
      const gqlRealAddressTypeFilter = inputFilter.realAddressType
      if (gqlRealAddressTypeFilter.equal) {
        graphQLFilter.realAddressType = {
          eq: EmailAliasRealAddressTypeTransformer.entityToGraphQL(
            gqlRealAddressTypeFilter.equal,
          ),
        }
      }
      if (gqlRealAddressTypeFilter.notEqual) {
        graphQLFilter.realAddressType = {
          ne: EmailAliasRealAddressTypeTransformer.entityToGraphQL(
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
            EmailAliasRealAddressTypeTransformer.entityToGraphQL(s),
          ),
        }
      }
      if (
        gqlRealAddressTypeFilter.oneOf &&
        gqlRealAddressTypeFilter.oneOf.length
      ) {
        graphQLFilter.realAddressType = {
          in: gqlRealAddressTypeFilter.oneOf.map((s) =>
            EmailAliasRealAddressTypeTransformer.entityToGraphQL(s),
          ),
        }
      }
    }

    if (inputFilter.status) {
      const gqlStatusFilter = inputFilter.status
      if (gqlStatusFilter.equal) {
        graphQLFilter.status = {
          eq: EmailAliasStatusTransformer.entityToGraphQL(
            gqlStatusFilter.equal,
          ),
        }
      }
      if (gqlStatusFilter.notEqual) {
        graphQLFilter.status = {
          ne: EmailAliasStatusTransformer.entityToGraphQL(
            gqlStatusFilter.notEqual,
          ),
        }
      }
      if (gqlStatusFilter.notOneOf && gqlStatusFilter.notOneOf.length) {
        graphQLFilter.status = {
          notIn: gqlStatusFilter.notOneOf.map((s) =>
            EmailAliasStatusTransformer.entityToGraphQL(s),
          ),
        }
      }
      if (gqlStatusFilter.oneOf && gqlStatusFilter.oneOf.length) {
        graphQLFilter.status = {
          in: gqlStatusFilter.oneOf.map((s) =>
            EmailAliasStatusTransformer.entityToGraphQL(s),
          ),
        }
      }
    }
    return graphQLFilter
  }

  static apiToEntity(input: EmailAliasFilterInput): EmailAliasFilterEntity {
    const entity: EmailAliasFilterEntity = {}

    if (input.realAddressType) {
      const apiRealAddressTypeFilter = input.realAddressType
      if (apiRealAddressTypeFilter.equal) {
        entity.realAddressType = {
          equal: EmailAliasRealAddressTypeTransformer.apiToEntity(
            apiRealAddressTypeFilter.equal,
          ),
        }
      }

      if (apiRealAddressTypeFilter.notEqual) {
        entity.realAddressType = {
          notEqual: EmailAliasRealAddressTypeTransformer.apiToEntity(
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
            EmailAliasRealAddressTypeTransformer.apiToEntity(s),
          ),
        }
      }

      if (
        apiRealAddressTypeFilter.oneOf &&
        apiRealAddressTypeFilter.oneOf.length
      ) {
        entity.realAddressType = {
          oneOf: apiRealAddressTypeFilter.oneOf.map((s) =>
            EmailAliasRealAddressTypeTransformer.apiToEntity(s),
          ),
        }
      }
    }

    if (input.status) {
      const apiStatusFilter = input.status
      if (apiStatusFilter.equal) {
        entity.status = {
          equal: EmailAliasStatusTransformer.apiToEntity(apiStatusFilter.equal),
        }
      }

      if (apiStatusFilter.notEqual) {
        entity.status = {
          notEqual: EmailAliasStatusTransformer.apiToEntity(
            apiStatusFilter.notEqual,
          ),
        }
      }

      if (apiStatusFilter.notOneOf && apiStatusFilter.notOneOf.length) {
        entity.status = {
          notOneOf: apiStatusFilter.notOneOf.map((s) =>
            EmailAliasStatusTransformer.apiToEntity(s),
          ),
        }
      }

      if (apiStatusFilter.oneOf && apiStatusFilter.oneOf.length) {
        entity.status = {
          oneOf: apiStatusFilter.oneOf.map((s) =>
            EmailAliasStatusTransformer.apiToEntity(s),
          ),
        }
      }
    }

    return entity
  }
}
