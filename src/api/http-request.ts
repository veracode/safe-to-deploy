import * as core from '@actions/core';
import { calculateAuthorizationHeader } from './veracode-hmac';
import appConfig from '../app-config';
import { CreateDecisionRequest, DecisionEvaluationResponse, ErrorResponse } from '../namespaces/TrustAuthorityDecision';



export async function postDecisionEvaluation(vid: string, vkey: string, decisionRequest: CreateDecisionRequest): Promise<DecisionEvaluationResponse | ErrorResponse> {
  const resourceUri = appConfig.api.veracode.trustAuthorityDecisionUri;
  const evaluate = "/evaluate";
  let host = appConfig.hostName.veracode.us;
  if (vid.startsWith('vera01ei-')) {
    host = appConfig.hostName.veracode.eu;
    vid = vid.split('-')[1] || '';  // Extract part after '-'
    vkey = vkey.split('-')[1] || ''; // Extract part after '-'
  }
  const fullPath = `${resourceUri}${evaluate}`;
  const authHeader = calculateAuthorizationHeader({
    id: vid,
    key: vkey,
    host: host,
    url: fullPath,
    method: 'POST',
  });



  const headers = {
    Authorization: authHeader,
    'Content-Type': 'application/json',
  };
  try {
    const appUrl = `https://${host}${fullPath}`;
    
    const response = await fetch(appUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(decisionRequest),
    });

    const data = await response.json();
    return data as DecisionEvaluationResponse | ErrorResponse;
  } catch (error) {
    throw new Error(`Failed to post decision evaluation: ${error}`);
  }
}

