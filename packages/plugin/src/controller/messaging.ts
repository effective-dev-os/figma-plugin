import type { PluginRequestMethod } from '@figma-agent/shared';
import { HANDLERS } from './handlers.js';

interface ControllerRequest {
  type: 'controller_request';
  id: string;
  method: PluginRequestMethod;
  params: Record<string, unknown>;
}

interface ControllerResponse {
  type: 'controller_response';
  id: string;
  ok: boolean;
  result?: unknown;
  error?: { code: string; message: string };
}

function isValidMethod(method: unknown): method is PluginRequestMethod {
  return typeof method === 'string' && method in HANDLERS;
}

export function setupMessaging(): void {
  figma.ui.onmessage = async (rawMsg: unknown): Promise<void> => {
    const msg = rawMsg as Record<string, unknown>;

    if (msg['type'] !== 'controller_request') return;

    const req = msg as unknown as ControllerRequest;

    if (!isValidMethod(req.method)) {
      const response: ControllerResponse = {
        type: 'controller_response',
        id: req.id ?? 'unknown',
        ok: false,
        error: { code: 'UNKNOWN_METHOD', message: `Unknown method: ${String(req.method)}` },
      };
      figma.ui.postMessage(response);
      return;
    }

    try {
      const result = await HANDLERS[req.method](req.params ?? {});
      const response: ControllerResponse = {
        type: 'controller_response',
        id: req.id,
        ok: true,
        result,
      };
      figma.ui.postMessage(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const response: ControllerResponse = {
        type: 'controller_response',
        id: req.id,
        ok: false,
        error: { code: 'HANDLER_ERROR', message },
      };
      figma.ui.postMessage(response);
    }
  };
}
