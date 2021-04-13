# SWPD-BOT
![GitHub package.json version](https://img.shields.io/github/package-json/v/derPiepmatz/SWPD-Bot?style=for-the-badge)
![GitHub package.json dependency version (prod)](https://img.shields.io/github/package-json/dependency-version/derPiepmatz/SWPD-Bot/typescript?style=for-the-badge)
![GitHub](https://img.shields.io/github/license/derPiepmatz/SWPD-Bot?style=for-the-badge)

A bot to support the software project group D in 2020/21 at [CvO Uni Oldenburg](https://uol.de/).  
Completely written in Typescript to manage Java code. 🙃

## About
Currently (Summer 2021) I work on a group project at the 
[CvO Uni Oldenburg](https://uol.de/). We have to use Atlassian's Bitbucket and 
we wanted some automation.
Luckily Bitbucket has some [API](https://developer.atlassian.com/static/rest/bitbucket-server/latest/bitbucket-rest.html) 
to work with. So I created this bot to automate some stuff.

## Features
This bot has two main features for now:

- [Checking Code](#Checkstyle) with [Checkstyle](https://checkstyle.sourceforge.io/)
- [Formatting Code](#Formatter) with [IntelliJ IDEA](https://www.jetbrains.com/idea/)

### Checkstyle
This bot just takes diffs in a pull request and applies the Checkstyle on it.
It just executes the .jar and parses the results. The parsed results will be 
formatted in some good-looking markdown:
> ❌ **You did some error.** *(en.stuff.you.are.Stupid:69:3)*  
> ⚠️ **Warned you.** *(en.stuff.you.are.Ignorant:420)*

These markdown outputs will be commented under the pull request.

If the bot found no conflict it will just post this under the pull request:
> ✔️ **No checkstyle conflicts found.**

### Formatter
To format our code easily in one place, the bot runs the 
[IntelliJ CLI](https://www.jetbrains.com/help/idea/command-line-formatter.html) 
formatter over the modified files. This formatting will take place once the pull
request has reached it's required approvals (they can be defined in the config).

Upon approval the formatter will run over the files and if changes we're made,
the bot will try to push them with a commit like this:
> **Auto-Reformat PR#69** 
> 
> This action was performed automatically by a bot.

If nothing has to be committed the bot will comment this under the pull request:
> 👌 **Nothing to format.**

If the bot wanted to push but could not, it will comment this:
> **⚠️ Could not push changes.**

## Behavior
I don't really know if it would be possible to use a gateway or some websocket, 
the bot just polls frequently (once a minute) the Bitbucket server. Usually this 
should have no impact on the 
[rate limits](https://support.atlassian.com/bitbucket-cloud/docs/api-request-limits/) 
of it.

## Setup
### Prerequisites
In order to work correctly the bot needs some software preinstalled. This is
just easiest way to implement the features I wanted.
- java
- git
- npm@latest
- node@lts

### Token
The bot requires some authentication for the Bitbucket access. You could use the
password for the account, but I prefer to use a generated token. 
[This](https://confluence.atlassian.com/bitbucketserver/personal-access-tokens-939515499.html)
explains how you can get one. The token you get must be written into a `.token`
file in the root of the bot. The file should only contain the token, nothing 
more.

### Bitbucket Config
In the repo you find a file called `bitbucketconfig.json`. This file contains
the configuration for your Bitbucket repository. Change it how you need it.
```json5
{
  "host": "https://git.swl.informatik.uni-oldenburg.de", // The url of your Bitbucket instance
  "user": "SWP2020D_Bot",                                // The username of your bot account
  "name": "Bot der Gruppe D",                            // The display name of your bot
  "email": "bot@cptpiepmatz.de",                         // The email your bot commits with
  "project": "SP",                                       // The project slug, can also be a user
  "repo": "swp2020d",                                    // The repository slug
  "isUserRepo": false,                                   // If this repo is a user repo
  "approvalsUntilFormat": 3                              // Approvals until the bot formats
}
```

### Formatter Config
The bot uses the locally installed IntelliJ instance, therefore it has to be 
configured, so that the bot is able to use it properly. 
```json
{
  "ideaPath": "C:/Users/derPi/AppData/Local/JetBrains/Toolbox/apps/IDEA-U/ch-0/203.7717.56/bin/idea64.exe"
}
```
Just enter the full path of your `idea64.exe` or your `idea.sh`.

### Installing
To install the bot, simply run the npm install script inside the root directory.
```shell
npm install
```

### Log-Level (optional)
On default the bot will output into the console with the log level: "INFO".
To change this to another log-level just add an environmental variable with 
`LOGLEVEL`. You may also create in the root of the bot a `.env` file with the 
content: 
```dotenv
LOGLEVEL=verbose
```
You can also set one of these log levels which all increase in output:
```
error
warn
info
http
verbose
debug
silly
```

### Ready to Roll
Now the bot should be fully configured, and you can run it. Maybe consider 
running it via some process manager like [pm2](https://pm2.keymetrics.io/).
To run the bot, execute this:
```shell
npm run run
```

## Directories and Files
Some directories and files show up once the bot is running correctly.

### Directories

#### log
This one just holds the logging files. The Bot logs a bit different in files 
than in the console. You find different files including different log levels.

#### node_modules
This is a bot made in node, so upon installation this will show up. It holds all
the dependencies the bot uses.

#### repo
This directory contains the local working tree of your repository. Don't touch 
this. This directory is **only for the bot** and should **not** be used by you.

### Files

#### .bb-pr-data
This dot file holds the current cache of the bot, if it needs to restart it will 
draw all the information from this file to "remember" the known pull requests.
It's in the json formatted. You may take a look inside the bot's brain, but do 
not edit it, otherwise the bot may not work anymore. Deleting it will always fix 
the issues, but also remove the "memories" of the bot.
