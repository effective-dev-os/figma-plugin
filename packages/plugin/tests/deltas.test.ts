import { describe, it, expect } from 'vitest';
import { computeDeltas } from '../src/controller/reactions.js';

function makeNode(overrides: Record<string, unknown>): BaseNode {
  return {
    id: overrides['id'] as string ?? 'test-node',
    name: overrides['name'] as string ?? 'Test Node',
    type: 'FRAME',
    removed: false,
    toString: () => '[Node: FRAME]',
    remove: () => { /* no-op */ },
    setPluginData: () => { /* no-op */ },
    getPluginData: () => '',
    setSharedPluginData: () => { /* no-op */ },
    getSharedPluginData: () => '',
    setPluginDataList: () => { /* no-op */ },
    getPluginDataList: () => [],
    setSharedPluginDataList: () => { /* no-op */ },
    getSharedPluginDataList: () => [],
    ...overrides,
  } as unknown as BaseNode;
}

describe('computeDeltas', () => {
  it('emits numeric property deltas', () => {
    const src = makeNode({ id: 'src', x: 0, y: 0, width: 100, height: 50, opacity: 1.0, rotation: 0, cornerRadius: 0 });
    const dst = makeNode({ id: 'dst', x: 20, y: 10, width: 100, height: 50, opacity: 0.5, rotation: 45, cornerRadius: 8 });
    const deltas = computeDeltas('src', src, dst);

    const props = deltas.map((d) => d.property);
    expect(props).toContain('x');
    expect(props).toContain('y');
    expect(props).toContain('opacity');
    expect(props).toContain('rotation');
    expect(props).toContain('cornerRadius');
    expect(props).not.toContain('width');
    expect(props).not.toContain('height');
  });

  it('emits scaleX/scaleY when dimensions differ', () => {
    const src = makeNode({ id: 'src', width: 100, height: 50 });
    const dst = makeNode({ id: 'dst', width: 200, height: 100 });
    const deltas = computeDeltas('src', src, dst);

    const scaleX = deltas.find((d) => d.property === 'scaleX');
    const scaleY = deltas.find((d) => d.property === 'scaleY');
    expect(scaleX).toBeDefined();
    expect(scaleX?.from).toBe(1);
    expect(scaleX?.to).toBeCloseTo(2);
    expect(scaleY).toBeDefined();
    expect(scaleY?.to).toBeCloseTo(2);
  });

  it('emits fills delta when fills change', () => {
    const fillA = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 1 }];
    const fillB = [{ type: 'SOLID', color: { r: 0, g: 0, b: 1 }, opacity: 1 }];
    const src = makeNode({ id: 'src', fills: fillA });
    const dst = makeNode({ id: 'dst', fills: fillB });
    const deltas = computeDeltas('src', src, dst);

    const fillsDelta = deltas.find((d) => d.property === 'fills');
    expect(fillsDelta).toBeDefined();
    expect(fillsDelta?.from).toEqual(fillA);
    expect(fillsDelta?.to).toEqual(fillB);
  });

  it('does NOT emit fills delta when fills are identical', () => {
    const fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 1 }];
    const src = makeNode({ id: 'src', fills });
    const dst = makeNode({ id: 'dst', fills });
    const deltas = computeDeltas('src', src, dst);
    expect(deltas.find((d) => d.property === 'fills')).toBeUndefined();
  });

  it('emits no deltas when nodes are identical', () => {
    const node = makeNode({ id: 'n', x: 0, y: 0, width: 100, height: 100, opacity: 1, rotation: 0, cornerRadius: 0, fills: [], strokes: [], effects: [] });
    const deltas = computeDeltas('n', node, node);
    expect(deltas).toHaveLength(0);
  });

  it('stores nodeId in each delta', () => {
    const src = makeNode({ id: 'src', x: 0 });
    const dst = makeNode({ id: 'dst', x: 50 });
    const deltas = computeDeltas('src', src, dst);
    expect(deltas.every((d) => d.nodeId === 'src')).toBe(true);
  });
});
