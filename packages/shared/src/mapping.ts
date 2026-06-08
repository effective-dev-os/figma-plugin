// Per D-005: M1 ships repo-file read-only. sharedPluginData mirror deferred M2.
// Schema mirrors brief §5.1.

export interface MappingPropValue {
  readonly code: string;
  readonly value: string | number | boolean | null;
}

export interface MappingSlot {
  readonly code: string;
}

export interface MappingEntry {
  readonly figmaName: string;
  readonly codePath: string;
  readonly import: string;
  readonly propMap?: Readonly<Record<string, MappingPropValue>>;
  readonly slots?: Readonly<Record<string, MappingSlot>>;
}

export interface MappingFile {
  readonly figmaFileKey: string;
  readonly components: Readonly<Record<string, MappingEntry>>;
}

export interface UnmappedResponse {
  readonly status: 'unmapped';
  readonly figmaName: string;
  readonly nodeId: string;
}

export interface MappedResponse {
  readonly status: 'mapped';
  readonly nodeId: string;
  readonly entry: MappingEntry;
}

export type GetCodeMappingResponse = MappedResponse | UnmappedResponse;
