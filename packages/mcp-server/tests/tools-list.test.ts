// Acceptance gate G4 / G5: assert exactly 13 read tools registered, names match
// M1_READ_TOOLS, zero write tool names present.
//
// SDK 1.29.0 keeps the tool registry as a private field whose shape is not part of
// the public API. We spy on `server.tool` to capture the names the registrar passes
// in, which is the source-of-truth contract we actually care about.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { M1_READ_TOOLS } from '@figma-agent/shared/wire';
import { registerAllTools } from '../src/tools/index.js';

const stubWs = {
  connect: vi.fn(),
  request: vi.fn(),
  close: vi.fn(),
} as unknown as import('../src/transport/ws-client.js').WsClient;

describe('M1 tool registry', () => {
  let server: McpServer;
  let toolSpy: ReturnType<typeof vi.spyOn>;
  let names: string[];

  beforeEach(() => {
    server = new McpServer({ name: 'test', version: '0.0.0' });
    names = [];
    toolSpy = vi.spyOn(server, 'tool').mockImplementation(((toolName: string, ..._rest: unknown[]) => {
      names.push(toolName);
      return server as unknown as ReturnType<McpServer['tool']>;
    }) as typeof server.tool);
    registerAllTools(server, stubWs);
  });

  it('registers exactly 13 tools', () => {
    expect(toolSpy).toHaveBeenCalledTimes(13);
    expect(names).toHaveLength(13);
  });

  it('registered names match M1_READ_TOOLS exactly', () => {
    const sorted = [...names].sort();
    const expected = [...M1_READ_TOOLS].sort();
    expect(sorted).toEqual(expected);
  });

  it('contains no write tool names', () => {
    const writeCandidates = new Set([
      'create_rectangle',
      'create_frame',
      'create_text',
      'set_fill_color',
      'set_stroke_color',
      'move_node',
      'clone_node',
      'resize_node',
      'delete_node',
      'delete_multiple_nodes',
      'export_node_as_image',
      'set_text_content',
      'set_annotation',
      'set_multiple_annotations',
      'set_multiple_text_contents',
      'create_component_instance',
      'set_instance_overrides',
      'set_corner_radius',
      'set_layout_mode',
      'set_padding',
      'set_axis_align',
    ]);
    for (const name of names) {
      expect(writeCandidates.has(name), `write tool "${name}" leaked into registry`).toBe(false);
    }
  });
});
