import * as request from 'request';

import IBattleData from './Battle/IBattleData';

const BASE_URL = process.env.ALBION_API_BASE || 'https://gameinfo.albiononline.com/api/gameinfo';

/**
 * Request a resource from the Albion Online API.
 * @param path - The resource path of the URL.
 * @param queries - Query params to send along with the request.
 */
function baseRequest(path: string, queries?: { [key: string]: any }): Promise<any> {
  const qs = queries
    ? '?' + Object.entries(queries).map((query: string[]) => query.join('=')).join('&')
    : '';
  const url = `${BASE_URL}${path}?${qs}`;

  return new Promise((resolve, reject) => {
    request(url, (error, response, body) => {
      if (error || (response && response.statusCode === 404)) {
        reject(error || response);
        return;
      }
      resolve(JSON.parse(body));
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
  return baseRequest(`/battles/${battleId}`);
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

  return baseRequest(`/battles`, queries);
}

/**
 * Get a single Battle by eventId
 */
export function getEvent(eventId: string): Promise<any> {
  return baseRequest(`/events/${eventId}`);
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

  return baseRequest(`/events`, queries);
}
