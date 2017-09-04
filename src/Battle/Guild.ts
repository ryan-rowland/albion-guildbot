import { FactionType, IFactionLike } from './Faction';
import IBattleData, { IGuildData, IPlayerData } from './IBattleData';

/**
 * An {@link Guild} is an immutable object that abstracts relevant details about
 *   a group of {@link Player}s present in the same AO {@link Battle} from raw
 *   battle data received from the AO API.
 */
export default class Guild implements IFactionLike {
  alliance: string;
  deaths: number;
  factionType: FactionType = FactionType.Guild;
  killFame: number;
  kills: number;
  name: string;
  players: IPlayerData[];

  constructor(guildData: IGuildData, battleData: IBattleData) {
    this.alliance = guildData.alliance;
    this.deaths = guildData.deaths;
    this.killFame = guildData.killFame;
    this.kills = guildData.kills;
    this.name = guildData.name;

    this.players = Object.values(battleData.players)
      .filter(player => player.guildName === guildData.name);
  }
}
