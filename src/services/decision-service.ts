import { CreateDecisionRequest, DecisionEvaluationResponse, ErrorResponse } from "../namespaces/TrustAuthorityDecision";
import * as http from '../api/http-request';
import { postDecisionEvaluation } from "../api/http-request";

export async function getDecisionEvaluation(vid: string, vkey: string, decisionRequest: CreateDecisionRequest): Promise <DecisionEvaluationResponse | ErrorResponse> {

    return await postDecisionEvaluation(vid, vkey, decisionRequest);

    
   


  throw new Error("getDecisionEvaluation is not implemented");
}