import { messagingApi } from '@line/bot-sdk';

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const channelSecret = process.env.LINE_CHANNEL_SECRET;

if (!channelAccessToken || !channelSecret) {
  throw new Error('Missing LINE_CHANNEL_ACCESS_TOKEN or LINE_CHANNEL_SECRET');
}

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: channelAccessToken,
});

export async function pushMessage(userId: string, text: string) {
  try {
    await client.pushMessage({
      to: userId,
      messages: [{ type: 'text', text: text }],
    });
  } catch (error) {
    console.error('Error sending LINE message:', error);
    throw error;
  }
}

export async function replyMessage(replyToken: string, text: string) {
    try {
        await client.replyMessage({
            replyToken: replyToken,
            messages: [{ type: 'text', text: text }],
        });
    } catch (error) {
        console.error('Error replying LINE message:', error);
        throw error;
    }
}
