import React from "react/addons";
import TagManager from "./tagmanager"

var manager = new TagManager();

class Tab extends React.Component {
  render() {
    return (
      <div id={this.props.id} className="col s12">{this.props.children}</div>
    )
  }
}

class Tabs extends React.Component {
  render() {
    var tabHeaders = React.Children.map(this.props.children, c => {
      return (
        <li className="tab col s3"><a href={`#${c.props.id}`}>{c.props.title}</a></li>
      );
    });
    return (
      <div className="row">
        <div className="col s12">
          <ul className="tabs" ref="container">
            {tabHeaders}
          </ul>
        </div>
        {this.props.children}
      </div>
    )
  }

  componentDidMount() {
    $(this.refs.container.getDOMNode()).tabs();
  }
}

class SearchList extends React.Component {
  constructor(props) {
    super();
    if (props.suggestions) {
      this.state = {items: manager.related()}
    } else {
      this.state = {};
    }
    this.renderCells = this.renderCells.bind(this);
    this.hintCell = this.hintCell.bind(this);
  }

  componentDidMount() {
    manager.on("change", () => {
      if (this.props.suggestions) {
        this.setState({items: manager.related()});
      } else {
        this.forceUpdate();
      }
    });
  }

  renderCells() {
    var renderItem = (tag) => {
      var addTag = (e) => {
        e.stopPropagation();
        manager.add(tag);
      };
      return (
        <li onClick={addTag} key={tag.name + "-yodawg"} className={"collection-item" + (tag.related ? "" : " custom-tag")}>
          <div>
            {tag.name}
            <a onClick={addTag} className="secondary-content"><i className="material-icons">add</i></a>
          </div>
        </li>
      )
    }
    var items = this.props.suggestions ? this.state.items : manager.search(this.props.searchText);
    return items.map(renderItem);
  }

  hintCell() {
    return (
      <li key="suggest-hint" className="collection-item">
        <div>
          Go add some tags and come back!
        </div>
      </li>
    )
  }

  render() {
    var empty = this.props.suggestions && !manager.related().length;
    var rendered = empty ? this.hintCell() : this.renderCells();

    return (
      <ul className="collection">
        {rendered}
      </ul>
    );
  }
}

class ChosenList extends React.Component {
  constructor() {
    super();
    this.state = {items: [], loading: true}
    this.renderCells = this.renderCells.bind(this);
    this.hintCell = this.hintCell.bind(this);
  }

  componentWillMount() {
    manager.fetchChosen().then(x => this.setState({loading: false})).done();
  }

  renderCells() {
    var renderSuggestion = (tag, parent) => {
      var addSuggestion = (e) => {
        e.stopPropagation();
        setTimeout(() => manager.add(tag, parent), 100);
      }
      return (
        <a key={tag.name + "-suggestion"} className="waves-effect waves-teal btn-flat" onClick={addSuggestion}>
          {tag.name}
        </a>
      );
    };
    var renderItem = (tag) => {
      var deleteTag = (e) => {
        e.stopPropagation();
        e.preventDefault();
        manager.remove(tag);
      }

       var suggestions = manager.relatedToTag(tag, 7)
       .map(s => renderSuggestion(s, tag));
       return (
         <li key={tag.name + "-item"}>
           <div className={"collapsible-header" + (tag.related.length > 0 ? "" : " custom-tag")}>
             {tag.name}
             <a onClick={deleteTag}><i onClick={deleteTag} className="material-icons right-icon secondary-content">delete</i></a>
           </div>
           <div className="collapsible-body">
             {suggestions}
           </div>
         </li>
      );
    }
    return this.state.items.map(renderItem);
  }

  hintCell() {
    var text = this.state.loading ? "Loading..." : <span>Click the big red <b>+</b> to add tags!</span>;
    return (
      <li key="add-hint">
        <div className="collapsible-header">
          {text}
        </div>
      </li>
    );
  }

  accordionize() {
    if (!this.refs.container) return;
    $(this.refs.container.getDOMNode()).collapsible({accordion: false});
  }

  componentDidMount() {
    this.accordionize();
    manager.on("change", () => {
      this.setState({items: manager.getChosen()}, () => {
        this.accordionize();
      });
    });
  }

  render() {
    var empty = !manager.getChosen().length;
    var rendered = empty ? this.hintCell() : this.renderCells();
    var suggestHint = (
      <li key="tap-hint">
        <div className="collapsible-header">
          Click any tag for suggestions!
        </div>
      </li>
    );
    return (
      <ul className="collapsible" ref="container">
        {rendered}
        {empty ? null : suggestHint}
      </ul>
    );
  }
}

class AddModal extends React.Component {
  constructor() {
    super();
    this.openModal = this.openModal.bind(this);
    this.searchChange = this.searchChange.bind(this);
    this.state = {searchText: ""};
  }

  openModal() {
    $(this.refs.modal.getDOMNode()).openModal({});
  }

  searchChange(e) {
    this.setState({searchText: e.target.value});
  }

  render() {
    var style = {bottom: 24, right: 24};
    return (
      <div>
        <div className="fixed-action-btn" style={style}>
          <a onClick={this.openModal} className="btn-floating btn-large waves-effect waves-light red">
            <i className="large material-icons">add</i>
          </a>
        </div>
        <div ref="modal" className="modal modal-fixed-footer bottom-sheet">
          <div className="modal-content">
            <SearchList suggestions={false} searchText={this.state.searchText} />
          </div>
          <div className="modal-footer" style={{overflow: "hidden"}}>
            <div className="row">
              <div id="yo" className="input-field col s10">
                <input placeholder="Tag Name"
                       id="query"
                       type="text"
                       value={this.state.searchText}
                       onChange={this.searchChange}/>
                <label htmlFor="query" className="active">Search</label>
              </div>
              <div className="col s2">
                <a className="modal-action modal-close waves-effect waves-green btn-flat">Done</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

class App extends React.Component {

  constructor() {
    super();
  }

  render() {
    return (
      <Tabs>
        <Tab title="Your Tags" id="yours">
          <ChosenList />
          <AddModal />
        </Tab>
        <Tab title="Suggested Tags" id="suggested">
          <SearchList suggestions={true} />
        </Tab>
      </Tabs>
    )
  }
}

React.render(<App />, document.getElementById("container"));
