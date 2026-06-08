export type FigmaNodeType =
  | 'DOCUMENT'
  | 'PAGE'
  | 'FRAME'
  | 'GROUP'
  | 'COMPONENT'
  | 'COMPONENT_SET'
  | 'INSTANCE'
  | 'RECTANGLE'
  | 'ELLIPSE'
  | 'POLYGON'
  | 'STAR'
  | 'VECTOR'
  | 'TEXT'
  | 'LINE'
  | 'BOOLEAN_OPERATION'
  | 'SECTION'
  | 'STICKY'
  | 'SHAPE_WITH_TEXT'
  | 'CONNECTOR'
  | 'STAMP'
  | 'WIDGET'
  | 'EMBED'
  | 'LINK_UNFURL'
  | 'MEDIA'
  | 'CODE_BLOCK'
  | 'TABLE'
  | 'TABLE_CELL';

export type LayoutMode = 'NONE' | 'HORIZONTAL' | 'VERTICAL';

export interface BoundingBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface NodeMeta {
  readonly id: string;
  readonly name: string;
  readonly type: FigmaNodeType;
  readonly visible: boolean;
  readonly locked: boolean;
  readonly bbox?: BoundingBox;
  readonly layoutMode?: LayoutMode;
  readonly children?: ReadonlyArray<NodeMeta>;
  readonly boundVariables?: Readonly<Record<string, string>>;
  readonly hasAutoLayout?: boolean;
  readonly annotations?: ReadonlyArray<NodeAnnotation>;
  readonly componentKey?: string;
}

export interface NodeAnnotation {
  readonly label: string;
  readonly labelMarkdown?: string;
  readonly categoryId?: string;
  readonly properties?: ReadonlyArray<{ readonly type: string }>;
}
