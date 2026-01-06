import { randomBytes } from 'crypto';

export function generateId(length: number = 12): string {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

export function validateDiscordSnowflake(id: string): boolean {
  const snowflakeRegex = /^\d{17,19}$/;
  return snowflakeRegex.test(id);
}

export function parseDiscordPermissions(permissions: string): string[] {
  const perms = BigInt(permissions);
  const permissionList: string[] = [];
  
  // Check common permissions
  if ((perms & 0x8n) === 0x8n) permissionList.push('ADMINISTRATOR');
  if ((perms & 0x20n) === 0x20n) permissionList.push('MANAGE_GUILD');
  if ((perms & 0x10n) === 0x10n) permissionList.push('MANAGE_CHANNELS');
  if ((perms & 0x1000n) === 0x1000n) permissionList.push('VIEW_CHANNEL');
  if ((perms & 0x800n) === 0x800n) permissionList.push('SEND_MESSAGES');
  
  return permissionList;
}

export function formatWelcomeMessage(message: string, user: string, server: string): string {
  return message
    .replace(/{user}/g, `<@${user}>`)
    .replace(/{server}/g, server);
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
