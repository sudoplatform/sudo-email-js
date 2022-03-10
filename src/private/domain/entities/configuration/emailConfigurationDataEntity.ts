/**
 * Core entity representation of configuration data.
 *
 * @interface ConfigurationData
 * @property {number} deleteEmailMessagesLimit The number of email messages that can be deleted at a time.
 * @property {number} updateEmailMessagesLimit The number of email messages that can be updated at a time.
 * @property {number} emailMessageMaxInboundMessageSize The maximum allowed size of an inbound email message.
 * @property {number} emailMessageMaxOutboundMessageSize TThe maximum allowed size of an outbound email message.
 */
export interface EmailConfigurationDataEntity {
  deleteEmailMessagesLimit: number
  updateEmailMessagesLimit: number
  emailMessageMaxInboundMessageSize: number
  emailMessageMaxOutboundMessageSize: number
}
