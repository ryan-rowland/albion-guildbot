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
  },
  /**
   * Google storage settings. These are used to post images to a google
   *   storage account to be linked to from Discord. These values come
   *   straight from the serviceAccountKey.json file that is generated
   *   for a Google Storage project.
   */
  googleStorage: {
    // Required
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,

    // Should be OK to default
    auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
    auth_uri: process.env.GOOGLE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
    token_uri: process.env.GOOGLE_TOKEN_URI || 'https://accounts.google.com/o/oauth2/token',
    type: process.env.GOOGLE_TYPE || 'service_account',
  },
};
