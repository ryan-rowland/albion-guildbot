'use strict';

const bluebird = require('bluebird');
const Discord = require('discord.js');
const logger = require('winston');
const Redis = require('redis');

const Albion = require('./AlbionApi');
const Battle = require('./Battle').default;
const { createImage, getItemUrl } = require('./createImage');

const config = require('../config').bot;

const BATTLE_MIN_PLAYERS = 10;
const BATTLE_MIN_RELEVANT_PLAYERS = 3;

bluebird.promisifyAll(Redis.RedisClient.prototype);
bluebird.promisifyAll(Redis.Multi.prototype);
const redis = Redis.createClient(process.env.REDIS_URL);

// Heroku will crash if we're not listenining on env.PORT.
if (process.env.HEROKU) {
  const Express = require('express');
  const app = new Express();
  app.listen(process.env.PORT || 1337);
}

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, { colorize: true });
logger.level = 'debug';

// Read eventID file to get a list of all posted events
// If this fails, we cannot continue, so throw an exception.
let lastBattleId;
let lastEventId;
const databasePromise = Promise.all([
  redis.getAsync('lastBattleId').then(id => { lastBattleId = id; }),
  redis.getAsync('lastEventId').then(id => { lastEventId = id; }),
]);

// Initialize Discord Bot
const bot = new Discord.Client();

bot.on('ready', () => {
  logger.info('Connected');
  logger.info(`Logged in as: ${bot.user.username} - (${bot.user.id})`);

  databasePromise.then(() => {
    checkBattles();
    checkKillboard();

    setInterval(checkBattles, 60000);
    setInterval(checkKillboard, 30000);
  });
});

function checkBattles() {
  logger.info('Checking battles...');
  Albion.getBattles({ limit: 20, offset: 0 }).then(battles => {
    battles
      // Filter out battles that have already been processed
      .filter(battleData => battleData.id > lastBattleId)
      // Format the raw battle data into a more useful Battle object
      .map(battleData => new Battle(battleData))
      // Filter out battles with insigificant amounts of players
      .filter(battle => battle.players.length >= BATTLE_MIN_PLAYERS)
      // Filter out battles that don't involve a relevent number of guildmates
      .filter(battle => {
        const relevantPlayerCount = config.guilds.reduce((total, guildName) => {
          return total + (battle.guilds.has(guildName)
            ? battle.guilds.get(guildName).players.length
            : 0);
        }, 0);

        return relevantPlayerCount >= BATTLE_MIN_RELEVANT_PLAYERS;
      }).forEach(battle => sendBattleReport(battle));
  });
}

function sendBattleReport(battle, channelId) {
  if (battle.id > lastBattleId) {
    lastBattleId = battle.id;
    redis.setAsync('lastBattleId', lastBattleId);
  }

  const title = battle.rankedFactions.slice()
    .sort((a, b) => battle.alliances.get(b.name).players.length - battle.alliances.get(a.name).players.length)
    .map(({ name }) => `${name}(${battle.alliances.get(name).players.length})`)
    .join(' vs ');

  const thumbnailUrl = battle.players.length >= 100 ? 'https://storage.googleapis.com/albion-images/static/PvP-100.png'
    : battle.players.length >= 40 ? 'https://storage.googleapis.com/albion-images/static/PvP-40.png'
    : battle.is5v5 ? 'https://storage.googleapis.com/albion-images/static/5v5-3.png'
    : 'https://storage.googleapis.com/albion-images/static/PvP-10.png';

  let fields = battle.rankedFactions.map(({ name, kills, deaths, killFame, factionType }, i) => {
    return {
      name: `${i + 1}. ${name} - ${killFame.toLocaleString()} Fame`,
      inline: true,
      value: [
        `Kills: ${kills}`,
        `Deaths: ${deaths}`,
        factionType === 'alliance' ? '\n__**Guilds**__' : '',
        Array.from(battle.guilds.values())
          .filter(({ alliance }) => alliance === name)
          .sort((a, b) => battle.guilds.get(b.name).players.length  > battle.guilds.get(a.name).players.length)
          .map(({ name }) => `${name} (${battle.guilds.get(name).players.length})`)
          .join('\n'),
      ].join('\n')
    };
  });

  if (battle.is5v5) {
    fields = battle.rankedFactions.map(({ name, kills }) => {
      return {
        name: `${name} [Kills: ${kills}]`,
        inline: true,
        value: battle.alliances.get(name).players
          .sort((a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1)
          .sort((a, b) => b.kills > a.kills)
          .map(({ name, kills, deaths }) => `${deaths ? '~~' : ''}${name}${deaths ? '~~' : ''}: ${kills} Kills`)
          .join('\n')
      };
    });
  }

  const didWin = battle.rankedFactions[0].name === config.alliance;

  const embed = {
    url: `https://albiononline.com/en/killboard/battles/${battle.id}`,
    description: battle.is5v5
      ? `Winner's Fame: ${battle.rankedFactions[0].killFame.toLocaleString()}`
      : `Players: ${battle.players.length}, Kills: ${battle.totalKills}, Fame: ${battle.totalFame.toLocaleString()}`,
    title: battle.is5v5
      ? (didWin ? `We wrecked ${battle.rankedFactions[1].name} in a 5v5!` : `We lost to ${battle.rankedFactions[0].name} in a 5v5!`)
      : title,
    color: didWin ? 65280 : 16711680,
    timestamp: battle.endTime,
    thumbnail: { url: thumbnailUrl },
    image: { url: 'https://storage.googleapis.com/albion-images/static/spacer.png' },
    fields,
  };

  bot.channels.get(channelId || config.feedChannelId).send({ embed }).then(() => {
    logger.info(`Successfully posted log of battle between ${title}.`);
  }).catch(err => {
    logger.error(err);
  });
}

function sendKillReport(event, channelId) {
  const isFriendlyKill = config.guilds.indexOf(event.Killer.GuildName) !== -1;

  createImage('Victim', event).then(imgBuffer => {
    const participants = parseInt(event.numberOfParticipants || event.GroupMembers.length, 10);
    const assists = participants - 1;

    const embed = {
      url: `https://albiononline.com/en/killboard/kill/${event.EventId}`,
      title: `${event.Killer.Name} (${assists ? '+' + assists : 'Solo!'}) just killed ${event.Victim.Name}!`,
      description: `From guild: ${createGuildTag(event[isFriendlyKill ? 'Victim' : 'Killer'])}`,
      color: isFriendlyKill ? 65280 : 16711680,
      image: { url: 'attachment://kill.png' },
    };

    if (event.TotalVictimKillFame > 25000) {
      Object.assign(embed, {
        thumbnail: { url: getItemUrl(event.Killer.Equipment.MainHand) },
        title: `${event.Killer.Name} just killed ${event.Victim.Name}!`,
        description: assists
          ? `Assisted by ${assists} other player${assists > 1 ? 's' : ''}.`
          : 'Solo kill!',
        fields: [{
          name: isFriendlyKill ? 'Victim\'s Guild' : 'Killer\'s Guild',
          value: createGuildTag(event[isFriendlyKill ? 'Victim' : 'Killer']),
          inline: true,
        }],
        timestamp: event.TimeStamp,
      });
    }

    const files = [{ name: 'kill.png', attachment: imgBuffer }];

    bot.channels.get((channelId || config.feedChannelId)).send({ embed, files }).then(() => {
      logger.info(`Successfully posted log of ${createDisplayName(event.Killer)} killing ${createDisplayName(event.Victim)}.`);
    }).catch(err => {
      logger.error(err);
    });
  }).catch(err => {
    logger.error(err);
  });
}

function checkKillboard() {
  logger.info('Checking killboard...');
  Albion.getEvents({ limit: 51, offset: 0 }).then(events => {
    if (!events) { return; }

    events.filter(event => event.EventId > lastEventId).forEach(event => {
      const isFriendlyKill = config.guilds.indexOf(event.Killer.GuildName) !== -1;
      const isFriendlyDeath = config.guilds.indexOf(event.Victim.GuildName) !== -1;

      if (!(isFriendlyKill || isFriendlyDeath) || event.TotalVictimKillFame < 10000) {
        return;
      }

      if (event.EventId > lastEventId) {
        lastEventId = event.EventId;
        redis.setAsync('lastEventId', lastEventId);
      }

      sendKillReport(event);
    });
  });
}

function createGuildTag(player) {
  const allianceTag = player.AllianceName ? `[${player.AllianceName}]` : '';
  return player.GuildName ? `${allianceTag} ${player.GuildName}` : 'N/A';
}

function createDisplayName(player) {
  const allianceTag = player.AllianceName ? `[${player.AllianceName}]` : '';
  return `**<${allianceTag}${player.GuildName || 'Unguilded'}>** ${player.Name}`;
}

bot.on('message', msg => {
  let message = msg.content;
  let channelID = msg.channel.id;

  let matches = message.match(/^https:\/\/albiononline\.com\/en\/killboard\/kill\/(\d+)/);
  if (matches && matches.length) {
    Albion.getEvent(matches[1]).then(event => {
      sendKillReport(event, channelID);
    });
    return;
  }

  matches = message.match(/^https:\/\/albiononline\.com\/en\/killboard\/battles\/(\d+)/);
  if (matches && matches.length) {
    Albion.getBattle(matches[1]).then(battle => {
      sendBattleReport(new Battle(battle), channelID);
    });
    return;
  }

  if (message.substring(0, 1) !== '!') { return; }

  const args = message.substring(1).split(' ');
  const [cmd, id] = args;

  if (!cmd || !id) {
    return;
  }

  switch (cmd) {
    case 'showBattle':
      Albion.getBattle(id).then(battle => {
        sendBattleReport(new Battle(battle), channelID);
      });
      break;
    case 'showKill':
      Albion.getEvent(id).then(event => {
        sendKillReport(event, channelID);
      });
      break;
  }
});

bot.login(config.token);
