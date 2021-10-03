import {
  EmailMessageDirectionFilterInput,
  EmailMessageFilterInput,
  EmailMessageStateFilterInput,
} from '../../../../gen/graphqlTypes'
import {
  DirectionFilter,
  EmailMessageFilter,
  StateFilter,
} from '../../../../public/typings/filter'
import { EmailMessageDirectionTransformer } from './emailMessageDirectionTransformer'
import { EmailMessageStateTransformer } from './emailMessageStateTransformer'

export class EmailMessageFilterTransformer {
  transformAPI(filter?: EmailMessageFilter): EmailMessageFilterInput {
    return {
      folderId: filter?.folderId,
      direction: this.transformDirectionFilter(filter?.direction),
      seen: filter?.seen,
      clientRefId: filter?.clientRefId,
      state: this.transformStateFilter(filter?.state),
      and: filter?.and
        ? filter.and.map((and) => this.transformAPI(and))
        : undefined,
      or: filter?.or ? filter.or.map((or) => this.transformAPI(or)) : undefined,
      not: filter?.not ? this.transformAPI(filter.not) : undefined,
    }
  }

  private transformDirectionFilter(
    filter?: DirectionFilter,
  ): EmailMessageDirectionFilterInput {
    const directionTransformer = new EmailMessageDirectionTransformer()
    return {
      eq: filter?.eq
        ? directionTransformer.fromAPItoGraphQL(filter.eq)
        : undefined,
      ne: filter?.ne
        ? directionTransformer.fromAPItoGraphQL(filter.ne)
        : undefined,
    }
  }

  private transformStateFilter(
    filter?: StateFilter,
  ): EmailMessageStateFilterInput {
    const stateTransformer = new EmailMessageStateTransformer()
    return {
      eq: filter?.eq ? stateTransformer.fromAPItoGraphQL(filter.eq) : undefined,
      ne: filter?.ne ? stateTransformer.fromAPItoGraphQL(filter.ne) : undefined,
    }
  }
}
