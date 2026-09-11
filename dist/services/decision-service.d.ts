import { CreateDecisionRequest, DecisionEvaluationResponse, ErrorResponse } from "../namespaces/TrustAuthorityDecision";
export declare function getDecisionEvaluation(vid: string, vkey: string, decisionRequest: CreateDecisionRequest): Promise<DecisionEvaluationResponse | ErrorResponse>;
