import type { NodeMeta, FigmaNodeType, BoundingBox } from '@figma-agent/shared';

export interface TraverseOpts {
  maxDepth?: number;
  includeBoundVariables?: boolean;
}

function hasBbox(node: BaseNode): node is BaseNode & {
  x: number; y: number; width: number; height: number;
} {
  return 'x' in node && 'y' in node && 'width' in node && 'height' in node;
}

function hasChildren(node: BaseNode): node is BaseNode & { children: readonly SceneNode[] } {
  return 'children' in node;
}

function hasAnnotations(node: BaseNode): node is BaseNode & {
  annotations: readonly Annotation[];
} {
  return 'annotations' in node;
}

function hasComponentKey(node: BaseNode): node is BaseNode & { key: string } {
  return 'key' in node && typeof (node as unknown as Record<string, unknown>)['key'] === 'string';
}

function hasLayoutMode(node: BaseNode): node is BaseNode & {
  layoutMode: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
} {
  return 'layoutMode' in node;
}

function nodeToMeta(node: BaseNode, depth: number, opts: TraverseOpts): NodeMeta {
  const bbox: BoundingBox | undefined = hasBbox(node)
    ? { x: node.x, y: node.y, width: node.width, height: node.height }
    : undefined;

  const annotations = hasAnnotations(node) && node.annotations.length > 0
    ? node.annotations.map((a) => {
        const ar = a as unknown as Record<string, unknown>;
        const lm = ar['labelMarkdown'];
        const cat = ar['categoryId'];
        return {
          label: a.label ?? '',
          ...(typeof lm === 'string' && { labelMarkdown: lm }),
          ...(typeof cat === 'string' && { categoryId: cat }),
        };
      })
    : undefined;

  const boundVariables: Record<string, string> | undefined =
    opts.includeBoundVariables && 'boundVariables' in node
      ? serializeBoundVariables((node as unknown as Record<string, unknown>)['boundVariables'] as Record<string, unknown> | undefined)
      : undefined;

  const children: NodeMeta[] | undefined =
    hasChildren(node) && (opts.maxDepth === undefined || depth < opts.maxDepth)
      ? node.children.map((child) => nodeToMeta(child, depth + 1, opts))
      : undefined;

  const layoutMode = hasLayoutMode(node) ? node.layoutMode : undefined;
  const componentKey = hasComponentKey(node) ? node.key : undefined;

  const meta: NodeMeta = {
    id: node.id,
    name: node.name,
    type: node.type as FigmaNodeType,
    visible: 'visible' in node ? Boolean((node as unknown as Record<string, unknown>)['visible']) : true,
    locked: 'locked' in node ? Boolean((node as unknown as Record<string, unknown>)['locked']) : false,
    ...(bbox !== undefined && { bbox }),
    ...(layoutMode !== undefined && { layoutMode }),
    ...(children !== undefined && { children }),
    ...(boundVariables !== undefined && { boundVariables }),
    ...(annotations !== undefined && { annotations }),
    ...(componentKey !== undefined && { componentKey }),
    ...(hasChildren(node) && { hasAutoLayout: layoutMode !== undefined && layoutMode !== 'NONE' }),
  };

  return meta;
}

function serializeBoundVariables(
  bv: Record<string, unknown> | undefined
): Record<string, string> | undefined {
  if (!bv) return undefined;
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(bv)) {
    if (val && typeof val === 'object' && 'id' in val) {
      out[key] = String((val as Record<string, unknown>)['id']);
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

let pagesLoaded = false;

export async function traverseNodeAsync(rootId: string, opts: TraverseOpts = {}): Promise<NodeMeta> {
  if (!pagesLoaded) {
    await figma.loadAllPagesAsync();
    pagesLoaded = true;
  }

  const node = await figma.getNodeByIdAsync(rootId);
  if (!node) {
    throw new Error(`Node not found: ${rootId}`);
  }

  if ('loadAsync' in node && typeof (node as unknown as Record<string, unknown>)['loadAsync'] === 'function') {
    await (node as PageNode).loadAsync();
  }

  return nodeToMeta(node, 0, opts);
}
