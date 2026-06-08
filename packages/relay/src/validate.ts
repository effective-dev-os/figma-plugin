// Shape validation and M1 write-method block list (D-008).

// Channel name shape — accepts the reserved "default" name plus simple ASCII
// channel labels (multi-instance use case). On a localhost-bind relay (D-004)
// the channel is routing, not auth, so the hex requirement was relaxed.
const CHANNEL_NAME = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export function isValidChannelId(s: string): boolean {
  return CHANNEL_NAME.test(s);
}

// All write methods from upstream grab tool list per security audit.
// M1: ALL writes disabled (D-008). M2 may selectively unblock specific entries.
export const BLOCKED_METHODS = new Set<string>([
  // node mutations
  'set_node_property',
  'move_node',
  'resize_node',
  'delete_node',
  'clone_node',
  // creation
  'create_rectangle',
  'create_frame',
  'create_text',
  'create_ellipse',
  'create_polygon',
  'create_star',
  'create_vector',
  'create_line',
  'create_component_instance',
  'create_component_set',
  'create_component_from_node',
  'set_svg',
  // fills / styles / annotations
  'set_fill_color',
  'set_stroke_color',
  'set_text_content',
  'set_annotation',
  // page / document
  'set_current_page',
  // export
  'export_node_as_image',
  // FigJam write
  'create_section',
]);

export function isBlockedMethod(method: string): boolean {
  return BLOCKED_METHODS.has(method);
}
