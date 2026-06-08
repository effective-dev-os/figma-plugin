import type { ReactionSpec, ReactionDelta, Action, Trigger, DeltaProperty } from '@figma-agent/shared';

const SKIPPED_CONTROLLER_DEVICES = new Set(['XBOX_ONE', 'PS4', 'SWITCH_PRO']);

function normalizeTrigger(trigger: unknown): Trigger | null {
  if (!trigger || typeof trigger !== 'object') return null;
  const t = trigger as Record<string, unknown>;
  const type = t['type'] as string | undefined;
  if (!type) return null;

  if (type === 'ON_KEY_DOWN') {
    const device = (t['device'] as string) ?? 'KEYBOARD';
    if (SKIPPED_CONTROLLER_DEVICES.has(device)) return null;
    return {
      type: 'ON_KEY_DOWN',
      device: device as 'KEYBOARD' | 'XBOX_ONE' | 'PS4' | 'SWITCH_PRO' | 'UNKNOWN_CONTROLLER',
      keyCodes: (t['keyCodes'] as number[]) ?? [],
    };
  }

  if (type === 'AFTER_TIMEOUT') {
    return { type: 'AFTER_TIMEOUT', timeout: (t['timeout'] as number) ?? 0 };
  }

  if (type === 'MOUSE_UP' || type === 'MOUSE_DOWN') {
    return { type, delay: (t['delay'] as number) ?? 0 };
  }

  if (type === 'MOUSE_ENTER' || type === 'MOUSE_LEAVE') {
    return {
      type,
      delay: (t['delay'] as number) ?? 0,
      deprecatedVersion: Boolean(t['deprecatedVersion']),
    };
  }

  if (type === 'ON_MEDIA_HIT') {
    return { type: 'ON_MEDIA_HIT', mediaHitTime: (t['mediaHitTime'] as number) ?? 0 };
  }

  if (
    type === 'ON_CLICK' ||
    type === 'ON_HOVER' ||
    type === 'ON_PRESS' ||
    type === 'ON_DRAG' ||
    type === 'ON_MEDIA_END'
  ) {
    return { type } as Trigger;
  }

  return null;
}

function normalizeActions(raw: unknown): Action[] {
  if (!raw) return [];
  // Modern API has `actions` array; legacy has singular `action`.
  const arr: unknown[] = Array.isArray(raw) ? raw : [raw];
  return arr
    .filter((a): a is Record<string, unknown> => !!a && typeof a === 'object')
    .map((a): Action | null => {
      const type = a['type'] as string | undefined;
      if (!type) return null;
      if (type === 'BACK') return { type: 'BACK' };
      if (type === 'CLOSE') return { type: 'CLOSE' };
      if (type === 'URL') {
        return {
          type: 'URL',
          url: String(a['url'] ?? ''),
          openInNewTab: Boolean(a['openInNewTab']),
        };
      }
      if (type === 'UPDATE_MEDIA_RUNTIME') {
        const dest = a['destinationId'];
        return {
          type: 'UPDATE_MEDIA_RUNTIME',
          mediaAction: String(a['mediaAction'] ?? ''),
          ...(typeof dest === 'string' && { destinationId: dest }),
        };
      }
      if (type === 'SET_VARIABLE') {
        return {
          type: 'SET_VARIABLE',
          variableId: String(a['variableId'] ?? ''),
          variableValue: a['variableValue'],
        };
      }
      if (type === 'SET_VARIABLE_MODE') {
        return {
          type: 'SET_VARIABLE_MODE',
          variableCollectionId: String(a['variableCollectionId'] ?? ''),
          variableModeId: String(a['variableModeId'] ?? ''),
        };
      }
      if (type === 'CONDITIONAL') {
        return {
          type: 'CONDITIONAL',
          conditionalActions: (a['conditionalActions'] as unknown[]) ?? [],
        };
      }
      if (type === 'NODE') {
        return {
          type: 'NODE',
          destinationId: (a['destinationId'] as string | null) ?? null,
          navigation: (a['navigation'] as Action & { type: 'NODE' })['navigation'] ?? 'NAVIGATE',
          transition: (a['transition'] as Action & { type: 'NODE' })['transition'] ?? null,
          preserveScrollPosition: Boolean(a['preserveScrollPosition']),
          overlayRelativePosition: (a['overlayRelativePosition'] as { x: number; y: number } | null) ?? null,
          resetVideoPosition: Boolean(a['resetVideoPosition']),
          resetScrollPosition: Boolean(a['resetScrollPosition']),
          resetInteractiveComponents: Boolean(a['resetInteractiveComponents']),
        };
      }
      return null;
    })
    .filter((a): a is Action => a !== null);
}

type NumericDeltaProp = Extract<DeltaProperty, 'x' | 'y' | 'width' | 'height' | 'opacity' | 'rotation' | 'cornerRadius'>;
type ScaleProp = Extract<DeltaProperty, 'scaleX' | 'scaleY'>;
type ArrayProp = Extract<DeltaProperty, 'fills' | 'strokes' | 'effects'>;

function getNumber(node: BaseNode, prop: string): number | undefined {
  const val = (node as unknown as Record<string, unknown>)[prop];
  return typeof val === 'number' ? val : undefined;
}

function getArray(node: BaseNode, prop: string): unknown {
  return (node as unknown as Record<string, unknown>)[prop];
}

export function computeDeltas(nodeId: string, src: BaseNode, dst: BaseNode): ReactionDelta[] {
  const deltas: ReactionDelta[] = [];

  const numericProps: NumericDeltaProp[] = ['x', 'y', 'width', 'height', 'opacity', 'rotation', 'cornerRadius'];
  for (const prop of numericProps) {
    const from = getNumber(src, prop);
    const to = getNumber(dst, prop);
    if (from !== undefined && to !== undefined && from !== to) {
      deltas.push({ nodeId, property: prop, from, to });
    }
  }

  // scaleX/scaleY derived from width/height ratio relative to src dimensions
  // Emit only if sizes differ AND original dimensions are non-zero
  const srcWidth = getNumber(src, 'width');
  const srcHeight = getNumber(src, 'height');
  const dstWidth = getNumber(dst, 'width');
  const dstHeight = getNumber(dst, 'height');

  if (srcWidth !== undefined && dstWidth !== undefined && srcWidth > 0 && srcWidth !== dstWidth) {
    const scaleProps: ScaleProp[] = ['scaleX'];
    for (const prop of scaleProps) {
      deltas.push({ nodeId, property: prop, from: 1, to: dstWidth / srcWidth });
    }
  }
  if (srcHeight !== undefined && dstHeight !== undefined && srcHeight > 0 && srcHeight !== dstHeight) {
    const scaleProps: ScaleProp[] = ['scaleY'];
    for (const prop of scaleProps) {
      deltas.push({ nodeId, property: prop, from: 1, to: dstHeight / srcHeight });
    }
  }

  const arrayProps: ArrayProp[] = ['fills', 'strokes', 'effects'];
  for (const prop of arrayProps) {
    const from = getArray(src, prop);
    const to = getArray(dst, prop);
    if (from !== undefined && to !== undefined) {
      const fromStr = JSON.stringify(from);
      const toStr = JSON.stringify(to);
      if (fromStr !== toStr) {
        deltas.push({ nodeId, property: prop, from, to });
      }
    }
  }

  return deltas;
}

async function collectReactions(
  node: BaseNode,
  results: ReactionSpec[]
): Promise<void> {
  if ('reactions' in node) {
    const rawNode = node as BaseNode & { reactions: unknown[] };
    const rawReactions: unknown[] = rawNode.reactions ?? [];

    for (const rawReaction of rawReactions) {
      if (!rawReaction || typeof rawReaction !== 'object') continue;
      const r = rawReaction as Record<string, unknown>;

      const trigger = normalizeTrigger(r['trigger']);
      if (trigger === null && r['trigger'] !== null && r['trigger'] !== undefined) {
        // trigger was set but filtered (controller device) — skip this reaction
        continue;
      }

      // Normalize legacy singular action → actions array
      const rawActions = r['actions'] ?? (r['action'] ? [r['action']] : []);
      const actions = normalizeActions(rawActions);

      const deltas: ReactionDelta[] = [];
      for (const action of actions) {
        if (action.type === 'NODE' && action.destinationId) {
          const dstNode = await figma.getNodeByIdAsync(action.destinationId);
          if (dstNode) {
            const nodeDeltas = computeDeltas(node.id, node, dstNode);
            deltas.push(...nodeDeltas);
          }
        }
      }

      results.push({
        nodeId: node.id,
        nodeName: node.name,
        trigger,
        actions,
        deltas,
      });
    }
  }

  if ('children' in node) {
    const parent = node as BaseNode & { children: readonly BaseNode[] };
    for (const child of parent.children) {
      await collectReactions(child, results);
    }
  }
}

export async function getReactions(nodeId: string): Promise<ReactionSpec[]> {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }

  const results: ReactionSpec[] = [];
  await collectReactions(node, results);
  return results;
}
