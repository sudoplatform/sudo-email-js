import { State } from '../../../../../../src'
import { EmailMessageState } from '../../../../../../src/gen/graphqlTypes'
import { EmailMessageStateTransformer } from '../../../../../../src/private/data/message/transformer/emailMessageStateTransformer'

describe('EmailMessageStateTransformer Test Suite', () => {
  const instanceUnderTest = new EmailMessageStateTransformer()

  describe('fromAPItoGraphQL', () => {
    it.each`
      input                | expected
      ${State.Queued}      | ${EmailMessageState.Queued}
      ${State.Sent}        | ${EmailMessageState.Sent}
      ${State.Delivered}   | ${EmailMessageState.Delivered}
      ${State.Undelivered} | ${EmailMessageState.Undelivered}
      ${State.Failed}      | ${EmailMessageState.Failed}
      ${State.Received}    | ${EmailMessageState.Received}
    `(
      'converts API state ($input) to GraphQL state ($expected)',
      ({ input, expected }) => {
        expect(instanceUnderTest.fromAPItoGraphQL(input)).toStrictEqual(
          expected,
        )
      },
    )
  })

  describe('fromGraphQLtoAPI', () => {
    it.each`
      input                            | expected
      ${EmailMessageState.Queued}      | ${State.Queued}
      ${EmailMessageState.Sent}        | ${State.Sent}
      ${EmailMessageState.Delivered}   | ${State.Delivered}
      ${EmailMessageState.Undelivered} | ${State.Undelivered}
      ${EmailMessageState.Failed}      | ${State.Failed}
      ${EmailMessageState.Received}    | ${State.Received}
    `(
      'converts GraphQL state ($input) to API state ($expected)',
      ({ input, expected }) => {
        expect(instanceUnderTest.fromGraphQLtoAPI(input)).toStrictEqual(
          expected,
        )
      },
    )
  })
})
