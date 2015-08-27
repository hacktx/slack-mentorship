import {EventEmitter} from "events";
import Q from "q";
import tags from "./tags";

class TagManager extends EventEmitter {
  constructor() {
    super();
    this.tags = tags;
    this.chosen = [];
    this.index = {};
    this.customListeners = [];
    this.allSynonyms = [];
    this._populateRelated();
    this._populateAllSynonyms();
    this._buildIndex();
  }

  _populateRelated() {
    this.tags.forEach((tag) => {
      this.allSynonyms = this.allSynonyms.concat(tag.synonyms);
    });
  }

  _populateAllSynonyms() {
    this.tags.forEach((tag) => {
      for (var i = 0; i < tag.related.length; i++) {
        tag.related[i] = this.tags[[tag.related[i]]];
      }
    });
  }

  _buildIndex() {
    this.tags.forEach((t, i) => {
      this._insert(this.index, t.name, i);
      t.synonyms.forEach((syn) => {
        this._insert(this.index, syn, i);
      });
    });
  }

  _insert(trie, word, val) {
    var letters = word.split("");
    letters.forEach((l) => {
      if (!trie[l]) {
        trie[l] = {};
      }
      trie = trie[l];
    })
    trie._v = val;
  }

  _traverse(trie, word) {
    if (!trie) return null;
    if (word == "") return trie;
    var l = word[0];
    return this._traverse(trie[l], word.substring(1));
  }

  _suffixes(trie, soFar) {
    var res = [];
    for (var key in trie) {
      if (key == "_v") {
        res.push([soFar, trie[key]]);
      } else {
        res = res.concat(this._suffixes(trie[key], soFar + key))
      }
    }
    return res;
  }

  search(query, limit = 10) {
    if (!query) {
      return this.topTags().slice(0, limit);
    }
    var seen = {};
    query = query.toLowerCase().replace("#", "");
    var start = this._traverse(this.index, query);
    return this._suffixes(start, query)
    .filter((a) => {
      if (seen[a[1]]) return false;
      seen[a[1]] = true;
      return true;
    })
    .filter((a) => {
      return !this.tagIsChosen(this.tags[a[1]]);
    })
    .sort((a, b) => {
      var aTag = this.tags[a[1]];
      var bTag = this.tags[b[1]];
      if (aTag.name == query) {
        return -1;
      }
      if (bTag.name == query) {
        return 1;
      }
      return aTag.count < bTag.count ? 1 : -1;
    })
    .map(v => this.tags[v[1]])
    .slice(0, limit)
  }

  indexOfTag(tag) {
    for (var i = 0; i < this.chosen.length; i++) {
      if (this.chosen[i] === tag) return i;
    }
    return -1;
  }

  add(tag, after) {
    if (after && this.tagIsChosen(after)) {
      this.chosen.splice(this.indexOfTag(after) + 1, 0, tag);
    } else {
      this.chosen.unshift(tag);
    }
    this.save();
  }

  remove(tag) {
    var index = this.indexOfTag(tag);
    if (index === -1) return;
    this.chosen.splice(index, 1);
    this.save();
  }

  tagIsChosen(tag) {
    return this.indexOfTag(tag) !== -1;
  }

  getChosen(limit = 10) {
    return this.chosen;
  }

  topChosen() {
    return this.chosen.concat().sort((a, b) => {
      return a.count < b.count ? 1 : -1;
    })
  }

  topTags() {
    return this.tags.concat()
    .filter(t => !this.tagIsChosen(t))
  }

  related(perLimit = 3, limit = 100) {
    var seen = {};
    var results = [];
    this.topChosen().forEach((tag) => {
      tag.related
      .filter(r => !this.tagIsChosen(r))
      .slice(0, perLimit)
      .forEach((related) => {
        if (seen[related.name]) return;
        results.push(related);
        seen[related.name] = true;
      });
    });
    return results.slice(0, limit);
  }

  relatedToTag(tag, limit = 3) {
    return tag.related.filter(r => !this.tagIsChosen(r)).slice(0, limit);
  }

  tagWithName(name) {
    for (var i = 0; i < this.tags.length; i++) {
      if (this.tags[i].name === name) {
        return this.tags[i];
      }
    }
    return null;
  }

  fetchChosen() {
    return $.ajax({
      url: "/highlights",
      method: "GET"
    }).then(rawStr => {
      console.log("RAWSTR", rawStr);
      var components = rawStr.split(",");
      this.chosen = components
        .filter(s => s)
        .map(s => s.replace("#", ""))
        .map(s => this.tagWithName(s))
        .filter(s => s);

      this.customListeners = components.filter(s => {
        var stripped = s.replace("#", "");
        if (this.tagWithName(stripped)) return false;
        if (this.allSynonyms.indexOf(stripped) !== -1) return false;
        return true;
      });
      this.emit("change");
    })
  }

  save() {
    this.emit("change");
    var tags = this.customListeners.concat();
    this.chosen.forEach(t => {
      tags.push(`#${t.name}`);
      t.synonyms.forEach(s => tags.push(`#${s}`));
    });
    tags = tags.filter(t => {
      return t !== "" && t !== " ";
    });
    $.ajax({
      method: "POST",
      url: "/highlight",
      data: {highlights: tags.join(",")}
    })
    .done();
  }

}

export default TagManager
