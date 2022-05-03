//const ytdlDiscord = require("ytdl-core-discord");
// { play } = require("../include/play");

const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
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

function playFiles(obj) {

  obj.drive.files.get(
    {
      fileId: obj.files[0].id,
      alt: "media"
    },
    { responseType: "stream" },
    (err, { data }) => {
      if (err) throw new Error(err);
      console.log(obj.files[0]);
      //obj.message.channel.send(`Playing ${obj.files[0].name}`);
      const file = fs.createWriteStream(obj.files[0].name)
    }
  );
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
        interaction.reply({
          content: 'Start!',
          ephemeral: true,
        });
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
        drive.files.list(
          {
            q: `"1UoZYNC3drfgiXR1GTvcbfn0PlKBiO0Ay" in parents`,
            fields: "files(id,name)"
          },
          (err, { data }) => {
            if (err) throw new Error(err);
            connection => {
              let obj = {
                drive: drive,
                files: data.files
              };
              playFiles(obj);
            }
          }
        );
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