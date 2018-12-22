'use strict';

require('babel-polyfill');

const Discord = require('discord.js');
const FileSync = require('lowdb/adapters/FileSync');
const logger = require('winston');
const low = require('lowdb');

const Albion = require('./AlbionApi');
const Battle = require('./Battle').default;
const { createImage, getItemUrl } = require('./createImage');

const config = require('../config');

const adapter = new FileSync('.db.json');
const db = low(adapter);
db.defaults({ recents: { battleId: 0, eventId: 0 } }).write();

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, { colorize: true });
logger.level = 'debug';

var http = require('http'); // importing http

logger.debug(config);

function startKeepAlive() {
  // from https://stackoverflow.com/questions/5480337/easy-way-to-prevent-heroku-idling
  setInterval(function() {
    var options = {
      host: process.env.PING_URL,
      port: 80,
      path: '/'
    };
    http.get(options, function(res) {
      res.on('data', function(chunk) {
        try {
          // optional logging... disable after it's working
          logger.info('HEROKU RESPONSE: ' + chunk);
        } catch (err) {
          logger.error(err.message);
        }
      });
    }).on('error', function(err) {
      logger.error('Error: ' + err.message);
    });
  }, 10 * 60 * 1000); // load every 20 minutes
}

// Heroku will crash if we're not listenining on env.PORT.
if (process.env.HEROKU) {
  const Express = require('express');
  const app = new Express();
  app.listen(process.env.PORT || 1337, (err) => {
    if (err) {
      return logger.error('something bad happened: ' + err);
    }

    logger.info('server is listening on ' + process.env.PORT || 1337);
    return true;
  });
  app.get('/', (request, response) => {
    response.send('WOOP WOOP');
  });
  if (process.env.PING_URL) {
    startKeepAlive();
  }
}

// Read eventID file to get a list of all posted events
// If this fails, we cannot continue, so throw an exception.
let lastBattleId = db.get('recents.battleId').value();
let lastEventId = db.get('recents.eventId').value();
let lastAlbionStatus = db.get('recents.albionStatus').value();
let lastAlbionStatusMsg = db.get('recents.albionStatusMsg').value();

// Initialize Discord Bot
const bot = new Discord.Client();

bot.on('ready', () => {
  logger.info('Connected');
  logger.info(`Logged in as: ${bot.user.username} - (${bot.user.id})`);

  if (config.discord.statusChannelId) {
    checkServerStatus();
    setInterval(checkServerStatus, 60000);
  }

  checkBattles();
  checkKillboard();

  setInterval(checkBattles, 60000);
  setInterval(checkKillboard, 30000);
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
      .filter(battle => battle.players.length >= config.battle.minPlayers)
      // Filter out battles that don't involve a relevent number of guildmates
      .filter(battle => {
        const relevantPlayerCount = config.guild.guilds.reduce((total, guildName) => {
          return total + (battle.guilds.has(guildName)
            ? battle.guilds.get(guildName).players.length
            : 0);
        }, 0);

        return relevantPlayerCount >= config.battle.minRelevantPlayers;
      }).forEach(battle => sendBattleReport(battle));
  });
}

function sendBattleReport(battle, channelId) {
  if (battle.id > lastBattleId) {
    lastBattleId = battle.id;
    db.set('recents.battleId', lastBattleId).write();
  }

  const title = battle.rankedFactions.slice()
    .sort((a, b) => b.players.length - a.players.length)
    .map(({ name, players }) => `${name}(${players.length})`)
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
    fields = battle.rankedFactions.map(({ name, kills, players }) => {
      return {
        name: `${name} [Kills: ${kills}]`,
        inline: true,
        value: players
          .sort((a, b) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1)
          .sort((a, b) => b.kills > a.kills)
          .map(({ name, kills, deaths }) => `${deaths ? '~~' : ''}${name}${deaths ? '~~' : ''}: ${kills} Kills`)
          .join('\n')
      };
    });
  }

  const didWin = battle.rankedFactions[0].name === config.guild.alliance;

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

  bot.channels.get(channelId || config.discord.feedChannelId).send({ embed }).then(() => {
    logger.info(`Successfully posted log of battle between ${title}.`);
  }).catch(err => {
    logger.error(err);
  });
}

function sendKillReport(event, channelId) {
  const isFriendlyKill = config.guild.guilds.indexOf(event.Killer.GuildName) !== -1;

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

    if (event.TotalVictimKillFame > config.kill.minFame) {
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

    return bot.channels.get((channelId || config.discord.feedChannelId)).send({ embed, files });
  }).then(() => {
    logger.info(`Successfully posted log of ${createDisplayName(event.Killer)} killing ${createDisplayName(event.Victim)}.`);
  });
}

function checkKillboard() {
  logger.info('Checking killboard...');
  Albion.getEvents({ limit: 51, offset: 0 }).then(events => {
    if (!events) { return; }

    events.sort((a, b) => a.EventId - b.EventId)
      .filter(event => event.EventId > lastEventId)
      .forEach(event => {
        lastEventId = event.EventId;

        const isFriendlyKill = config.guild.guilds.indexOf(event.Killer.GuildName) !== -1;
        const isFriendlyDeath = config.guild.guilds.indexOf(event.Victim.GuildName) !== -1;

        if (!(isFriendlyKill || isFriendlyDeath) || event.TotalVictimKillFame < config.victimMinFame) {
          return;
        }

        sendKillReport(event);
      });

    db.set('recents.eventId', lastEventId).write();
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

function sendServerStatus(channelId, isCmd) {
  let now = new Date();

  const embed = {
    url: 'https://albiononline.statuspage.io',
    title: 'Albion Status Information',
    description: isCmd
      ? `Current server status is **${lastAlbionStatus}**`
      : `Server status just changed to **${lastAlbionStatus}**`,
    color: lastAlbionStatus === 'offline' ? 0xff2600 : 0x00f900,
    fields: [{
      name: 'Message',
      value: lastAlbionStatusMsg,
      inline: true,
    }],
    timestamp: now.toISOString(),
  };

  bot.channels.get(channelId || config.discord.statusChannelId).send({ embed }).then(() => {
    logger.info(`Successfully posted albion status: ${lastAlbionStatus}`);
  }).catch(err => {
    logger.error(err);
  });
}

function checkServerStatus(channelId) {
  logger.info('Checking server status...');

  Albion.serverStatusRequest().then(currentAlbionStatus => {
    if (lastAlbionStatus !== currentAlbionStatus.status || lastAlbionStatusMsg !== currentAlbionStatus.message) {
      lastAlbionStatus = currentAlbionStatus.status;
      lastAlbionStatusMsg = currentAlbionStatus.message;

      sendServerStatus(channelId);

      db.set('recents.albionStatus', currentAlbionStatus.status).write();
      db.set('recents.albionStatusMsg', currentAlbionStatus.message).write();
    }
  });
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

  if (!cmd) {
    return;
  }

  // cmd without parameter
  switch (cmd) {
    case 'showStatus':
      sendServerStatus(channelID, 1);
      break;
  }

  if (!id) {
    return;
  }

  // cmd with parameter
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

bot.login(config.discord.token);
