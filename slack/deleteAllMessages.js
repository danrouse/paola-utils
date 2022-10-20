require("dotenv").config();

const fetch = require("node-fetch");
const https = require("https");
const Bottleneck = require("bottleneck");
const { getSlackToken } = require('./index');
const apiConfig = {};

// Send a message to a channel
const sendMessageToChannel = async (channel, text) => {
  const headers = {
    Authorization: `Bearer ${getSlackToken()}`,
    "Content-Type": "application/json; charset=utf-8",
  };
  const body = {
    channel,
    text,
  };
  try {
    const response = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      body: JSON.stringify(body),
      headers,
    });
    const json = await response.json();
    return json;
  } catch (err) {
    return err;
  }
};

const getAllChannelsInWorkspace = async () => {
  const headers = {
    Authorization: `Bearer ${getSlackToken()}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  try {
    const response = await fetch(
      `https://slack.com/api/conversations.list?pretty=1`,
      { method: "GET", headers }
    );
    console.log(response);
    return response.json();
  } catch (err) {
    console.log(err);
    return err;
  }
};

// Delete message CONFIGURATION

// Legacy tokens are no more supported.
// Please create an app or use an existing Slack App
// Add following scopes in your app from "OAuth & Permissions"
//  - channels:history
//  - groups:history
//  - im:history
//  - mpim:history
//  - chat:write
// VALIDATION

const get = (url) =>
  new Promise((resolve, reject) =>
    https
      .get(url, options, (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => resolve(JSON.parse(body)));
      })
      .on("error", reject)
  );
const options = {
  headers: {
    Authorization: `Bearer ${getSlackToken()}`,
  },
};
const limiter = new Bottleneck({
  maxConcurrent: 2,
  minTime: 1000,
});
const deleteMessages = async (threadTs, messages) => {
  if (messages.length === 0) {
    return;
  }
  const message = messages.shift();
  if (message.thread_ts !== threadTs) {
    // eslint-disable-next-line no-use-before-define
    await fetchAndDeleteMessages(message.thread_ts, ""); // Fetching replies, it will delete main message as well.
  } else {
    const wrapped = limiter.wrap(get);
    const response = await wrapped(apiConfig.deleteApiUrl + message.ts);
  }
  await deleteMessages(threadTs, messages);
};
const fetchAndDeleteMessages = async (threadTs, cursor) => {
  const response = await get(
    (threadTs
      ? `${apiConfig.repliesApiUrl + threadTs}&cursor=`
      : apiConfig.historyApiUrl) + cursor
  );
  if (!response.ok) {
    return response;
  }
  if (!response.messages || response.messages.length === 0) {
    return response;
  }
  await deleteMessages(threadTs, response.messages);
  if (response.has_more) {
    await fetchAndDeleteMessages(
      threadTs,
      response.response_metadata.next_cursor
    );
  }
};

const clearChannel = (channelID) => {
  apiConfig.channel = channelID;
  apiConfig.baseApiUrl = "https://slack.com/api/";
  apiConfig.historyApiUrl = `${apiConfig.baseApiUrl}conversations.history?channel=${apiConfig.channel}&count=1000&cursor=`;
  apiConfig.deleteApiUrl = `${apiConfig.baseApiUrl}chat.delete?channel=${apiConfig.channel}&ts=`;
  apiConfig.repliesApiUrl = `${apiConfig.baseApiUrl}conversations.replies?channel=${apiConfig.channel}&ts=`;
  console.log(apiConfig);
  console.log(fetchAndDeleteMessages);
  return fetchAndDeleteMessages(null, "");
};

const clearChannels = async (channelIDs) => {
  for (let i = 0; i < channelIDs.length; i += 1) {
    let channelID = channelIDs[i];
    apiConfig.channel = channelID;
    apiConfig.baseApiUrl = "https://slack.com/api/";
    apiConfig.historyApiUrl = `${apiConfig.baseApiUrl}conversations.history?channel=${apiConfig.channel}&count=1000&cursor=`;
    apiConfig.deleteApiUrl = `${apiConfig.baseApiUrl}chat.delete?channel=${apiConfig.channel}&ts=`;
    apiConfig.repliesApiUrl = `${apiConfig.baseApiUrl}conversations.replies?channel=${apiConfig.channel}&ts=`;
    await fetchAndDeleteMessages(null, "");
  }
};

// TUXUH0XFW: Hack Reactor Precourse
// T013H0SC9T4: Hack Reactor Precourse 2

const testChannels = {
  TUXUH0XFW: ["C03HD2EPY4C", "C03HPA68FUZ"],
  T013H0SC9T4: ["C04346SLXNC", "C0427T2PS7Q"],
};

// to verify delete messages is working:
// 1. add a few gibberish messages to each test channel manually
// 2. check actual test channels in Slack

const testChannelClear = async () => {
  const testIds = testChannels.TUXUH0XFW;
  return clearChannels(testIds);
};

const getAndClearAllChannels = async () => {
  const { channels } = await getAllChannelsInWorkspace();
  console.log(channels);
  const channelIds = channels.map((channel) => channel.id);
  clearChannels(testIds);
};

exports.getAndClearAllChannels = getAndClearAllChannels;
exports.clearChannels = clearChannels;
exports.clearChannel = clearChannel;
exports.getAllChannelsInWorkspace = getAllChannelsInWorkspace;
exports.testChannelClear = testChannelClear;
exports.sendMessageToChannel = sendMessageToChannel;

// WIP/legacy

// // get history of messages from a channel.
// const getChannelHistory = async (channelID) => {
//   console.log(channelID);
//   console.log(getSlackToken());
//   const headers = {
//     Authorization: `Bearer ${getSlackToken()}`,
//     // 'Content-Type': 'application/x-www-form-urlencoded',
//   };
//   try {
//     const response = await fetch(
//       `https://slack.com/api/conversations.history?channel=${channelID}&limit=1000`,
//       { method: "GET", headers }
//     );
//     //return await response.json();
//   } catch (err) {
//     return err;
//   }
// };
