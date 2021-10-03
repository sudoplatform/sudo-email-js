import { BooleanFilter, StringFilter } from '@sudoplatform/sudo-common'
import { Direction, State } from './emailMessage'

export interface DirectionFilter {
  eq?: Direction
  ne?: Direction
}

export interface StateFilter {
  ne?: State
  eq?: State
  in?: State[]
  notIn?: State[]
}

export interface NumericFilter {
  eq?: number
  gt?: number
  lt?: number
}

export interface DateFilter {
  eq?: Date
  gt?: Date
  lt?: Date
}

export interface EmailAddressFilter {
  id?: StringFilter
  identityId?: StringFilter
  keyRingId?: StringFilter
  emailAddress?: StringFilter
  size?: NumericFilter
  unseenCount?: NumericFilter
  and?: EmailAddressFilter[]
  or?: EmailAddressFilter[]
  not?: EmailAddressFilter
}

export interface EmailFolderFilter {
  size?: NumericFilter
  and?: EmailFolderFilter[]
  or?: EmailFolderFilter[]
  not?: EmailFolderFilter
}

export interface EmailMessageFilter {
  folderId?: StringFilter
  direction?: DirectionFilter
  seen?: BooleanFilter
  clientRefId?: StringFilter
  state?: StateFilter
  createdAt?: DateFilter
  updatedAt?: DateFilter
  sentAt?: DateFilter
  receivedAt?: DateFilter
  and?: EmailMessageFilter[]
  or?: EmailMessageFilter[]
  not?: EmailMessageFilter
}
