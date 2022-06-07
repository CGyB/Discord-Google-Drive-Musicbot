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

const queue = new Map();

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

const {
  AudioPlayerStatus,
  StreamType,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  getVoiceConnection,
} = require('@discordjs/voice');

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

const video_player = async (guild, song ,player,interaction) => {
	const song_queue = queue.get(guild.id);

	// If no song is left in the server queue. Leave the voice channel and delete the key and value pair from the global queue.
	if (!song) {
		const connection = joinVoiceChannel({
						channelId: interaction.member.voice.channel.id,
						guildId:  interaction.guild.id,
						adapterCreator: interaction.guild.voiceAdapterCreator,
					});
		connection.destroy();
		queue.delete(guild.id);
		return;
	}

  const stream = await drive.files.get(
    {
      fileId: song.id,
      alt: "media"
    },
    { responseType: "stream" }
  );

	const resource = createAudioResource(stream.data, { inputType: StreamType.Arbitrary });
	player.play(resource);
	player.on(AudioPlayerStatus.Idle, () => {
			song_queue.songs.shift();
			video_player(guild, song_queue.songs[0],player,interaction);
		});
	await song_queue.text_channel.send(`🎶 Now playing **${song.title}**`);
  
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

async function playFiles(name, id, queue, player, interaction) {
  console.log(id);
  const data = await drive.files.get(
    {
      fileId: id,
      alt: "media"
    },
    { responseType: "stream" }
  );

  let t = new Track(player, {
    title: name,
    description: 'none',
    author: 'none',
    url: id,
    requestedBy: interaction.user,
    thumbnail: 'none',
    views: 1,
    duration: 50000,
    source: data.data,
  });
}

const {GuildMember, User} = require('discord.js');

module.exports = {
    name: 'google',
    description: 'Play a song in your channel at google drive!',
    options: [
      {
        name: 'query',
        type: 3, // 'STRING' Type
        description: 'folderId of song you want to play',
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
        const server_queue = queue.get(interaction.guild.id);
		    let song = {};

        const id = interaction.options.get('query').value;
        
        console.log(id)

        const list = await drive.files.list(
        {
          q: `"${id}" in parents`,
          fields: "files(id,name)"
        });
        const files = list.data.files;
        maxPage = Math.ceil(files.length/5);
        page = 0;
        

        const voiceChannel = interaction.member.voice.channel;
        if(!voiceChannel) return interaction.reply('Could not join your voice channel!');

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
                if(files.length > page*5)
                  selected_file = files[page*5+0];
                break;
              case '2️⃣':
                if(files.length > page*5+1)
                  selected_file = files[page*5+1];
                break;
              case '3️⃣':
                if(files.length > page*5+2)
                  selected_file = files[page*5+2];
                break;
              case '4️⃣':
                if(files.length > page*5+3)
                  selected_file = files[page*5+3];
                break;
              case '5️⃣':
                if(files.length > page*5+4)
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
              console.log(`${selected_file.name}`)
              song = { title: selected_file.name, id: selected_file.id};
              
              if (!server_queue) {
                const queue_constructor = {
                  voice_channel: voiceChannel,
                  text_channel: interaction.channel,
                  connection: null,
                  songs: [],
                };
                
                queue.set(interaction.guild.id, queue_constructor);
                queue_constructor.songs.push(song);
                const player = createAudioPlayer();
                try {
                  const connection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId:  interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                  });
                  connection.subscribe(player);

                  queue_constructor.connection = connection;
                  video_player(interaction.guild, queue_constructor.songs[0],player,interaction);
                }
                catch (err) {
                  queue.delete(interaction.guild.id);
                  interaction.reply('There was an error connecting!');
                  throw err;
                }
              }
              else{
                server_queue.songs.push(song);
                return interaction.reply(`👍 **${song.title}** added to queue!`);
              }
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