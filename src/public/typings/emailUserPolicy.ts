export enum TimePeriod {
  DAY,
  HOUR,
  MINUTE,
  SECOND,
}

export interface EmailUserPolicy {
  maxSendPeriod: TimePeriod
  maxSendMessages: number
  maxRecipientPerMessage: number
}
