import { DecisionEvaluationResponse, ErrorResponse } from "../namespaces/TrustAuthorityDecision";
export declare function getDecisionEvaluation<DecisionEvaluationResponse, CreateDecisionRequest>(vid: string, vkey: string, decisionRequest: CreateDecisionRequest): Promise<DecisionEvaluationResponse | ErrorResponse>;
export declare function generatePullRequestComment(result: DecisionEvaluationResponse | ErrorResponse): string;
