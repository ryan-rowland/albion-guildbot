module.exports = {
  /**
   * Discord Bot settings. These are mandatory and will affect what the bot
   *   posts about, and where it posts to.
   */
  bot: {
    // The alliance your guild belongs to
    alliance: process.env.ALBION_ALLIANCE,
    // The ID of the discord channel to post to.
    feedChannelId: process.env.ALBION_FEED_CHANNEL_ID,
    // The name of your guild (or guilds, if the guild is large).
    guilds: process.env.ALBION_GUILDS
      ? process.env.ALBION_GUILDS.split(',') : [],
    // The Discord token of the Bot to post through.
    token: process.env.DISCORD_TOKEN,
  }
};
