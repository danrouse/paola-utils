/* eslint-disable no-console */
require('dotenv').config();
const fetch = require('node-fetch');
const Bottleneck = require('bottleneck');
const {
  SLACK_TM_EMAILS,
  SLACK_WORKSPACE,
  SLACK_JOIN_URL_STUB_HRSEIP,
  SLACK_JOIN_URL_STUB_SEIOPR,
} = require('../constants');
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

const createChannel = async (name) => rateLimitedAPIRequest(
  'conversations.create',
  'POST',
  { name, is_private: true },
);

const inviteUsersToChannel = async (channelID, userIDs) => rateLimitedAPIRequest(
  'conversations.invite',
  'POST',
  { channel: channelID, is_private: true, users: userIDs },
);

const setChannelPurpose = async (channelID, purpose) => rateLimitedAPIRequest(
  'conversations.setPurpose',
  'POST',
  { channel: channelID, purpose },
);

const setChannelTopic = async (channelID, topic) => rateLimitedAPIRequest(
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

const getAllSlackUsers = async () => {
  let cursor = '';
  const slackUsers = [];
  do {
    const response = await slackAPIRequest(`users.list?cursor=${cursor}`, 'GET'); // eslint-disable-line no-await-in-loop
    slackUsers.push(...response.members);
    cursor = response.response_metadata.next_cursor;
  } while (cursor);
  return slackUsers;
};

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
  for (let name of formattedNames) {
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
  return true;
};
// const inviteNewTmsToChannels = async () => {}; // TODO?
// const sendMessageViaDM = async () => {}; // TODO?
// const getChannelHistory = async (channelID) => slackAPIRequest(
//   `conversations.history?channel=${channelID}&limit=1000`,
//   'GET',
// );

module.exports = {
  slackAPIRequest: rateLimitedAPIRequest,
  getSlackToken,
  getSlackInviteLink,
  createChannelPerStudent,
  sendMessageToChannel,
  getAllSlackUsers,
};

// WIP block?
// const apiConfig = {};
// const get = (url) => new Promise((resolve, reject) => https.get(url, options, (res) => {
//   let body = '';
//   res.on('data', (chunk) => {
//     (body += chunk);
//   });
//   res.on('end', () => resolve(JSON.parse(body)));
// })
//   .on('error', reject));
// const options = {
//   headers: {
//     Authorization: `Bearer ${getSlackToken()}`
//   }
// }
// const limiter = new Bottleneck({
//   maxConcurrent: 2,
//   minTime: 1000,
// });
// async function deleteMessages(threadTs, messages) {
//   if (messages.length === 0) {
//     return;
//   }
//   const message = messages.shift();
//   if (message.thread_ts !== threadTs) {
//     // Fetching replies, it will delete main message as well.
//     // eslint-disable-next-line no-use-before-define
//     await fetchAndDeleteMessages(message.thread_ts, '');
//   } else {
//     const wrapped = limiter.wrap(get);
//     await wrapped(apiConfig.deleteApiUrl + message.ts);
//   }
//   await deleteMessages(threadTs, messages);
// }
// async function fetchAndDeleteMessages(threadTs, cursor) {
//   const response = await get(
//     (threadTs ? `${apiConfig.repliesApiUrl + threadTs}&cursor=` : apiConfig.historyApiUrl)
//     + cursor
//   );
//   console.log(response);
//   if (!response.ok) {
//     return response;
//   }
//   if (!response.messages || response.messages.length === 0) {
//     return response;
//   }
//   await deleteMessages(threadTs, response.messages);
//   if (response.has_more) {
//     await fetchAndDeleteMessages(threadTs, response.response_metadata.next_cursor);
//   }
// }
// exports.clearChannel = (channelID) => {
//   apiConfig.channel = channelID;
//   apiConfig.baseApiUrl = 'https://slack.com/api/';
//   apiConfig.historyApiUrl = `${apiConfig.baseApiUrl}conversations.history?channel=${apiConfig.channel}&count=1000&cursor=`;
//   apiConfig.deleteApiUrl = `${apiConfig.baseApiUrl}chat.delete?channel=${apiConfig.channel}&ts=`;
//   apiConfig.repliesApiUrl = `${apiConfig.baseApiUrl}conversations.replies?channel=${apiConfig.channel}&ts=`;
//   console.log(apiConfig);
//   return fetchAndDeleteMessages(null, '');
// };
