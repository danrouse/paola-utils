/* eslint-disable no-console */
require('dotenv').config();
const fetch = require('node-fetch');
const Bottleneck = require('bottleneck');
const {
  SLACK_TM_EMAILS,
  SLACK_JOIN_URL_STUB_HRSEIP,
  SLACK_JOIN_URL_STUB_SEIOPR,
} = require('../config');
const { SLACK_WORKSPACE } = require('../config/cohorts');

// Limit to max of Tier 2 request rates (20 req/min)
const rateLimiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 3000,
});

function getSlackToken() {
  if (SLACK_WORKSPACE === 'hrseip') {
    if (!process.env.SLACK_TOKEN_HRSEIP) {
      console.error('No slack token in env provided for hrseip workspace!');
      process.exit(1);
    }
    return process.env.SLACK_TOKEN_HRSEIP;
  }
  if (!process.env.SLACK_TOKEN_SEIOPR) {
    console.error('No slack token in env provided for sei-opr workspace!');
    process.exit(1);
  }
  return process.env.SLACK_TOKEN_SEIOPR;
}

function getSlackInviteLink() {
  return SLACK_WORKSPACE === 'hrseip'
    ? SLACK_JOIN_URL_STUB_HRSEIP
    : SLACK_JOIN_URL_STUB_SEIOPR;
}

function slackAPIRequest(endpoint, method, body) {
  const headers = {
    Authorization: `Bearer ${getSlackToken()}`,
    'Content-Type': 'application/json; charset=utf-8',
  };
  return fetch(
    `https://slack.com/api/${endpoint}`,
    { method, body: typeof body === 'string' ? body : JSON.stringify(body), headers },
  ).then((res) => res.json());
}

const rateLimitedAPIRequest = rateLimiter.wrap(slackAPIRequest);

async function paginatedSlackAPIRequest(getEndpoint, responseKey, method, body) {
  let cursor = '';
  const responses = [];
  do {
    const response = await rateLimitedAPIRequest(getEndpoint(cursor), method, body);
    if (!response || !response[responseKey]) {
      throw new Error(`Key '${responseKey}' not found in response! ${JSON.stringify(response, null, 2)}`);
    }
    responses.push(...response[responseKey]);
    cursor = response.response_metadata?.next_cursor;
  } while (cursor);
  return responses;
}

// Send a message to a channel
const sendMessageToChannel = (channel, text) => rateLimitedAPIRequest(
  'chat.postMessage',
  'POST',
  { channel, text },
);

// format list of names function to create firstname_lastname,
// which is the desired channel name for each student's private chat channel
const NAME_SUFFIXES = ['II', 'III', 'IV', 'JR', 'SR', 'JR.', 'SR.'];
const formatListOfNames = (nameList) => nameList.map((name) => {
  const nameArray = name.replace('\'', '').split(' ');
  if (nameArray.length > 2) {
    const lastNamePart = nameArray[nameArray.length - 1].toUpperCase();
    if (NAME_SUFFIXES.includes(lastNamePart)) nameArray.pop();
  }
  return `${nameArray[0].toLowerCase()}_${nameArray[nameArray.length - 1].toLowerCase()}`;
});

const createChannel = (name) => rateLimitedAPIRequest(
  'conversations.create',
  'POST',
  { name, is_private: true },
);

const inviteUsersToChannel = (channelID, userIDs) => rateLimitedAPIRequest(
  'conversations.invite',
  'POST',
  { channel: channelID, is_private: true, users: userIDs },
);

const setChannelPurpose = (channelID, purpose) => rateLimitedAPIRequest(
  'conversations.setPurpose',
  'POST',
  { channel: channelID, purpose },
);

const setChannelTopic = (channelID, topic) => rateLimitedAPIRequest(
  'conversations.setTopic',
  'POST',
  { channel: channelID, topic },
);

// const getUserIdByEmail = async (email) => slackAPIRequest(
//   `users.lookupByEmail?email=${email}`,
//   'GET',
// );

// const getAllChannelsInWorkspace = async () => slackAPIRequest(
//   'conversations.list',
//   'GET',
// );

const getAllSlackUsers = () => paginatedSlackAPIRequest(
  (cursor) => `users.list?cursor=${cursor}`,
  'members',
  'GET',
);

const getAllSlackChannels = (includePrivateChannels) => paginatedSlackAPIRequest(
  (cursor) => `conversations.list?types=public_channel${includePrivateChannels ? ',private_channel' : ''}&cursor=${cursor}`,
  'channels',
  'GET',
);

const getAllMessagesInChannel = (channelId) => paginatedSlackAPIRequest(
  (cursor) => `conversations.history?channel=${channelId}&count=1000&cursor=${cursor}`,
  'messages',
  'GET',
);

let cachedTechMentorUserIDs;
const getTechMentorUserIDs = async () => {
  if (!cachedTechMentorUserIDs) {
    const users = await getAllSlackUsers();
    cachedTechMentorUserIDs = users
      .filter((user) => SLACK_TM_EMAILS.includes(user.profile.email))
      .map((user) => user.id);
  }
  return cachedTechMentorUserIDs;
};

const createChannelPerStudent = async (nameList) => {
  const formattedNames = formatListOfNames(nameList);
  for (const name of formattedNames) {
    const result = await createChannel(name); // Tier 2
    if (!result.ok) {
      console.warn('Failed to create channel for', name);
      console.warn(result);
      return;
    }
    console.info('Created channel', result.channel.id, 'for', name);
    const purposeSet = await setChannelPurpose( // Tier 2
      result.channel.id,
      'This channel is where you will interact with the Precourse team regarding technical questions. '
      + 'TMs will respond to help desk and reach out about your progress throughout the course.',
    );
    if (!purposeSet.ok) console.warn(result.channel.id, 'Failed to set channel purpose', purposeSet);
    const topicSet = await setChannelTopic(result.channel.id, 'Your personal channel with the Precourse Team.'); // Tier 2
    if (!topicSet.ok) console.warn(result.channel.id, 'Failed to set channel topic', topicSet);
    const techMentorUserIDs = await getTechMentorUserIDs(); // Tier 2
    const invited = await inviteUsersToChannel(result.channel.id, techMentorUserIDs); // Tier 3
    if (!invited.ok) console.warn(result.channel.id, 'Failed to invite users to channel', invited);
  }
};

const deleteAllMessagesInThread = async (channelId, threadTs) => {
  const replies = await paginatedSlackAPIRequest(
    (cursor) => `conversations.replies?channel=${channelId}&ts=${threadTs}&cursor=${cursor}`,
    'messages',
    'GET'
  );
  console.log('Deleting', replies.length, 'replies to thread ts', threadTs, 'in channel', channelId);
  return Promise.all(
    replies.map((reply) => rateLimitedAPIRequest('chat.delete', 'POST', { channel: channelId, ts: reply.ts }))
  );
};

const deleteAllMessagesInChannel = async (channelId) => {
  const messages = await getAllMessagesInChannel(channelId);
  console.log('Deleting', messages.length, 'messages in channel', channelId);
  await Promise.all(
    messages.map(async (message) => {
      if (message.thread_ts) {
        return deleteAllMessagesInThread(channelId, message.thread_ts);
      }
      return rateLimitedAPIRequest('chat.delete', 'POST', { channel: channelId, ts: message.ts });
    })
  );
};

module.exports = {
  slackAPIRequest: rateLimitedAPIRequest,
  paginatedSlackAPIRequest,
  getSlackToken,
  getSlackInviteLink,
  createChannelPerStudent,
  sendMessageToChannel,
  getAllSlackUsers,
  getAllSlackChannels,
  getAllMessagesInChannel,
  deleteAllMessagesInChannel,
};
