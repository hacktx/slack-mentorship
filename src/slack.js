import WebSocket from "ws";
import Q from "q";
import co from "co";
import express from "express";
import bodyParser from "body-parser";
import requestretry from "requestretry";
import {EventEmitter} from "events";

class Slack extends EventEmitter {
  constructor(token, root, port) {
    super();
    this.token = token;
  }

  listenForCommands(root, port) {
    this.app = express();
    this.app.use(bodyParser.urlencoded({
      extended: true
    }));
    this.app.post(root + "/*", (req, res) => {
      this.emit("command", req.body, res);
    });
    this.app.listen(port);
  }

  startConnection() {
    this.slackApi("rtm.start").then((res) => {
      this.selfId = res.self.id;
      this.ws = new WebSocket(res.url);
      this.ws.on("message", this.onMessage.bind(this));
      this.ws.on("error", this.onError.bind(this));
      this.ws.on("close", this.onClose.bind(this));
    })
    .done();
  }

  onMessage(raw) {
    var m = JSON.parse(raw);
    this.emit("message", m);
  }

  onError(e) {
    throw e;
  }

  onClose() {
    throw new Error("Websocket connection to slack closed. TODO reconnection");
  }

  slackRequest(method, args) {
    return Q.Promise((resolve, reject) => {
      requestretry({
        url: `https://slack.com/api/${method}`,
        json: true,
        method: "POST",
        maxAttempts: 5,
        retryDelay: 0,
        retryStrategy: requestretry.RetryStrategies.HTTPOrNetworkError,
        form: args
      }, (err, response, body) => {
        if (err) {
          reject(err);
        } else {
          resolve(body);
        }
      });
    })
  }

  slackApi(method, args, okErrors) {
    okErrors = okErrors || [];
    args = args || {};
    args.token = args.token || this.token;
    return this.slackRequest(method, args).then((res) => {
      if (res.ok || okErrors.indexOf(res.error) !== -1) {
        return res;
      } else {
        throw new Error(res.error);
      }
    });
  }

  on(eventName, listener) {
    var wrapped = co.wrap(listener);
    super.on(eventName, function() {
      var that = this;
      var args = arguments;
      Q(wrapped.apply(that, arguments)).done();
    });
  }
}

export default Slack
