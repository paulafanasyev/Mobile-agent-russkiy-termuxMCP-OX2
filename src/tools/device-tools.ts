import { z } from 'zod';
import type { ToolContractSpec } from './types';
import { register } from './registry';

const openAppArgs = z.object({
  packageName: z.string().regex(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i),
});
const listAppsArgs = z.object({});
const readFileArgs = z.object({ uri: z.string().startsWith('content://') });

export const DEVICE_TOOLS: ToolContractSpec<unknown, unknown>[] = [
  {
    id: 'device.apps.list', version: '1.0.0',
    description: 'Показывает установленные приложения с launcher-иконками',
    inputSchema: listAppsArgs, outputSchema: z.any(), requiredCapability: 'NO_PRIVILEGE',
    risk: 'low', requiresConfirmation: false, auditPolicy: 'on-error', timeoutMs: 3000,
    availability: async () => true,
  },
  {
    id: 'device.open_app', version: '1.0.0',
    description: 'Открывает приложение по packageName (только из разрешённого списка)',
    inputSchema: openAppArgs, outputSchema: z.any(), requiredCapability: 'NO_PRIVILEGE',
    risk: 'low', requiresConfirmation: false, auditPolicy: 'always', timeoutMs: 5000,
    availability: async () => true,
  },
  {
    id: 'device.files.read', version: '1.0.0',
    description: 'Читает текстовый файл через SAF content:// URI',
    inputSchema: readFileArgs, outputSchema: z.any(), requiredCapability: 'NO_PRIVILEGE',
    risk: 'medium', requiresConfirmation: false, auditPolicy: 'always', timeoutMs: 10000,
    availability: async () => true,
  },
];

export function registerDeviceTools(): void {
  DEVICE_TOOLS.forEach(register);
}
