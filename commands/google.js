//const ytdlDiscord = require("ytdl-core-discord");
// { play } = require("../include/play");

const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const {QueryType} = require('discord-player');
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = 'token.json';

let queue = null;
let filter = null;
let drive = null;
let collector = null;
let playList = {
  channel : null,
  pre : null,
  nowStr : null,
  now : null,
  next : null,
}


fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  authorize(JSON.parse(content), getDrive);
});

function getDrive(auth){
  drive = google.drive({ version: "v3", auth });
}

function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

function fileToList(files){
  str = "";
  if(files.length>0){
    str = `1. ${files[0].name}`;
  }
  for(i=1;i < files.length;i++){
    str += `\n${i+1}. ${files[i].name}`;
  }
  console.log(str);
  return str;
}

async function playFiles(obj) {
  console.log(obj.files[0].id);


  /*
  const {data} = await obj.drive.files.get(
    {
      fileId: obj.files[0].id,
      alt: "media"
    },
    { responseType: "stream" },
  );
  */
  
  //obj.queue.addTrack(data)
  //const file = fs.createWriteStream(obj.files[0].name)
}

const folderId = "1UoZYNC3drfgiXR1GTvcbfn0PlKBiO0Ay"; // Please set the folder ID of Google Drive.
const {GuildMember} = require('discord.js');

module.exports = {
    name: 'google',
    description: 'Play a song in your channel at google drive!',
    options: [
      {
        name: 'query',
        type: 3, // 'STRING' Type
        description: 'The song you want to play',
        required: true,
      },
    ],
    async execute(interaction, player) {
      try {
        if (!(interaction.member instanceof GuildMember) || !interaction.member.voice.channel) {
          return void interaction.reply({
            content: 'You are not in a voice channel!',
            ephemeral: true,
          });
        }

        if (
          interaction.guild.me.voice.channelId &&
          interaction.member.voice.channelId !== interaction.guild.me.voice.channelId
        ) {
          return void interaction.reply({
            content: 'You are not in my voice channel!',
            ephemeral: true,
          });
        }
        
        const list = await drive.files.list(
        {
          q: `"1UoZYNC3drfgiXR1GTvcbfn0PlKBiO0Ay" in parents`,
          fields: "files(id,name)"
        });
        const files = list.data.files;
        
        const queue = await player.createQueue(interaction.guild, {
            ytdlOptions: {
            quality: "highest",
            filter: "audioonly",
            highWaterMark: 1 << 25,
            dlChunkSize: 0,
          },
            metadata: interaction.channel,
        });
        
        try {
          if (!queue.connection) await queue.connect(interaction.member.voice.channel);
        } catch {
          void player.deleteQueue(interaction.guildId);
          return void interaction.followUp({
            content: 'Could not join your voice channel!',
          });
        }

        //msg = await interaction.channel.send("sample message");

        let obj = {
          drive: drive,
          interaction: interaction,
          queue: queue,
          files: files
        }
        str = fileToList(files);
        msg = await interaction.channel.send(str);
        await msg.react(':one:');
        await msg.react(':two:');
        await msg.react(':three:');
        await msg.react(':four:');
        await msg.react(':five:');

        await msg.react('1️⃣');
        await msg.react('2️⃣');
        await msg.react('3️⃣');
        await msg.react('4️⃣');
        await msg.react('5️⃣');
      
        //playFiles(obj);

        console.log('123');

      } catch (error) {
        interaction.reply({
          content: 'You are not in a voice channel!',
          ephemeral: true,
        });
        console.log(error);
        interaction.followUp({
          content: 'There was an error trying to execute that command: ' + error.message,
        });
      }
      
    }
 }