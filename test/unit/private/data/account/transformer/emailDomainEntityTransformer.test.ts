import { EmailDomainEntityTransformer } from '../../../../../../src/private/data/account/transformer/emailDomainEntityTransformer'
import { EntityDataFactory } from '../../../../data-factory/entity'
import { GraphQLDataFactory } from '../../../../data-factory/graphQL'

describe('EmailDomainEntityTransformer Test Suite', () => {
  const instanceUnderTest = new EmailDomainEntityTransformer()

  describe('transformGraphQL', () => {
    it('transforms successfully', () => {
      expect(
        instanceUnderTest.transformGraphQL(
          GraphQLDataFactory.supportedEmailDomains.domains[0],
        ),
      ).toStrictEqual(EntityDataFactory.emailDomain)
    })
  })
})
