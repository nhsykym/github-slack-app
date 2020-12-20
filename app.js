const { App } = require('@slack/bolt');
require('dotenv').config();

const { Octokit } = require("@octokit/rest");
const GITHUB_ACCESS_TOKEN = process.env.GITHUB_ACCESS_TOKEN;
const octokit = new Octokit({
  auth: GITHUB_ACCESS_TOKEN
});

var channelId;

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

app.shortcut('new_github_issue', async ({ shortcut, ack, context }) => {
  await ack();

  channelId = shortcut.channel.id;

  try {
    const result = await app.client.views.open({
      token: context.botToken,
      trigger_id: shortcut.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'new_issue_view',
        title: {
          type: 'plain_text',
          text: 'Modal title'
        },
        blocks: [
          {
            type: 'input',
            block_id: 'block_title',
            label: {
              type: 'plain_text',
              text: 'タイトルを入力してください'
            },
            element: {
              type: 'plain_text_input',
              action_id: 'input_title',
            }
          },
          {
            type: 'input',
            block_id: 'block_desc',
            label: {
              type: 'plain_text',
              text: '詳細を入力してください'
            },
            element: {
              type: 'plain_text_input',
              action_id: 'input_desc',
              multiline: true,
              initial_value: `>${shortcut.message.text}`
            }
          },
        ],
        submit: {
          type: 'plain_text',
          text: 'Submit'
        }
      }
    });
    console.log(result);
  }
  catch (error) {
    console.error(error);
  }
});


app.view('new_issue_view', async ({ ack, body, view, client }) => {
  // モーダルでのデータ送信イベントを確認
  await ack();

  const title = view['state']['values']['block_title']['input_title']['value'];
  const desc = view['state']['values']['block_desc']['input_desc']['value'];
  const user = body['user']['id'];

  // Issue作成
  let color;
  let text;
  await octokit.issues.create({
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO,
    title: title,
    body: desc
  }).then(result => {
    console.log(result);
    color = "good";
    text = `:white_check_mark: Issue successfully created:\n${result.data.html_url}`;
  }).catch(error => {
    console.error(error);
    color = "danger";
    text = `:dizzy_face: Something went wrong`
  }); 

  // ユーザーにメッセージを送信
  try {
    await client.chat.postEphemeral({
      channel: channelId,
      user: user,
      attachments: [
        {
          "color": color,
          "text": text
        }
      ]
    });
  }
  catch (error) {
    console.error(error);
  }

});


(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Bolt app is running!');
})();