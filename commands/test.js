
const Discord = require('discord.js');
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const {QueryType} = require('discord-player');
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = 'token.json';
const {Track} = require('discord-player')

const queue = new Map();

let drive = null;

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

const {
  AudioPlayerStatus,
  StreamType,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  getVoiceConnection,
} = require('@discordjs/voice');

module.exports = {
  name: 'test',
  description: 'test.',
  async execute(interaction) {

    const voiceChannel = interaction.member.voice.channel;
    if(!voiceChannel) return interaction.reply('Tu doit être dans un channel pour faire cette commande !');

    const server_queue = queue.get(interaction.guild.id);
		let song = {};
    
    if (!server_queue) {
      const queue_constructor = {
        voice_channel: voiceChannel,
        text_channel: interaction.channel,
        connection: null,
        songs: [],
      };
      // Add our key and value pair into the global queue. We then use this to get our server queue.

      const list = await drive.files.list(
      {
        q: `"1UoZYNC3drfgiXR1GTvcbfn0PlKBiO0Ay" in parents`,
        fields: "files(id,name)"
      });
      const files = list.data.files;

        song = { title: files[0].name, id: files[0].id};

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
        interaction.reply('👍');
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
    // here <3
    
  },
};

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

  let t = new Track(player, {
    title: 'test7',
    description: 'none',
    author: 'none',
    url: '213',
    requestedBy: interaction.user,
    thumbnail: 'none',
    views: 1,
    duration: 50000,
    source: stream.data,
  });
  console.log(t.raw)
	const resource = createAudioResource(t.source, { inputType: StreamType.Arbitrary });
	player.play(resource);
	player.on(AudioPlayerStatus.Idle, () => {
			song_queue.songs.shift();
			video_player(guild, song_queue.songs[0],player,interaction);
		});
	await song_queue.text_channel.send(`🎶 Now playing **${song.title}**`);
  
}
