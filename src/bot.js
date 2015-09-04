import Q from "q";
import Slack from "./slack.js";
import tags from "./tags.js";
import {
  bot_token,
  admin_token,
  bot_port,
  mentor_group_name,
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
  deleted[m.item.ts] = true;
  var toDelete = (yield api.slackApi("groups.history", {
    channel: m.item.channel,
    latest: m.item.ts,
    oldest: m.item.ts,
    inclusive: 1
  })).messages[0];
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
    var swap_name = `${mentee.name}-${mentor.name}`;
    for (var i = 0; i < groups.length; i++) {
      if (swap_name.indexOf(groups[i].name) === 0) {
        group = groups[i];
        name = swap_name;
        existing = true;
        break;
      }
    }
  }

  if (!group) {
    var iter = 0;
    while (!group) {
      try {
        group = (yield api.slackApi("groups.create", {name: name})).group;
      } catch(err) {
          if (err.message === "name_taken") {
            name = `${mentor.name}-${mentee.name}-${iter}`;
            iter += 1;
          } else {
            throw err;
          }
      }
    }
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


var onChannelDelete = function*(m) {
  api.slackApi("chat.delete", {
    channel: m.channel,
    ts: m.ts,
    token: admin_token
  }, ["message_not_found"]).done();
};

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
  if (m.type === "reaction_added" && m.item.channel === (yield mentorGroupId)) {
    yield onReactionAdded(m);
  }
  if (m.type === "message" &&
      m.subtype !== "message_deleted" &&
      m.channel === (yield mentorGroupId) &&
      m.user !== api.selfId) {
    yield onChannelDelete(m);
  }
});
