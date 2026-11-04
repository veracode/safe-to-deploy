import * as core from '@actions/core';
import { calculateAuthorizationHeader } from './veracode-hmac';
import appConfig from '../app-config';
import { CreateDecisionRequest, DecisionEvaluationResponse, ErrorResponse } from '../namespaces/TrustAuthorityDecision';

function buildQueryString(queryParams: Array<{key: string, value: string}>): string {
  if (!queryParams || queryParams.length === 0) {
    return '';
  }

  const params = queryParams
    .map(param => `${encodeURIComponent(param.key)}=${encodeURIComponent(param.value)}`)
    .join('&');

  return `?${params}`;
}

async function parseResponseBody<T>(response: Response): Promise<T | ErrorResponse> {
  const text = await response.text();
  if (response.status === 500 && !text.trim()) {
    return {
      timestamp: new Date().toISOString(),
      status: response.status,
      error: 'Internal Server Error',
      message: 'Veracode returned an internal server error with no response body',
    } as ErrorResponse;
  }
  return JSON.parse(text) as T | ErrorResponse;
}

export async function postRequest<T, B>(vid: string, vkey: string, resourceUri: string, resourceName: string, body: B): Promise<T | ErrorResponse> {
  
  let host = appConfig.hostName.veracode.us;
  if (vid.startsWith('vera01ei-')) {
    host = appConfig.hostName.veracode.eu;
    vid = vid.split('-')[1] || '';  // Extract part after '-'
    vkey = vkey.split('-')[1] || ''; // Extract part after '-'
  }
  const fullPath = `${resourceUri}${resourceName}`;
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
      body: JSON.stringify(body),
    });

    if (response.status === 401 || response.status === 403) {
      return {
        timestamp: new Date().toISOString(),
        status: response.status,
        error: response.status === 401 ? 'Unauthorized' : 'Forbidden',
        message: 'Authorization failed: verify the Veracode API credentials (vid/vkey) and their permissions',
      } as ErrorResponse;
    }

    return await parseResponseBody<T>(response);
  } catch (error) {
    throw new Error(`Failed to post decision evaluation: ${error}`);
  }
}

export async function getRequestById<T>(vid: string, vkey: string, resourceUri: string, resourceName: string, queryParams: Array<{key: string, value: string}>): Promise<T | ErrorResponse> {

  let host = appConfig.hostName.veracode.us;
  if (vid.startsWith('vera01ei-')) {
    host = appConfig.hostName.veracode.eu;
    vid = vid.split('-')[1] || '';  // Extract part after '-'
    vkey = vkey.split('-')[1] || ''; // Extract part after '-'
  }
  const fullPath = `${resourceUri}${resourceName}${buildQueryString(queryParams)}`;
  const authHeader = calculateAuthorizationHeader({
    id: vid,
    key: vkey,
    host: host,
    url: fullPath,
    method: 'GET',
  });



  const headers = {
    Authorization: authHeader,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  try {
    const appUrl = `https://${host}${fullPath}`;
    
    const response = await fetch(appUrl, {
      method: 'GET',
      headers: headers
    });

    if (response.status === 401 || response.status === 403) {
      return {
        timestamp: new Date().toISOString(),
        status: response.status,
        error: response.status === 401 ? 'Unauthorized' : 'Forbidden',
        message: 'Authorization failed: verify the Veracode API credentials (vid/vkey) and their permissions',
      } as ErrorResponse;
    }

    return await parseResponseBody<T>(response);
  } catch (error) {
    throw new Error(`Failed to get decision evaluation: ${error}`);
  }
}

