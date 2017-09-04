# Albion Guildbot
A Bot that posts interesting events about a guild to Discord.

### Individual Kill
![](https://i.gyazo.com/fc9106ae9f0916a24435849fe8856f7d.png)

### Battle
![](https://i.gyazo.com/3c3be8703049760a6a136c451d8812a7.png)

### 5v5
![](https://i.gyazo.com/95877c30c3f76d942e0af2bbf4676d0c.png)

## Requirements
 - git
 - nodejs
 - redis

## Instructions
The Albion Guildbot can be set up with either environment variables or directly
modifying `config.js`. The bot was developed against a Heroku environment,
where environment variables are preferred.

### Step 1 - Set up a Google Storage account
You'll need a Google Storage account to host the generated image files to be
used in the bot's individual kill posts. Once you have a project created,
use the values of `serviceAccountKey.json` to either fill in `config.js`
directly or set your environment's env vars as specified in `config.js`.

### Step 2 - Create a Discord bot
Using the Discord dev console, set up a Discord bot and add it to your
server. You will need the bot's token (found on discord dev console) and
the channelID of the channel you want it to post to (found by right clicking
the channel in Discord after enabling developer mode in Discord settings). Add
these settings either to your `config.js` directly, or set the appropriate
env vars in your environment according to `config.js`.

### Step 3 - Install Redis
This project uses Redis to persist data. If deploying through heroku, just
install the "Redis Heroku" addon. For local development, redis will need
to be installed locally and run as a service.

### Step 4 - Configure to your guild
Set your alliance and guild name(s) in `config.js` or the corresponding
environment variables. If set by Environment variable, guilds should be
set as a comma-separated string. For example, `ALBION_GUILDS="TeamCasualty,Team Casualty 2"`

### Step 5 - Push to your environment or run locally

#### 5a. Environment example: Heroku
Using heroku, you should already have a Heroku project set up (it will need to
be paid if you plan to run the bot 24/7). You should have your heroku repository
set as a git source (eg `git remote add heroku https://your.heroku.repo`).

After setting your environment variables in the Heroku dashboard or via the
Heroku CLI, the project can be pushed to heroku via git, eg `git push heroku master`.

If using heroku, make sure to also set the environment variable HEROKU to true. If you
don't, heroku will shut down after not being bound to a port for 60 seconds.

#### 5b. Running locally
To run locally, first you'll need to install the dependencies via npm
```
npm install
```

And call the `start` script to run the bot
```
npm start
```
