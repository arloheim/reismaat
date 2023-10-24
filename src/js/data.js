const $ = require('jquery');
const _ = require('underscore');
const fs = require('fs');
const toml = require('toml');

const MiniSearch = require('minisearch');


// Map of the defined notification types
const _notificationTypes = {
  disruption: {icon: 'triangle-exclamation', color: 'danger', name: "Storing"},
  construction: {icon: 'road-barrier', color: 'warning', name: "Werkzaamheden"},
};


// Class that defines an agency
class Agency
{
  // Constructor
  constructor(data, props) {
    this._data = data;

    this.id = props.id;
    this.name = props.name;
    this.abbr = props.abbr ?? undefined;
    this.url = props.url ?? undefined;
  }
}

// Class that defines a modality
class Modality
{
  // Constructor
  constructor(data, props) {
    this._data = data;

    this.id = props.id;
    this.name = props.name ?? undefined;
    this.nodeName = props.node_name ?? undefined;
    this.icon = props.icon;
  }
}

// Class that defines a node
class Node
{
  // Constructor
  constructor(data, props) {
    this._data = data;

    this.id = props.id;
    this.name = props.name;
    this.code = props.code ?? undefined;
    this.url = props.url ?? undefined;
    this.modalityId = props.modality;
    this.modalityNodeName = props.modalityNodeName ?? this.modality?.nodeName ?? undefined;
    this.icon = props.icon ?? this.modality?.icon ?? 'location-dot';
    this.location = props.location ?? undefined;
  }

  // Get the modality of the node
  get modality() {
    return this._data.modalities[this.modalityId] ?? null;
  }

  // Get the description of the node
  get description() {
    let parts = [];
    if (this.modalityNodeName !== undefined)
      parts.push(this.modalityNodeName);
    if (this.location !== undefined)
      parts.push(this.location);
    parts.push(this.id);
    return parts.join(' &middot; ');
  }

  // Get the short display as an element or HTML
  get shortDisplayElement() {
    return $('<span class="icon-text">')
      .data('id', this.id)
      .append($('<span class="icon">').html(`<i class="fas fa-fw fa-${this.icon}"></i>`))
      .append($('<span>').html(this.name));
  }
  get shortDisplayHtml() {
    return this.shortDisplayElement.prop('outerHTML');
  }

  // Get the short dsplay link as an element or HTML
  get shortDisplayLinkElement() {
    return $('<a class="is-plain" data-navigo>')
      .attr('href', `/stations/${this.id}`)
      .append(this.shortDisplayElement);
  }
  get shortDisplayLinkHtml() {
    return this.shortDisplayLinkElement.prop('outerHTML');
  }

  // Return HTML for rendering a dropdown item
  renderDropdownItem() {
    return $('<a class="dropdown-item">')
      .data('id', this.id)
      .append($('<div class="icon is-medium mr-2">')
        .append($('<i class="fas fa-fw fa-xl">').addClass(`fa-${this.icon}`)))
      .append($('<div class="is-flex is-flex-direction-column">')
        .append($('<span>').html(this.name))
        .append($('<span class="is-size-7 has-text-grey">').html(this.description)));
  }
}

// Class that defines a route
class Route
{
  // Constructor
  constructor(data, props) {
    this._data = data;

    this.id = props.id;
    this.name = props.name;
    this.abbr = props.abbr ?? undefined;
    this.url = props.url ?? undefined;
    this.agencyId = props.agency ?? undefined;
    this.modalityId = props.modality;
    this.modalityName = props.modalityName ?? this.modality?.name ?? undefined;
    this.icon = props.icon ?? this.modality.icon;
    this.headsign = props.headsign ?? undefined;
    this.color = {background: '#ffffff', text: '#000000', ...props.color};
    this.stops = _.values(_.mapObject(props.stops ?? {}, (s, sequence) => (new RouteStop(this._data, this, {sequence, ...s})))).toSorted((a, b) => a.sequence - b.sequence);
  }

  // Get the agency of the route
  get agency() {
    return this._data.agencies[this.agencyId] ?? undefined;
  }

  // Get the modality of the node
  get modality() {
    return this._data.modalities[this.modalityId] ?? undefined;
  }

  // Get the short display as an element or HTML
  get shortDisplayElement() {
    return $('<span class="route">')
      .css({background: this.color.background, color: this.color.text})
      .html(this.abbr ?? this.name);
  }
  get shortDisplayHtml() {
    return this.shortDisplayElement.prop('outerHTML');
  }

  // Get the long display as an element or HTML
  get longDisplayElement() {
    return $('<span class="icon-text">')
      .append($('<span class="icon">').html(`<i class="fas fa-fw fa-${this.icon}"></i>`))
      .append($('<span>')
        .append($('<span class="route">')
          .css({background: this.color.background, color: this.color.text})
          .html(this.abbr ?? this.name))
        .append($('<span>').html(` ⟶ ${this.headsign}`)));
  }
  get longDisplayHtml() {
    return this.longDisplayElement.prop('outerHTML');
  }

  // Get the short dsplay link as an element or HTML
  get shortDisplayLinkElement() {
    return $('<a class="is-plain" data-navigo>')
      .attr('href', `/dienstregeling/${this.id}`)
      .append(this.shortDisplayElement);
  }
  get shortDisplayLinkHtml() {
    return this.shortDisplayLinkElement.prop('outerHTML');
  }

  // Get the long dsplay link as an element or HTML
  get longDisplayLinkElement() {
    return $('<a class="is-plain" data-navigo>')
      .attr('href', `/dienstregeling/${this.id}`)
      .append(this.longDisplayElement);
  }
  get longDisplayLinkHtml() {
    return this.longDisplayLinkElement.prop('outerHTML');
  }
}

// Class that defines a stop in a route
class RouteStop
{
  // Constructor
  constructor(data, route, props) {
    this._data = data;
    this._route = route;

    this.sequence = parseInt(props.sequence);
    this.nodeId = props.node;
    this.time = props.time;
    this.halts = props.halts ?? true;
    this.cancelled = props.cancelled ?? false;
    this.platform = props.platform ?? undefined;
  }

  // Get the node of the stop
  get node() {
    return this._data.nodes[this.nodeId] ?? undefined;
  }
}

// Class that defines a notification
class Notification
{
  // Constructor
  constructor(data, props) {
    this._data = data;

    this.type = _notificationTypes[props.type] ?? _notificationTypes.disruption;
    this.name = props.name ?? this.type.name ?? null;
    this.description = props.description ?? null;
    this.period = props.period ?? null;
    this.affectedNodesIds = props.affected_nodes ?? [];
    this.affectedRoutesIds = props.affected_routes ?? [];
    this.icon = props.icon ?? _notificationTypes[this.type]?.icon ?? 'triangle-exclamation';
    this.color = props.color ?? this.type.color ?? 'danger';
  }

  // Get the affected nodes of the notification
  get affectedNodes() {
    return this.affectedNodesIds.map(id => this._data.nodes[id] ?? null).filter(n => n !== null);
  }

  // Get if the notification has affected nodes
  get hasAffectedNodes() {
    return this.affectedNodesIds.length > 0;
  }

  // Get the affected routes of the notification
  get affectedRoutes() {
    return this.affectedRoutesIds.map(id => this._data.routes[id] ?? null).filter(r => r !== null);
  }

  // Get if the notification has affected routes
  get hasAffectedRoutes() {
    return this.affectedRoutesIds.length > 0;
  }
}

// Class for data
class Data
{
  // Constructor
  constructor(options = {}) {
    this.options = {
      searchOptions: {prefix: true, fuzzy: 0.1, combineWith: 'AND'},
      ...options
    };

    this._agencies = undefined;
    this._nodes = undefined;
    this._routes = undefined;
    this._notifications = undefined;

    this.nodesIndex = new MiniSearch({fields: ['name', 'location', 'code'], storeFields: ['type'], searchOptions: {...this.options.searchOptions, boost: {name: 2}, boostDocument: this._boostNodeDocument}});
    this.nodesIndex.addAll(Object.values(this.nodes));
  }

  // Get the agencies or load them if they're not loaded yet
  get agencies() {
    if (this._agencies === undefined)
      return this._agencies = this._loadAgencies();
    else
      return this._agencies;
  }

  // Get the modalities or load them if they're not loaded yet
  get modalities() {
    if (this._modalities === undefined)
      return this._modalities = this._loadModalities();
    else
      return this._modalities;
  }

  // Get the nodes or load them if they're not loaded yet
  get nodes() {
    if (this._nodes === undefined)
      return this._nodes = this._loadNodes();
    else
      return this._nodes;
  }

  // Get the routes or load them if they're not loaded yet
  get routes() {
    if (this._routes === undefined)
      return this._routes = this._loadRoutes();
    else
      return this._routes;
  }

  // Get the notifications or load them if they're not loaded yet
  get notifications() {
    if (this._notifications === undefined)
      return this._notifications = this._loadNotifications();
    else
      return this._notifications;
  }


  // Load the agencies from the data file
  _loadAgencies() {
    return _.mapObject(toml.parse(fs.readFileSync('src/data/agencies.toml', 'utf-8')), (a, id) => (new Agency(this, {id, ...a})));
  }

  // Load the modalities from the data file
  _loadModalities() {
    return _.mapObject(toml.parse(fs.readFileSync('src/data/modalities.toml', 'utf-8')), (m, id) => (new Modality(this, {id, ...m})))
  }

  // Load the nodes from the data file
  _loadNodes() {
    return _.mapObject(toml.parse(fs.readFileSync('src/data/nodes.toml', 'utf-8')), (n, id) => (new Node(this, {id, ...n})))
  }

  // Load the routes from the data file
  _loadRoutes() {
    return _.mapObject(toml.parse(fs.readFileSync('src/data/routes.toml', 'utf-8')), (r, id) => (new Route(this, {id, ...r}, this.agencies, this.nodes)));
  }

  // Load the nodes from the data file
  _loadNotifications() {
    return _.mapObject(toml.parse(fs.readFileSync('src/data/notifications.toml', 'utf-8')), (n, id) => (new Notification(this, {id, ...n})))
  }


  // Search for nodes
  searchNodes(query) {
    return this.nodesIndex.search(query);
  }

  _boostNodeDocument(id, term, storedFields) {
    let types = Object.keys(modalities);
    let typeIndex = types.indexOf(storedFields.type);
    if (typeIndex === -1)
      return 1;
    else
      return 0.7 + (types.length - typeIndex) / types.length * 0.3;
  }
}


// Define the exports
module.exports.Agency = Agency;
module.exports.Node = Node;
module.exports.Route = Route;
module.exports.RouteStop = RouteStop;
module.exports.Data = Data;
