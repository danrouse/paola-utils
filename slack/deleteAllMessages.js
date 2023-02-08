require('dotenv').config();

const { deleteAllMessagesInChannel, getAllSlackChannels } = require('./index');

const ALL_CHANNELS_VALUE = 'ALL';
const DRY_RUN = false;
(async () => {
  if (!process.argv[2]) {
    console.error(`A channel name or "${ALL_CHANNELS_VALUE}" must be provided!`);
    process.exit(1);
  }
  const channels = await getAllSlackChannels(process.argv[2] !== ALL_CHANNELS_VALUE);
  console.log(`Found ${channels.length} total channels`);
  const filteredChannels = channels.filter((channel) => (
    process.argv[2] === ALL_CHANNELS_VALUE ||
    process.argv[2] === channel.name));
  console.log(`Found ${filteredChannels.length} channels which meet requirements`);
  for (const channel of filteredChannels) {
    if (
      process.argv[2] === ALL_CHANNELS_VALUE ||
      process.argv[2] === channel.name
    ) {
      console.log(`Deleting all messages in channel "${channel.name}"`);
      if (!DRY_RUN) {
        await deleteAllMessagesInChannel(channel.id);
      }
    }
  }
})();
