import Q from "q";
import Slack from "./slack.js";
import tags from "./tags.js";
import {
  bot_token,
  admin_token,
  bot_port,
  mentor_group_name,
  first_time_text,
} from "../config";

var api = new Slack(bot_token)
api.listenForCommands("/commands", bot_port);
api.startConnection();

api.on("command", function*(data, res) {
  res.send("Your question has been submitted to the mentors! We'll let you know when someone's on it.");
  var userInfo = yield api.slackApi("users.info", {user: data.user_id});
  var name = userInfo.user.profile.real_name;
  var image = userInfo.user.profile.image_24;
  var mentorPost = yield api.slackApi("chat.postMessage", {
    channel: "mentors",
    as_user: true,
    attachments: JSON.stringify([
      {
        fallback: `${data.user_name} asked: ${data.text}`,
        author_name: `${name} (${data.user_name})`,
        author_icon: image,
        text: tagify(data.text),
      }
    ])
  });
  yield api.slackApi("reactions.add", {
    channel: mentorPost.channel,
    timestamp: mentorPost.ts,
    name: "raising_hand"
  });
});

var allTags = [];
tags.forEach(t => {
  allTags.push(t.name);
  allTags = allTags.concat(t.synonyms);
});
var tagify = (str) => {
  return str.replace(/([^\s]+)/g, (word) => {
    if (allTags.indexOf(word) !== -1) {
      return "#" + word;
    } else {
      return word;
    }
  });
};


var deleted = {};

var onReactionAdded = function*(m) {
  if (m.user === api.selfId) return;
  if (m.reaction !== "raising_hand") return;
  if (m.reaction !== "raising_hand") return;
  if (m.item.ts in deleted) return;
  if (!m.item.channel) return;

  deleted[m.item.ts] = true;
  var toDelete = (yield api.slackApi("groups.history", {
    channel: m.item.channel,
    latest: m.item.ts,
    oldest: m.item.ts,
    inclusive: 1
  })).messages[0];

  if (!toDelete.attachments) return;

  yield api.slackApi("chat.delete", {
    channel: m.item.channel,
    ts: m.item.ts,
    token: admin_token
  });
  yield createGroup(toDelete, m.user);
  delete deleted[m.item.ts];
};

var createGroup = function*(m, mentorId) {
  var attachment = m.attachments[0];
  var text = attachment.text;
  var menteeUsername = attachment.author_name.match(/\((.*)\)/)[1];
  var mentor;
  var mentee;
  var members = (yield api.slackApi("users.list")).members;
  members.forEach((member) => {
    if (member.id === mentorId) {
      mentor = member;
    }
    if (member.name === menteeUsername) {
      mentee = member;
    }
  });

  var name = `${mentor.name}-${mentee.name}`;
  var groups = (yield api.slackApi("groups.list")).groups;
  var group = null;
  var existing = false;
  for (var i = 0; i < groups.length; i++) {
    if (name.indexOf(groups[i].name) === 0) {
      group = groups[i];
      existing = true;
      break;
    }
  }

  // Check whether two mentors were previously matched :)
  if (!group) {
    name = `${mentee.name}-${mentor.name}`;
    for (var i = 0; i < groups.length; i++) {
      if (name.indexOf(groups[i].name) === 0) {
        group = groups[i];
        existing = true;
        break;
      }
    }
  }

  if (!group) {
    group = (yield api.slackApi("groups.create", {name: name})).group;
  } else if (group.is_archived) {
    yield api.slackApi("groups.unarchive", {channel: group.id});
  }

  var id = group.id;
  if (!existing) {
    yield [
      api.slackApi("chat.postMessage", {
        channel: id,
          as_user: true,
        text: `Hey ${mentee.profile.first_name || mentee.name}, meet your mentor ${mentor.profile.first_name || mentor.name}! You're welcome to keep it digital here, but we encourage you to meet up and debug face to face! Your question was:\n>${text.replace("\n", "\n>")}`
      }),
      api.slackApi("groups.invite", {
        channel: id,
        user: mentor.id
      }),
      api.slackApi("groups.invite", {
        channel: id,
        user: mentee.id
      })
    ]
  } else {
    yield api.slackApi("chat.postMessage", {
      channel: id,
      as_user: true,
      text: `<!group>, y'all have been matched again! This time the question was:\n>${text.replace("\n", "\n>")}`
    });
  }
};

var onUserJoined = function*(m) {
  for (var i = 0; i < first_time_text.length; i++) {
    yield api.slackApi("chat.postMessage", {
        channel: "@" + m.user.name,
        as_user: false,
        text: first_time_text[i],
        link_names: 1,
    });
  }
}

var mentorGroupId = api.slackApi("groups.list")
.then(res => {
  var groups = res.groups;
  for (var i = 0; i < groups.length; i++) {
    var group = groups[i];
    if (group.name === mentor_group_name) {
      return group.id;
    }
  }
  throw new Error(`No group with name ${mentor_group_name} found!`);
});

api.on("message", function*(m) {
  if (m.type === "reaction_added" && m.item.channel === mentorGroupId) {
    yield onReactionAdded(m);
  } else if (m.type === "team_join") {
    yield onUserJoined(m);
  }
});
