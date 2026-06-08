// Field names mirror Figma Plugin API verbatim per D-006 / OQ-011 / brief §5.2.
// Reaction has both `action` (deprecated singular) and `actions[]` (modern). We
// normalize to `actions` and treat `action` as legacy fallback at the plugin boundary.
// Transition.duration is in seconds (no `Sec` suffix).

export type TriggerType =
  | 'ON_CLICK'
  | 'ON_HOVER'
  | 'ON_PRESS'
  | 'ON_DRAG'
  | 'ON_MEDIA_END'
  | 'AFTER_TIMEOUT'
  | 'MOUSE_UP'
  | 'MOUSE_DOWN'
  | 'MOUSE_ENTER'
  | 'MOUSE_LEAVE'
  | 'ON_KEY_DOWN'
  | 'ON_MEDIA_HIT';

export type Trigger =
  | { readonly type: 'ON_CLICK' }
  | { readonly type: 'ON_HOVER' }
  | { readonly type: 'ON_PRESS' }
  | { readonly type: 'ON_DRAG' }
  | { readonly type: 'ON_MEDIA_END' }
  | { readonly type: 'AFTER_TIMEOUT'; readonly timeout: number }
  | { readonly type: 'MOUSE_UP'; readonly delay: number }
  | { readonly type: 'MOUSE_DOWN'; readonly delay: number }
  | {
      readonly type: 'MOUSE_ENTER';
      readonly delay: number;
      readonly deprecatedVersion: boolean;
    }
  | {
      readonly type: 'MOUSE_LEAVE';
      readonly delay: number;
      readonly deprecatedVersion: boolean;
    }
  | {
      readonly type: 'ON_KEY_DOWN';
      readonly device: 'KEYBOARD' | 'XBOX_ONE' | 'PS4' | 'SWITCH_PRO' | 'UNKNOWN_CONTROLLER';
      readonly keyCodes: ReadonlyArray<number>;
    }
  | { readonly type: 'ON_MEDIA_HIT'; readonly mediaHitTime: number };

export type EasingType =
  | 'EASE_IN'
  | 'EASE_OUT'
  | 'EASE_IN_AND_OUT'
  | 'LINEAR'
  | 'EASE_IN_BACK'
  | 'EASE_OUT_BACK'
  | 'EASE_IN_AND_OUT_BACK'
  | 'CUSTOM_CUBIC_BEZIER'
  | 'GENTLE'
  | 'QUICK'
  | 'BOUNCY'
  | 'SLOW'
  | 'CUSTOM_SPRING';

export type Easing =
  | { readonly type: Exclude<EasingType, 'CUSTOM_CUBIC_BEZIER' | 'CUSTOM_SPRING'> }
  | {
      readonly type: 'CUSTOM_CUBIC_BEZIER';
      readonly easingFunctionCubicBezier: readonly [number, number, number, number];
    }
  | {
      readonly type: 'CUSTOM_SPRING';
      readonly easingFunctionSpring: {
        readonly mass: number;
        readonly stiffness: number;
        readonly damping: number;
        readonly initialVelocity: number;
      };
    };

export type SimpleTransitionType = 'DISSOLVE' | 'SMART_ANIMATE' | 'SCROLL_ANIMATE';
export type DirectionalTransitionType =
  | 'MOVE_IN'
  | 'MOVE_OUT'
  | 'PUSH'
  | 'SLIDE_IN'
  | 'SLIDE_OUT';
export type Direction = 'LEFT' | 'RIGHT' | 'TOP' | 'BOTTOM';

export interface SimpleTransition {
  readonly type: SimpleTransitionType;
  readonly easing: Easing;
  readonly duration: number;
}

export interface DirectionalTransition {
  readonly type: DirectionalTransitionType;
  readonly direction: Direction;
  readonly matchLayers: boolean;
  readonly easing: Easing;
  readonly duration: number;
}

export type Transition = SimpleTransition | DirectionalTransition;

export type Action =
  | { readonly type: 'BACK' }
  | { readonly type: 'CLOSE' }
  | { readonly type: 'URL'; readonly url: string; readonly openInNewTab: boolean }
  | { readonly type: 'UPDATE_MEDIA_RUNTIME'; readonly mediaAction: string; readonly destinationId?: string }
  | { readonly type: 'SET_VARIABLE'; readonly variableId: string; readonly variableValue: unknown }
  | { readonly type: 'SET_VARIABLE_MODE'; readonly variableCollectionId: string; readonly variableModeId: string }
  | { readonly type: 'CONDITIONAL'; readonly conditionalActions: ReadonlyArray<unknown> }
  | {
      readonly type: 'NODE';
      readonly destinationId: string | null;
      readonly navigation: 'NAVIGATE' | 'CHANGE_TO' | 'BACK' | 'OVERLAY' | 'SWAP' | 'SCROLL_TO';
      readonly transition: Transition | null;
      readonly preserveScrollPosition: boolean;
      readonly overlayRelativePosition: { readonly x: number; readonly y: number } | null;
      readonly resetVideoPosition: boolean;
      readonly resetScrollPosition: boolean;
      readonly resetInteractiveComponents: boolean;
    };

// Smart Animate delta. Plugin computes by diffing source vs destination subtree per D-006.
// v1 property set: position, size, scale, opacity, fills, strokes, effects (shadows),
// cornerRadius, rotation. Extensible.
export type DeltaProperty =
  | 'x'
  | 'y'
  | 'width'
  | 'height'
  | 'scaleX'
  | 'scaleY'
  | 'opacity'
  | 'rotation'
  | 'cornerRadius'
  | 'fills'
  | 'strokes'
  | 'effects';

export interface ReactionDelta {
  readonly nodeId: string;
  readonly property: DeltaProperty;
  readonly from: unknown;
  readonly to: unknown;
}

export interface ReactionSpec {
  readonly nodeId: string;
  readonly nodeName: string;
  readonly trigger: Trigger | null;
  readonly actions: ReadonlyArray<Action>;
  readonly deltas: ReadonlyArray<ReactionDelta>;
}
