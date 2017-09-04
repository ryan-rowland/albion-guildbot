import Alliance from './Alliance';
import Guild from './Guild';
import IBattleData, { IPlayerData } from './IBattleData';

/**
 * The type of grouping a {@link Faction} represents.
 */
export enum FactionType {
  Alliance = 'alliance',
  Guild = 'guild',
  Unguilded = 'unguilded',
}

/**
 * A {@link FactionLike} object has the properties
 *   necessary to construct a {@link Faction}.
 */
export interface IFactionLike {
  deaths: number;
  factionType: FactionType;
  killFame: number;
  kills: number;
  name: string;
  players: IPlayerData[];
}

/**
 * A {@link Faction} is an immutable object that represents the faction a
 *   player or group of players belongs to. A faction can represent an
 *   {@link Alliance}, {@link Guild} or 'Unguilded'; whichever is the
 *   highest level of organization the player belongs to. This is primarily
 *   used for being able to associate all players with a group.
 */
export default class Faction implements IFactionLike {
  /**
   * Construct a {@link Faction} by extracting and grouping all of the
   *   unguilded players in the passed {@link IBattleData}.
   */
  static fromUnguilded(battleData: IBattleData) {
    const players = Object.values(battleData.players)
      .filter(player => player.guildName === '');

    const factionData = players.reduce((data, player) => {
      data.deaths += player.deaths;
      data.killFame += player.killFame;
      data.kills += player.kills;
      return data;
    }, {
      deaths: 0,
      factionType: FactionType.Unguilded,
      killFame: 0,
      kills: 0,
      name: 'Unguilded',
      players,
    });

    return new Faction(factionData as IFactionLike);
  }

  deaths: number;
  factionType: FactionType;
  killFame: number;
  kills: number;
  name: string;
  players: IPlayerData[];

  constructor(factionLike: IFactionLike) {
    this.deaths = factionLike.deaths;
    this.factionType = factionLike.factionType;
    this.killFame = factionLike.killFame;
    this.kills = factionLike.kills;
    this.name = factionLike.name;
    this.players = factionLike.players;
  }
}
