/**
 * These interfaces define the data structure of the objects returned
 *   by /events and /events/:eventId
 */

export interface IPlayerData {
  AllianceId: string;
  AllianceName: string;
  AllianceTag: '';
  Avatar: string;
  AvatarRing: string;
  AverageItemPower: number;
  DeathFame: number;
  Equipment: IEquipmentData;
  FameRatio: number;
  GuildId: string;
  GuildName: string;
  Id: string;
  Inventory: Array<IItemData|null>;
  KillFame: number;
  Name: string;
}

export interface IEquipmentData {
  Armor: IItemData|null;
  Bag: IItemData|null;
  Cape: IItemData|null;
  Food: IItemData|null;
  Head: IItemData|null;
  MainHand: IItemData|null;
  Mount: IItemData|null;
  OffHand: IItemData|null;
  Potion: IItemData|null;
  Shoes: IItemData|null;
}

export interface IItemData {
  ActiveSpells: string[];
  Count: number;
  PassiveSpells: string[];
  Type: string;
}

export default interface IEventData {
  BattleId: number;
  EventId: number;
  GroupMembers: { [id: string]: IPlayerData };
  GvGMatch: null;
  Killer: IPlayerData;
  Location: null;
  Participants: { [id: string]: IPlayerData };
  TimeStamp: string;
  TotalVictimKillFame: number;
  Type: string;
  Version: number;
  Victim: IPlayerData;
  groupMemberCount: number;
  numberOfParticipants: number;
}
