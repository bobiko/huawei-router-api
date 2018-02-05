'use strict';
import {
  RequestError,
} from '@/error';
import nodeRequest from 'request';
import xml2js from 'xml2js';
import * as config from '@/config';
import {JSDOM} from 'jsdom';

/**
 * @typedef requestOptions
 * @property {string} url
 * @property {string} [method]
 * @property {object} [data]
 * @property {Object.<string, string>} [headers]
 * @property {string} [accepts]
 */

/**
 * @typedef requestResponse
 * @property {nodeRequest.RequestResponse} response
 * @property {any} body
 */

/**
 *
 * @param {requestOptions} options
 * @return {Promise<requestResponse>}
 */
function request(options) {
  options = Object.assign({
    method: 'GET'
  }, options);
  options.headers = Object.assign({
    'Accept': options.accepts
  }, options.headers);
  return new Promise((resolve, reject) => {
    return nodeRequest({
      url: options.url,
      method: options.method,
      headers: options.headers,
      body: options.data
    }, (error, response, body) => {
      if (error) {
        reject(error);
      } else if (response) {
        if (response.statusCode >= 200 && response.statusCode < 400) {
          resolve({response, body});
        } else {
          reject(new RequestError('http_request_invalid_status', 'HTTP request response status invalid; '+response.statusMessage));
        }
      } else {
        reject(new RequestError('http_request_error','Unknown HTTP request error.'));
      }
    });
  });
}

/**
 * @typedef xmlRequestOptions
 * @property {string} url
 * @property {string} [method]
 * @property {object} [data]
 * @property {Object.<string, string>} [headers]
 */

/**
 *
 * @param {xmlRequestOptions} options
 * @return {Promise<any>}
 */
export function xmlRequest(options) {
  const requestOptions = {
    url: options.url,
    method: options.method,
    data: options.data,
    headers: options.headers,
    accepts: 'application/xml'
  };
  return new Promise((resolve, reject) => {
    request(requestOptions).then(({response, body}) => {
      xml2js.parseString(body, (err, data) => {
        if (err) {
          reject(new RequestError('http_request_invalid_xml', err));
        } else {
          resolve({data, headers: response.headers});
        }
      });
    });
  });
}

/**
 * Gets verification tokens required for making admin requests and logging in
 * @return {Promise<string[]>}
 */
export async function getTokensFromPage() {
  const {body} = await request({
    url: config.getParsedUrl().origin+'/'+'html/home.html'
  });
  const doc = (new JSDOM(body)).window.document;
  const meta = doc.querySelectorAll('meta[name=csrf_token]');
  let requestVerificationTokens = [];
  for (let i=0; i < meta.length; i++) {
    requestVerificationTokens.push(meta[i].content);
  }
  return requestVerificationTokens;
}
