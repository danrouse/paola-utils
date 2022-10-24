require('dotenv').config();

import { deleteAllMessagesInChannel, getAllSlackChannels } from './index';

const ALL_CHANNELS_VALUE = 'ALL';
(async () => {
  if (!process.argv[2]) {
    console.error(`A channel name or "${ALL_CHANNELS_VALUE}" must be provided!`);
    process.exit(1);
  }
  const channels = await getAllSlackChannels(process.argv[2] !== ALL_CHANNELS_VALUE);
  console.log(`Found ${channels.length} total channels`);
  const filteredChannels = channels.filter((channel) =>
    process.argv[2] === ALL_CHANNELS_VALUE ||
    process.argv[2] === channel.name
  );
  console.log(`Found ${filteredChannels.length} channels which meet requirements`)
  for (const channel of filteredChannels) {
    if (
      process.argv[2] === ALL_CHANNELS_VALUE ||
      process.argv[2] === channel.name
    ) {
      console.log(`Deleting all messages in channel "${channel.name}"`);
      await deleteAllMessagesInChannel(channel.id);
    }
  }
})();
