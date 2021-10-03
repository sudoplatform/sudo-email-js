import { EmailMessageAPITransformer } from '../../../../../../src/private/data/message/transformer/emailMessageAPITransformer'
import { APIDataFactory } from '../../../../data-factory/api'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('EmailMessageAPITransformer Test Suite', () => {
  const instanceUnderTest = new EmailMessageAPITransformer()

  describe('transformEntity', () => {
    it('transforms successfully', () => {
      expect(
        instanceUnderTest.transformEntity(EntityDataFactory.emailMessage),
      ).toEqual(APIDataFactory.emailMessage)
    })
  })
})
