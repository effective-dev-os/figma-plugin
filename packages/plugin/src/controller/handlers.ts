import type { PluginRequestMethod } from '@figma-agent/shared';
import { traverseNodeAsync } from './traverse.js';
import { getReactions } from './reactions.js';

type HandlerFn = (params: Record<string, unknown>) => Promise<unknown>;

async function getDocumentInfo(_params: Record<string, unknown>): Promise<unknown> {
  await figma.currentPage.loadAsync();
  const doc = figma.root;
  return {
    id: doc.id,
    name: doc.name,
    type: doc.type,
    pages: doc.children.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
    })),
    currentPage: {
      id: figma.currentPage.id,
      name: figma.currentPage.name,
      childCount: figma.currentPage.children.length,
    },
  };
}

async function getSelection(_params: Record<string, unknown>): Promise<unknown> {
  const selection = figma.currentPage.selection;
  return {
    count: selection.length,
    nodes: selection.map((n) => ({
      id: n.id,
      name: n.name,
      type: n.type,
      x: 'x' in n ? n.x : undefined,
      y: 'y' in n ? n.y : undefined,
      width: 'width' in n ? n.width : undefined,
      height: 'height' in n ? n.height : undefined,
    })),
  };
}

async function getNodeInfo(params: Record<string, unknown>): Promise<unknown> {
  const nodeId = params['nodeId'];
  if (typeof nodeId !== 'string') throw new Error('Missing nodeId');
  return traverseNodeAsync(nodeId, { maxDepth: 3, includeBoundVariables: true });
}

async function getNodesInfo(params: Record<string, unknown>): Promise<unknown> {
  const nodeIds = params['nodeIds'];
  if (!Array.isArray(nodeIds)) throw new Error('Missing or invalid nodeIds');
  const results = await Promise.all(
    (nodeIds as unknown[]).map((id) => {
      if (typeof id !== 'string') throw new Error('nodeIds must be strings');
      return traverseNodeAsync(id, { maxDepth: 2 });
    })
  );
  return { nodes: results };
}

async function readMyDesign(_params: Record<string, unknown>): Promise<unknown> {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) {
    // Fall back to full page shallow scan
    await figma.currentPage.loadAsync();
    return traverseNodeAsync(figma.currentPage.id, { maxDepth: 4 });
  }
  const results = await Promise.all(
    selection.map((n) => traverseNodeAsync(n.id, { maxDepth: 5, includeBoundVariables: true }))
  );
  return { nodes: results };
}

async function getLocalComponents(_params: Record<string, unknown>): Promise<unknown> {
  const components = figma.root.findAllWithCriteria({ types: ['COMPONENT'] });
  return {
    components: components.map((c) => ({
      id: c.id,
      name: c.name,
      key: c.key,
      description: c.description,
      pageId: c.parent?.id,
      pageName: 'name' in (c.parent ?? {}) ? (c.parent as { name: string }).name : undefined,
    })),
  };
}

async function getAnnotations(params: Record<string, unknown>): Promise<unknown> {
  const nodeId = params['nodeId'] as string | undefined;

  let categories: Array<{ id: string; label: string }> = [];
  try {
    const raw = await figma.annotations.getAnnotationCategoriesAsync();
    categories = raw.map((cat) => ({
      id: cat.id,
      label: cat.label,
    }));
  } catch {
    // annotations API may not be available on all plan types
  }

  if (nodeId) {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (!node) throw new Error(`Node not found: ${nodeId}`);

    const collected: Array<{ nodeId: string; nodeName: string; annotations: unknown[] }> = [];
    const collect = async (n: BaseNode): Promise<void> => {
      if ('annotations' in n) {
        const annotatable = n as BaseNode & { annotations: unknown[] };
        if (annotatable.annotations.length > 0) {
          collected.push({ nodeId: n.id, nodeName: n.name, annotations: annotatable.annotations });
        }
      }
      if ('children' in n) {
        const parent = n as BaseNode & { children: readonly BaseNode[] };
        for (const child of parent.children) {
          await collect(child);
        }
      }
    };
    await collect(node);
    return { nodeId, annotatedNodes: collected, categories };
  }

  await figma.currentPage.loadAsync();
  const annotated: Array<{ nodeId: string; nodeName: string; annotations: unknown[] }> = [];
  const scan = async (n: BaseNode): Promise<void> => {
    if ('annotations' in n) {
      const annotatable = n as BaseNode & { annotations: unknown[] };
      if (annotatable.annotations.length > 0) {
        annotated.push({ nodeId: n.id, nodeName: n.name, annotations: annotatable.annotations });
      }
    }
    if ('children' in n) {
      const parent = n as BaseNode & { children: readonly BaseNode[] };
      for (const child of parent.children) {
        await scan(child);
      }
    }
  };
  await scan(figma.currentPage);
  return { annotatedNodes: annotated, categories };
}

async function getStyles(_params: Record<string, unknown>): Promise<unknown> {
  const [paintStyles, textStyles, effectStyles, gridStyles] = await Promise.all([
    figma.getLocalPaintStylesAsync(),
    figma.getLocalTextStylesAsync(),
    figma.getLocalEffectStylesAsync(),
    figma.getLocalGridStylesAsync(),
  ]);

  const serialize = (s: BaseStyle) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    description: s.description,
  });

  return {
    paint: paintStyles.map(serialize),
    text: textStyles.map(serialize),
    effect: effectStyles.map(serialize),
    grid: gridStyles.map(serialize),
  };
}

async function getInstanceOverrides(params: Record<string, unknown>): Promise<unknown> {
  const instanceNodeId = params['instanceNodeId'] as string | undefined;

  if (!instanceNodeId) {
    const selection = figma.currentPage.selection;
    const instances = selection.filter((n): n is InstanceNode => n.type === 'INSTANCE');
    const first = instances[0];
    if (!first) throw new Error('No instance selected');
    return gatherOverrides(first);
  }

  const node = await figma.getNodeByIdAsync(instanceNodeId);
  if (!node) throw new Error(`Node not found: ${instanceNodeId}`);
  if (node.type !== 'INSTANCE') throw new Error(`Node is not an instance: ${instanceNodeId}`);
  return gatherOverrides(node as InstanceNode);
}

function gatherOverrides(instance: InstanceNode): unknown {
  return {
    nodeId: instance.id,
    name: instance.name,
    componentId: instance.mainComponent?.id,
    componentName: instance.mainComponent?.name,
    overrides: instance.overrides.map((o) => ({
      id: o.id,
      overriddenFields: o.overriddenFields,
    })),
  };
}

async function scanTextNodes(params: Record<string, unknown>): Promise<unknown> {
  const nodeId = params['nodeId'] as string | undefined;

  const root: BaseNode = nodeId
    ? (await figma.getNodeByIdAsync(nodeId)) ?? figma.currentPage
    : figma.currentPage;

  if (root === figma.currentPage) {
    await figma.currentPage.loadAsync();
  }

  const textNodes = (root as BaseNode & { findAll?: (cb: (n: BaseNode) => boolean) => SceneNode[] })
    .findAll?.((n) => n.type === 'TEXT') ?? [];

  return {
    nodes: textNodes.map((n) => {
      const t = n as TextNode;
      return {
        id: t.id,
        name: t.name,
        characters: t.characters,
        fontSize: t.fontSize,
        fontName: t.fontName,
      };
    }),
  };
}

async function scanNodesByTypes(params: Record<string, unknown>): Promise<unknown> {
  const types = params['types'];
  if (!Array.isArray(types) || types.length === 0) throw new Error('Missing or invalid types');

  const nodeId = params['nodeId'] as string | undefined;
  const root: BaseNode = nodeId
    ? (await figma.getNodeByIdAsync(nodeId)) ?? figma.currentPage
    : figma.currentPage;

  if (root === figma.currentPage) {
    await figma.currentPage.loadAsync();
  }

  const typeSet = new Set(types as string[]);
  const found = (root as BaseNode & { findAll?: (cb: (n: BaseNode) => boolean) => SceneNode[] })
    .findAll?.((n) => typeSet.has(n.type)) ?? [];

  return {
    nodes: found.map((n) => ({
      id: n.id,
      name: n.name,
      type: n.type,
    })),
  };
}

async function getReactionsHandler(params: Record<string, unknown>): Promise<unknown> {
  const nodeId = params['nodeId'];
  if (typeof nodeId !== 'string') throw new Error('Missing nodeId');
  return getReactions(nodeId);
}

async function getCodeMapping(params: Record<string, unknown>): Promise<unknown> {
  // Code mapping lives in MCP server (.figma/mapping.json). Plugin side only
  // provides node info so MCP server can resolve figmaName → code component.
  const nodeId = params['nodeId'];
  if (typeof nodeId !== 'string') throw new Error('Missing nodeId');
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node) throw new Error(`Node not found: ${nodeId}`);
  return { nodeId: node.id, figmaName: node.name, type: node.type };
}

export const HANDLERS: Record<PluginRequestMethod, HandlerFn> = {
  get_document_info: getDocumentInfo,
  get_selection: getSelection,
  get_node_info: getNodeInfo,
  get_nodes_info: getNodesInfo,
  read_my_design: readMyDesign,
  get_local_components: getLocalComponents,
  get_annotations: getAnnotations,
  get_styles: getStyles,
  get_instance_overrides: getInstanceOverrides,
  scan_text_nodes: scanTextNodes,
  scan_nodes_by_types: scanNodesByTypes,
  get_reactions: getReactionsHandler,
  get_code_mapping: getCodeMapping,
};
