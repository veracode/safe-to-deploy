export interface CreateDecisionRequest {
    type: string;
    target: string;
    scope: Array<DecisionScopeDTO>;
}
interface DecisionScopeDTO {
    businessApplicationVersion: string;
    businessApplicationId: string;
    assetSnapshotIds: Array<string>;
}
export interface DecisionEvaluationResponse {
    id: string;
    result: string;
    decisionTimestamp: string;
}
export interface ErrorResponse {
    timestamp: string;
    status: number;
    error: string;
    message: string;
}
export {};
