import { FactionType, IFactionLike } from './Faction';
import IBattleData, { IAllianceData, IPlayerData } from './IBattleData';

/**
 * An {@link Alliance} is an immutable object that abstracts relevant details about
 *   a group of {@link Player}s present in the same AO {@link Battle} from raw
 *   battle data received from the AO API.
 */
export default class Alliance implements IFactionLike {
  deaths: number;
  factionType: FactionType = FactionType.Alliance;
  killFame: number;
  kills: number;
  name: string;
  players: IPlayerData[];

  constructor(allianceData: IAllianceData, battleData: IBattleData) {
    this.deaths = allianceData.deaths;
    this.killFame = allianceData.killFame;
    this.kills = allianceData.kills;
    this.name = allianceData.name;

    this.players = Object.values(battleData.players)
      .filter(player => player.allianceName === allianceData.name);
  }
}
