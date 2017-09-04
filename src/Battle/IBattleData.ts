/**
 * These interfaces define the data structure of the objects returned
 *   by /battles and /battles/:battleId
 */

export interface IAllianceData {
  deaths: number;
  id: string;
  killFame: number;
  kills: number;
  name: string;
}

export interface IGuildData {
  alliance: string;
  allianceId: string;
  deaths: number;
  id: string;
  killFame: number;
  kills: number;
  name: string;
}

export interface IPlayerData {
  allianceId: string;
  allianceName: string;
  deaths: number;
  guildId: string;
  guildName: string;
  killFame: number;
  kills: number;
  name: string;
}

export default interface IBattleData {
  alliances: { [key: string]: IAllianceData };
  clusterName?: string;
  endTime: string;
  guilds: { [key: string]: IGuildData };
  id: number;
  players: { [key: string]: IPlayerData };
  startTime: string;
  timeout: string;
  totalFame: number;
  totalKills: number;
}
