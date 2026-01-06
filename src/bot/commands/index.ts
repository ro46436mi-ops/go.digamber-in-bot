import * as setup from './setup';
import * as premium from './premium';
import * as manageRoles from './manageRoles';
import * as messageTemplates from './messageTemplates';
import * as sendMessages from './sendMessages';

export const commands = {
  setup,
  premium,
  manageRoles,
  messageTemplates,
  sendMessages
};

export const commandData = [
  setup.data,
  premium.data,
  manageRoles.data,
  messageTemplates.data,
  sendMessages.data
];
