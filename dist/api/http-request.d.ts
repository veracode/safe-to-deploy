import { CreateDecisionRequest, DecisionEvaluationResponse, ErrorResponse } from '../namespaces/TrustAuthorityDecision';
export declare function postDecisionEvaluation(vid: string, vkey: string, decisionRequest: CreateDecisionRequest): Promise<DecisionEvaluationResponse | ErrorResponse>;
