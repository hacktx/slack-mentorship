/*
** MENTORBOT CONFIG
*/

/*
** This is an access token for *you*, an admin of your Slack
** You can generate it here: https://api.slack.com/web
**/
exports.admin_token = "REPLACE-ME";

/*
** While "bot_token" implies that this is a bot, this needs to be a full-fledged
** user account, created like any other user. Why? Bot accounts can't create
** private rooms, so we need an actual user.
**
** So, to set this up, open an incognito window and create a new member of your
** Slack team. Then, navigate to the same url (https://api.slack.com/web) and
** generate a token. Note that this user doesn't need to be an admin.
**
** We named our bot user "Mentor Bot", but go ahead and call it something
** silly if you like. Goofy profile picture recommended.
**/
exports.bot_token = "REPLACE-ME";

/*
** The name of the group where mentors will recieve tickets.
** Go ahead and create this yourself, then /invite @name-of-bot inside
*/
exports.mentor_group_name = "mentors";

/*
** For the /mentor command to work, you have to create a custom slash command
** Create one here: https://{yourslack}.slack.com/services/new/slash-commands
** Make the command name "/mentor"
** Make the URL be http://{yourhostname}:{bot_port}/commands/mentor
** Make sure the method is POST
** If you so desire, make the command show up in autocomplete
** Make sure bot_port (configured below) is publicly accessible
*/
exports.bot_port = 3000;


/*
** DASH CONFIG
*/


/*
** Create a new Slack application at https://api.slack.com/applications/new
** Set the redirect URI to be http://{yourhostname}/oauth
** Then, copy over the client_id and client_secret here
*/
exports.client_id = "REPLACE-ME";
exports.client_secret = "REPLACE-ME";

/*
** Grab your team id by clicking "Test Method" here: https://api.slack.com/methods/team.info/test
** The team is under team --> id
*/
exports.team_id = "REPLACE-ME";

/*
** Replace example.com with your publicly-accessible hostname
*/
exports.redirect_uri = "http://example.com/oauth";

/*
** Secret used to sign the session cookies. Can be anything secure
*/
exports.cookie_secret = "REPLACE-ME";

/*
** Port that the mentor dashboard will be served from
*/
exports.dash_port = 80;
