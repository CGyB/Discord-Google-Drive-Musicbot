const Discord = require('discord.js');

module.exports = {
  name: 'test',
  description: 'test.',
  async execute(interaction) {
    embed = new Discord.MessageEmbed()
        .setColor('RANDOM')
        .setTitle('test')
        .setDescription('test \n test2 \n test3');
    message = await interaction.reply({embeds: [embed], fetchReply: true });
    await message.react("🤠");
    await message.react("☠");
    await message.react("🤖");
    const filter = (reaction, user) => {
      return ['👍', '👎'].includes(reaction.emoji.name) && user.id === interaction.user.id;
    };

    let collector = message.createReactionCollector(filter, { time: 5000 });
    collector.on('collect', (reaction, user) => {
      switch(reaction.emoji.name){
        case "🤠":
          console.log(`1`);
          break;
        case "☠":
          console.log(`2`);
          break;
        case "🤖":
          console.log(`3`);
          break;
      }
      reaction.users.remove(user.id);

    });
    collector.on('end', collected => {
      console.log(`collected ${collected.size} reactions`);
    });


    /*
    filter = (reaction, user) => user.id !== interaction.user.id;
    collector = message.createReactionCollector(filter, {
      time: 30000
    });

    collector.on("collect", (reaction, user) => {
      console.log("bad");
        if(reaction.emoji.name == '👍'){
          console.log("good");
        }
    })
    */
  },
};
