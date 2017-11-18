import * as request from 'request';

import IBattleData from './Battle/IBattleData';

// TODO: Both should be config options later?
const API_URL = process.env.ALBION_API_BASE || 'https://gameinfo.albiononline.com/api/gameinfo';
const LIVE_URL = 'http://live.albiononline.com';

/**
 * Request a resource from the Albion Online API.
 * @param path - The resource path of the URL.
 * @param queries - Query params to send along with the request.
 */
function baseRequest(baseUrl: string, path: string, queries?: { [key: string]: any }): Promise<any> {
  const qs = queries
    ? '?' + Object.entries(queries).map((query: string[]) => query.join('=')).join('&')
    : '';
  const url = `${baseUrl}${path}?${qs}`;

  return new Promise((resolve, reject) => {
    request(url, (error, response, body) => {
      if (error || (response && response.statusCode === 404)) {
        reject(error || response);
        return;
      }
      try {
        resolve(JSON.parse(body.replace(/\n/g, ' ').replace(/\r/g, '').trim())); // replacements needed for status.txt
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Options that may be passed to a request, and used to form
 *   a query string.
 */
export interface IRequestOptions {
  /**
   * The amount of battles to load. Max is 51.
   */
  limit?: number;

  /**
   * The offset from the newest kill.
   */
  offset?: number;

  /**
   * How to sort the results.
   */
  sort?: string;
}

/**
 * Get a single Battle by battleId
 */
export function getBattle(battleId: string): Promise<IBattleData> {
  return baseRequest(API_URL, `/battles/${battleId}`);
}

/**
 * Get an array of Battles.
 */
export function getBattles(options: IRequestOptions): Promise<IBattleData[]> {
  options = options || { };
  const queries = {
    limit: options.limit || 51,
    offset: options.offset || 0,
    sort: options.sort || 'recent',
  };

  return baseRequest(API_URL, `/battles`, queries);
}

/**
 * Get a single Battle by eventId
 */
export function getEvent(eventId: string): Promise<any> {
  return baseRequest(API_URL, `/events/${eventId}`);
}

/**
 * Get an array of Kills.
 */
export function getEvents(options: IRequestOptions): Promise<any[]> {
  options = options || { };
  const queries = {
    limit: options.limit || 51,
    offset: options.offset || 0,
    sort: options.sort || 'recent',
  };

  return baseRequest(API_URL, `/events`, queries);
}

/**
 * Get Albion Online status information
 */
export function serverStatusRequest(): Promise<any> {
  return baseRequest(LIVE_URL, '/status.txt');
}
