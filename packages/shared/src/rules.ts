// Reviewer rule result shape. M4 ships rules.json + DSL (D-003 proposed). M1 stubs only.

export type RuleSeverity = 'block' | 'warn' | 'avoid';

export interface RuleResult {
  readonly ruleId: string;
  readonly severity: RuleSeverity;
  readonly category: string;
  readonly nodeId: string;
  readonly nodeName: string;
  readonly message: string;
  readonly fix?: string;
}
