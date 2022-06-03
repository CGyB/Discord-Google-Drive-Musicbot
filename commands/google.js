//const ytdlDiscord = require("ytdl-core-discord");
// { play } = require("../include/play");

const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const {QueryType} = require('discord-player');
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = 'token.json';
const {Track} = require('discord-player')
const Discord = require('discord.js');

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

function fileToList(files,page){
  str = "";
  if(files.length>0){
    str = `1. ${files[page*5+0].name}`;
  }
  for(i=1;i < files.length-(page*5) && i<5;i++){
    str += `\n${i+1}. ${files[page*5+i].name}`;
  }
  str += `\npage ${page+1}/${Math.ceil(files.length/5)}`
  return str;
}

async function playFiles(obj, id, interaction) {
  console.log(id);
  const {data} = await obj.drive.files.get(
    {
      fileId: id,
      alt: "media"
    },
    { responseType: "stream" }
  );

  const file = fs.createWriteStream(obj.files[0].name)

  if(!(data.name instanceof String)){
    console.log(typeof data);
  }
  if((interaction.user instanceof User)){
    console.log('User is good');
  }

  Track.title = "t"
  Track.description = "a"
  Track.author = "b"
  Track.url = "ad"
  Track.thumbnail = "c"
  Track.duration = "100"
  Track.views = 1
  Track.requestedBy = interaction.user
  Track.raw = data

  
  //const fileName = obj.files[0].id + "." + mimeType.split("/")[1];
  //const file = fs.createWriteStream(fileName)
  
  // if (err) throw new Error(err);
  /*
  await obj.interaction.followUp({
        content: `⏱ | Loading your ${obj.files[0].name}...`,
  });*/

  obj.queue.addTrack(Track)
  //const file = fs.createWriteStream(obj.files[0].name)
}

const {GuildMember, User} = require('discord.js');

module.exports = {
    name: 'google',
    description: 'Play a song in your channel at google drive!',
    options: [
      {
        name: 'query',
        type: 3, // 'STRING' Type
        description: 'Id of song you want to play',
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

        const id = interaction.options.get('query').value;
        
        const list = await drive.files.list(
        {
          q: `"1UoZYNC3drfgiXR1GTvcbfn0PlKBiO0Ay" in parents`,
          fields: "files(id,name)"
        });
        const files = list.data.files;
        maxPage = Math.ceil(files.length/5);
        console.log(maxPage);
        page = 0;
        
        
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
        
       str = fileToList(files,page);
       embed = new Discord.MessageEmbed()
        .setColor('RANDOM')
        .setTitle('list')
        .setDescription(`${str}`);
        message = await interaction.reply({embeds: [embed], fetchReply: true });
       await message.react('1️⃣');
       await message.react('2️⃣');
       await message.react('3️⃣');
       await message.react('4️⃣');
       await message.react('5️⃣');
       await message.react('◀️');
       await message.react('▶️');

      const filter = (reaction, user) => {
        return ['1️⃣', '2️⃣','3️⃣','4️⃣','5️⃣'].includes(reaction.emoji.name) && user.id === interaction.user.id;
      };
      let collector = message.createReactionCollector(filter, { time: 5000 });

      collector.on('collect', (reaction, user) => {
          selected_file = -1;
          if(user.id ==interaction.user.id){
            switch(reaction.emoji.name){
              case '1️⃣':
                selected_file = files[page*5+0];
                break;
              case '2️⃣':
                selected_file = files[page*5+1];
                break;
              case '3️⃣':
                selected_file = files[page*5+2];
                break;
              case '4️⃣':
                selected_file = files[page*5+3];
                break;
              case '5️⃣':
                selected_file = files[page*5+4];
                break;
              case '▶️':
                if(page<maxPage){
                  page++;
                  str = fileToList(files,page);
                  embed = new Discord.MessageEmbed()
                    .setColor('RANDOM')
                    .setTitle('list')
                    .setDescription(`${str}`);
                  message.edit({embeds: [embed], fetchReply: true });
                }
                break;
              case '◀️':
                if(page>0){
                  page--;
                  str = fileToList(files,page);
                  embed = new Discord.MessageEmbed()
                    .setColor('RANDOM')
                    .setTitle('list')
                    .setDescription(`${str}`);
                  message.edit({embeds: [embed], fetchReply: true });
                }
                break;
            }
            reaction.users.remove(interaction.user.id);
            if(selected_file!=-1){
              let obj = {
                drive: drive,
                interaction: interaction,
                queue: queue,
                files: selected_file
              }
              console.log(`${selected_file.name}`)
              //playFiles(obj, id, interaction);
            }
          }
        })
        
        /*
        playFiles(obj, id, interaction);

        console.log('123');
        */
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