import Alliance from './Alliance';
import Faction from './Faction';
import Guild from './Guild';

import IBattleData, { IPlayerData } from './IBattleData';

/**
 * A {@link Battle} is an immutable object that abstracts relevant details about
 *   an AO battle from raw battle data received from the AO API.
 */
export default class Battle {
  /**
   * A Map of {@link Alliance}s by name.
   */
  alliances: Map<string, Alliance>;

  /**
   * The time the battle ended.
   */
  endTime: string;

  /**
   * An array of all {@link Faction}s involved in the fight, sorted by rank.
   */
  rankedFactions: Faction[] = [];

  /**
   * A Map of {@link Guild}s by name.
   */
  guilds: Map<string, Guild>;

  /**
   * The ID of this {@link Battle}.
   */
  id: number;

  /**
   * Whether this Battle describes a 5v5.
   */
  is5v5: Boolean;

  /**
   * An array of all {@link IPlayerData}s.
   */
  players: IPlayerData[];

  /**
   * The title of this battle.
   */
  title: string;

  /**
   * The total fame this battle.
   */
  totalFame: number;

  /**
   * The total number of kills this battle.
   */
  totalKills: number;

  constructor(battleData: IBattleData) {
    this.endTime = battleData.endTime;
    this.id = battleData.id;
    this.totalFame = battleData.totalFame;
    this.totalKills = battleData.totalKills;
    this.players = Object.values(battleData.players);

    // Alliances
    const allianceArray: Alliance[] = Object.values(battleData.alliances)
      .map(allianceData => new Alliance(allianceData, battleData));

    this.alliances = new Map(allianceArray
      .map(alliance => [alliance.name, alliance]) as any);

    // Guilds
    const guildArray: Guild[] = Object.values(battleData.guilds)
      .map(guildData => new Guild(guildData, battleData));

    this.guilds = new Map(guildArray
      .map(guild => [guild.name, guild]) as any);

    // Factions
    this.rankedFactions = this.rankedFactions.concat(allianceArray
      .map(alliance => new Faction(alliance)));

    this.rankedFactions = this.rankedFactions.concat(guildArray
      .filter(guild => guild.alliance === '')
      .map(guild => new Faction(guild)));

    const unguildedFaction = Faction.fromUnguilded(battleData);
    if (unguildedFaction.players.length) {
      this.rankedFactions.push(unguildedFaction);
    }

    this.is5v5 = this.players.length === 10
      && this.rankedFactions.length === 2
      && this.rankedFactions[0].players.length === 5
      && this.rankedFactions[1].players.length === 5;

    this.rankedFactions.sort((a, b) => this.is5v5
      ? b.kills - a.kills
      : b.killFame - a.killFame);
  }
}
