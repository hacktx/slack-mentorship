# TreeHacks Slack Mentorship System
## Overview
This is an experimental (read: not quite production-ready) version of TreeHacks' new Slack-based mentorship system. What follows is an explanation of how everything works and our design decisions, but if you'd like to get it running _right now_, head on down to [Get It Running](#get-it-running).

Why Slack? Communication is a huge problem at hackathons, and Slack gives us a really nice unified communications platform, including announcements, feedback, volunteer communication, hacker questions, sponsor relations, hacker-to-hacker community chat, and now, mentorship. Plus, we get configurable mobile and email notifications for free.

Note that this is still pretty hacky. It works well in our manual tests, but it's undocumented, has no automated testing, and utilizes some private API's. Use at your own risk, yada yada yada. That said, we're committed to making this really awesome, and we'd love all the help we can get - Pull Requests welcome! We'd be delighted if this got used at other events, and if you need any kind of help setting it up, shoot an email to `rpalefsk@stanford.edu`.

The system is a basically Hacker News distilled into one repo - it's built with node.js, ES6 (via Babel), React, and Material Design. The app is split into two components: Mentorbot (bot) and Mentor Dashboard (dash). They share a lot of code and complement one another, but they each work perfectly fine on their own, so we'll explain them separately.

### Mentorbot (bot)
This is the heart of the mentorship system. This code (located in `src/bot.js`) implements a flow that sounds pretty complicated, but once you try it out, is actually pretty slick. Here's how it all works: 

1. Invite mentors to a private mentorship group (we use `#mentors`). This is nice, since it requires no database, no sign-up process, and no lists. Getting a mentor set up is as simple as `/invite @mentor-username`. The room will auto-delete any non-bot posts to keep it clean for tickets (explained below). 
2. Hackers request help in plain English using the `/mentor` slash command  from anywhere inside Slack. Example: `/mentor I need help understanding "this" in javascript`  
3. The question is posted inside the `#mentors` group, and any mentor can claim it by tapping the 🙋emoji reaction. Here's what it looks like:  
![mentor screenshot](http://i.imgur.com/UA6O2A4.png)  
4. Once a mentor claims the ticket, it's deleted from the mentor room. Then, the mentor and hacker are invited to a private chat to discuss the issue and hopefully meet up. That's it!

This has a couple advantages. It works accross phones and laptops, with nice notifications via push or email. It also requires no database (fewer dependencies!), relying solely on Slack to make it all happen. In the future, we might add a DB for metrics and such, but it's not required.

### Mentor Dashboard (dash)
Mentorbot works great if mentors pay close attention to the `#mentors` room and claim tickets quickly. But mentors are busy people and are often out-and-about, so we wanted a way to ping them with outstanding tickets that match their expertise. We devised all sorts of email or Private Message based notification systems, but we realized that Slack has a great system built-in: [highlight words](https://slack.zendesk.com/hc/en-us/articles/201398467-Highlight-word-notifications). If you look closely in the screenshot above, you'll see that "#javascript" is highlighted. Not only will this call attention to relevant tickets, it'll trigger a (easily-disabled) notification.

Why is there a # in front of javascript? Mentorbot automatically prepends it to any word in its tag database, so mentors can get notifications for tickets without getting spammed by discussions in other channels.

Mentors can easily add their own highlight words by going into their notification preferences. However, this led to a couple of problems. Firstly, we wanted an easy way to search for tags, add a bunch at once, and discover related tags - for instance, someone with expertise in "angular" would also probably want to listen for "javascript." Secondly, we wanted an elegant solution to the "tag synonym problem." Tag synonyms are multiple tags that mean the exact same thing - take #javascript, #js, #.js, and #ecmascript. We needed "javascript" mentors to also get notified for "js" without having to manually add every single permutation.

So, we whipped up a quick web GUI for managing tags. Mentors simply sign in via Slack OAuth and add some tags (the tag database includes StackOverflow's top 1000 tags, which we felt was sufficient). It's mobile-friendly, and while pretty sparse, it's not too bad looking. Here's a screenshot:
![dashboard screenshot](http://i.imgur.com/cW9SIv2.png)

The backend automatically sets the mentor's highlight words, including all relevant synonyms. Just like Mentorbot, this needs no database, instead using Slack as its single source of truth.

# Get It Running
## Pre-Reqs
* Publicly-accessible webserver. If you wanna try it on your laptop, [ngrok](https://ngrok.com/) is amazing.
* `node` binary on that server.
* Admin account on your Slack instance.

## File structure
Here's how everyting is laid out. You don't need to know any of this to get it running, but if you need to monkey around in the source, it's good to know.  

File  | Purpose
------------- | -------------
`public/index.html`  | The mentor dashboard
`public/styles.css` | Styles for the dashboard (duh)
`public/bundle.js` | Compiled (babelified, browserified, uglified) version of `src/dash-client.js` that implements the dashboard
`package.json` | Lists all dependencies
`sample-config.js` | Sample config file. Move this to `config.js` once filled out
`index.js` | Main entry-point for the app. Run `node index.js` to fire up everything
`src/bot.js` | Code for mentorbot
`src/dash-client.js` | Code for the client-side mentor dashboard
`src/dash-server.js` | Server powering the dashbord
`src/slack.js` | Custom slack library
`src/tagmanager.js` | Handles all the indexing/searching of tags for dash-client
`src/tags.js` | List of all 1000 top StackOveflow tags, their synonyms, and their related tags

## Configuration
To configure everything for your specific Slack, follow the instructions inside `sample-config.js`. In no particular order, you're going to have to:
* Grab your own token
* Create a new Slack user and grab its token
* Create a slash command
* Create a new Slack OAuth app

Don't worry, it's all in that file. Once you're done, run `mv sample-config.js config.js`, since the code expects that filename. Note that `config.js` will be gitignored so you don't accidentally leak your secrets.

## Running
1. `cd` into the top-level folder (`slack-mentorship` if you cloned from github)  
2. `npm install`  
3. `npm run build` (this compiles the frontend javascript. Make sure to re-run this anytime you make changes)  
4. `node index.js`  
