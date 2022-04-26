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
    if (obj.files.length == 0) {
      obj.message.channel.send("end");
      obj.channel.leave(); // <--- Important
      return;
    }
    obj.drive.files.get(
      {
        fileId: obj.files[0].id,
        alt: "media"
      },
      { responseType: "stream" },
      (err, { data }) => {
        if (err) throw new Error(err);
        console.log(obj.files[0]);
        obj.message.channel.send(`Playing ${obj.files[0].name}`);
        obj.connection
          .playStream(data)
          .on("end", () => {
            obj.files.shift();
            playFiles(obj);
          })
          .on("error", err => console.log(err));
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
        
        console.log("start");
        
        const { data } = await drive.files.get(
            {
                fileId: '1UoZYNC3drfgiXR1GTvcbfn0PlKBiO0Ay',
                alt: "media"
            },
            { responseType: "stream" }
        )
    }
 }