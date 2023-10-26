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


// Class that defines an agency in a feed
class Agency
{
  // Constructor
  constructor(feed, props) {
    this._feed = feed;

    this.id = props.id;
    this.name = props.name;
    this.abbr = props.abbr;
    this.description = props.description;
    this.url = props.url;
  }
}


// Class that defines a modality in a feed
class Modality
{
  // Constructor
  constructor(feed, props) {
    this._feed = feed;

    this.id = props.id;
    this.name = props.name;
    this.nodeName = props.nodeName;
    this.abbr = props.abbr;
    this.description = props.description;
    this.url = props.url;
    this.icon = props.icon;
  }
}


// Class that defines a node in a feed
class Node
{
  // Constructor
  constructor(feed, props) {
    this._feed = feed;

    this.id = props.id;
    this.name = props.name;
    this.code = props.code;
    this.url = props.url;
    this.modality = props.modality;
    this.modalityNodeName = props.modalityNodeName ?? this.modality?.nodeName;
    this.icon = props.icon ?? this.modality?.icon ?? 'location-dot';
    this.location = props.location;
  }

  // Return the transfers that include the node
  get transfers() {
    return this._feed.getTransfersIncludingNode(this);
  }

  // Return the transfers that include the node exluding separate transfers
  get transfersExcludingSeparate() {
    return this._feed.getTransfersIncludingNode(this, true);
  }

  // Return the routes that have a stop at the node
  get routes() {
    return this._feed.getRoutesWithStopAtNode(this);
  }

  // Return the routes that have a stop at the node exclding non halting stops
  get routesExcludingNonHalts() {
    return this._feed.getRoutesWithStopAtNode(this, true);
  }

  // Return the notifications that affect the node
  get notifications() {
    return this._feed.getNotificationsThatAffectNode(this);
  }


  // Return the description of the node
  get description() {
    let parts = [];
    if (this.modalityNodeName !== undefined)
      parts.push(this.modalityNodeName);
    if (this.location !== undefined)
      parts.push(this.location);
    parts.push(this.id);
    return parts.join(' &middot; ');
  }

  // Return the short display as an element or HTML
  get shortDisplayElement() {
    return $('<span class="icon-text">')
      .data('id', this.id)
      .append($('<span class="icon">').html(`<i class="fas fa-fw fa-${this.icon}"></i>`))
      .append($('<span>').html(this.name));
  }
  get shortDisplayHtml() {
    return this.shortDisplayElement.prop('outerHTML');
  }

  // Return the short dsplay link as an element or HTML
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


// Class that defines a transfer in a feed
class Transfer
{
  // Constructor
  constructor(feed, props) {
    this._feed = feed;

    this.id = props.id;
    this.between = props.between;
    this.and = props.and;
    this.time = props.time;
    this.initialTime = props.initialTime ?? 0;

    // Calculate the cumulative time of the transfer
    this.cumulativeTime = this.initialTime + this.time;
  }

  // Copy the transfer
  copy(modifiedProps = {}) {
    return new Transfer(this._feed, {...this, modifiedProps});
  }

  // Apply an initial time to the transfer
  withInitialTime(initialTime) {
    return this.copy({initialTime});
  }
}


// Class that defines a route in a feed
class Route
{
  // Constructor
  constructor(feed, props) {
    this._feed = feed;

    this.id = props.id;
    this.name = props.name;
    this.abbr = props.abbr;
    this.url = props.url;
    this.agency = props.agency;
    this.modality = props.modality;
    this.modalityName = props.modalityName ?? this.modality?.name;
    this.icon = props.icon ?? this.modality?.icon;
    this.headsign = props.headsign;
    this.color = {background: '#ffffff', text: '#000000', ...props.color};
    this.stops = props.stops.map(s => s.copy());
    this.initialTime = props.initialTime ?? 0;

    // Calculate cumulative time for the stops of the route
    for (let [index, stop] of this.stops.entries())
    {
      // Set the last flag of the last stop
      stop.last = index === this.stops.legnth - 1;

      // Set the time of the first stop
      stop.time = index > 0 ? stop.time : 0;

      // Calculate cumulative time for the stop
      stop.cumulativeTime = index > 0 ? this.stops[index - 1].cumulativeTime + stop.time : this.initialTime + stop.time;
    }
  }

  // Return the notifications that affect the route
  get notifications() {
    return this._feed.getNotificationsThatAffectRoute(this);
  }

  // Return the stop of the route that halts at the specified node
  getStopAtNode(node, excludeNonHalts = false) {
    return this.stops.find(s => s.node.id === node.id && (!excludeNonHalts || s.halts));
  }

  // Return the index of the stop of the route that halts at the specified node
  getStopIndexAtNode(node, excludeNonHalts = false) {
    return this.stops.findIndex(s => s.node.id === node.id && (!excludeNonHalts || s.halts));
  }

  // Copy the route
  copy(modifiedProps = {}) {
    return new Route(this._feed, {...this, ...modifiedProps});
  }

  // Slice the route to begin at the specified node
  sliceBeginningAtNode(node) {
    let index = this.getStopIndexAtNode(node);
    return index > -1 ? this.copy({stops: this.stops.slice(index)}) : this.copy();
  }

  // Slice the route to end at the specified node
  sliceEndingAtNode(node) {
    let index = this.getStopIndexAtNode(node);
    return index > -1 ? this.copy({stops: this.stops.slice(0, index)}) : this.copy();
  }

  // Apply an initial time to the route
  withInitialTime(initialTime) {
    return this.copy({initialTime});
  }


  // Return the short display as an element or HTML
  get shortDisplayElement() {
    return $('<span class="route">')
      .css({background: this.color.background, color: this.color.text})
      .html(this.abbr ?? this.name);
  }
  get shortDisplayHtml() {
    return this.shortDisplayElement.prop('outerHTML');
  }

  // Return the long display as an element or HTML
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

  // Return the short dsplay link as an element or HTML
  get shortDisplayLinkElement() {
    return $('<a class="is-plain" data-navigo>')
      .attr('href', `/dienstregeling/${this.id}`)
      .append(this.shortDisplayElement);
  }
  get shortDisplayLinkHtml() {
    return this.shortDisplayLinkElement.prop('outerHTML');
  }

  // Return the long dsplay link as an element or HTML
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
  constructor(feed, props) {
    this._feed = feed;

    this.sequence = parseInt(props.sequence);
    this.node = props.node;
    this.time = props.time ?? 0;
    this.halts = props.halts ?? true;
    this.cancelled = props.cancelled ?? false;
    this.platform = props.platform || undefined;
  }

  // Copy the stop
  copy(modifiedProps = {}) {
    return new RouteStop(this._feed, {...this, modifiedProps});
  }
}

// Class that defines a notification in a feed
class Notification
{
  // Constructor
  constructor(feed, props) {
    this._feed = feed;

    this.type = _notificationTypes[props.type];
    this.name = props.name ?? this.type?.name;
    this.description = props.description;
    this.period = props.period;
    this.affectedNodes = props.affectedNodes ?? [];
    this.affectedRoutes = props.affectedRoutes ?? [];
    this.icon = props.icon ?? this.type?.icon ?? 'circle-info';
    this.color = props.color ?? this.type?.color ?? 'info';
  }

  // Return if the notification has affected nodes
  get hasAffectedNodes() {
    return this.affectedNodes.length > 0;
  }

  // Return if the notification affects the specified node
  affectsNode(node) {
    return this.affectedNodes.find(n => n.id === node.id) !== undefined;
  }

  // Return if the notification has affected routes
  get hasAffectedRoutes() {
    return this.affectedRoutes.length > 0;
  }

  // Return if the notification affects the specified route
  affectsRoute(route) {
    return this.affectedRoutes.find(r => r.id === route.id) !== undefined;
  }
}

// Class that defines a feed
class Feed
{
  // Constructor
  constructor(props = {}) {
    this._agencies = this._loadAgencies();
    this._modalities = this._loadModalities();
    this._nodes = this._loadNodes();
    this._transfers = this._loadTransfers();
    this._routes = this._loadRoutes();
    this._notifications = this._loadNotifications();

    this.nodesIndex = new MiniSearch({fields: ['name', 'location', 'code'], storeFields: ['type'], searchOptions: {prefix: true, fuzzy: 0.1, combineWith: 'AND', boost: {name: 2}, boostDocument: this._boostNodeDocument}});
    this.nodesIndex.addAll(Object.values(this.nodes));
  }

  // Return the agencies in the feed
  get agencies() {
    return Object.values(this._agencies);
  }

  // Return the agency with the specified id in the feed
  getAgency(id) {
    let agency = this._agencies[id];
    if (agency === undefined)
      console.warn(`Could not find agency with id '${id}'`);
    return agency;
  }

  // Return the modalities in the feed
  get modalities() {
    return Object.values(this._modalities);
  }

  // Return the modality with the specified id in the feed
  getModality(id) {
    if (id === undefined)
      return undefined;

    let modality = this._modalities[id];
    if (modality === undefined)
      console.warn(`Could not find modality with id '${id}'`);
    return modality;
  }

  // Return the nodes in the feed
  get nodes() {
    return Object.values(this._nodes);
  }

  // Return the node with the specified id in the feed
  getNode(id) {
    if (id === undefined)
      return undefined;

    let node =  this._nodes[id];
    if (node === undefined)
      console.warn(`Could not find node with id '${id}'`);
    return node;
  }

  // Return the nodes that match the search query in the feed
  searchNodes(query) {
    return this._nodesIndex.search(query);
  }

  // Return the transfers in the feed
  get transfers() {
    return Object.values(this._transfers);
  }

  // Return the transfer with the specified id in the feed
  getTransfer(id) {
    if (id === undefined)
      return undefined;

    let transfer = this._transfers[id];
    if (transfer === undefined)
      console.warn(`Could not find transfer with id '${id}'`);
    return transfer;
  }

  // Return the transfers that include the specified node in the feed
  getTransfersIncludingNode(node, excludeSeparate = false) {
    return this.transfers.filter(transfer => (transfer.between.id === node.id || transfer.and.id === node.id) && (!excludeSeparate || !transfer.separate));
  }

  // Return the transfers between the specified nodes in the feed
  getTransferBetweenNodes(between, and, excludeSeparate = false) {
    return this.transfers.filter(transfer => ((transfer.between.id === between.id && transfer.and.id === and.id) || (transfer.between.id === and.id && transfer.and.id === between.id)) && (!excludeSeparate || !transfer.separate)).shift();
  }

  // Return the routes in the feed
  get routes() {
    return Object.values(this._routes);
  }

  // Return the route with the specified id in the feed
  getRoute(id) {
    if (id === undefined)
      return undefined;

    let route = this._routes[id];
    if (route === undefined)
      console.warn(`Could not find route with id '${id}'`);
    return route;
  }

  // Return the routes that have a stop at the specified node in the feed
  getRoutesWithStopAtNode(node, excludeNonHalts = false) {
    return this.routes.filter(route => route.getStopAtNode(node) !== undefined);
  }

  // Return the notifications in the feed
  get notifications() {
    return Object.values(this._notifications);
  }

  // Return the notification with the specified id in the feed
  getNotification(id) {
    if (id === undefined)
      return undefined;

    let notification = this._notifications[id];
    if (notification === undefined)
      console.warn(`Could not find notification with id '${id}'`);
    return notification;
  }

  // Return the notifications that affect the specified node in the feed
  getNotificationsThatAffectNode(node) {
    return this.notifications.filter(notification => notification.affectsNode(node));
  }

  // Return the notifications that affect the specified route in the feed
  getNotificationsThatAffectRoute(route) {
    return this.notifications.filter(notification => notification.affectsRoute(route));
  }


  // Parse
  _parseAgency(agency, id) {
    return new Agency(this, {id, ...agency});
  }

  // Parse a modality from an object
  _parseModality(modality, id) {
    return new Modality(this, {id, ...modality});
  }

  // Parse a node from an object
  _parseNode(node, id) {
    node.modality = this.getModality(node.modality);
    return new Node(this, {id, ...node});
  }

  // Parse a transfer from an object
  _parseTransfer(transfer, id) {
    transfer.between = this.getNode(transfer.between);
    transfer.and = this.getNode(transfer.and);
    return new Transfer(this, {id, ...transfer});
  }

  // Parse a route from an object
  _parseRoute(route, id) {
    route.agency = this.getAgency(route.agency);
    route.modality = this.getModality(route.modality);
    route.stops = Object.values(_.mapObject(route.stops, this._parseRouteStop.bind(this))).toSorted((a, b) => a.sequence - b.sequence);
    return new Route(this, {id, ...route});
  }

  // Parse a route stop from an object
  _parseRouteStop(stop, sequence, route) {
    stop.node = this.getNode(stop.node);
    return new RouteStop(this, {sequence, ...stop});
  }

  // Parse a notification from an object
  _parseNotification(notification, id) {
    notification.affectedNodes = notification.affectedNodes?.map(n => this.getNode(n)) ?? [];
    notification.affectedRoutes = notification.affectedRoutes?.map(r => this.getRoute(r)) ?? [];
    return new Notification(this, {id, ...notification})
  }


  // Load the agencies from the data file
  _loadAgencies() {
    return _.mapObject(toml.parse(fs.readFileSync('src/data/agencies.toml', 'utf-8')), this._parseAgency.bind(this));
  }

  // Load the modalities from the data file
  _loadModalities() {
    return _.mapObject(toml.parse(fs.readFileSync('src/data/modalities.toml', 'utf-8')), this._parseModality.bind(this));
  }

  // Load the nodes from the data file
  _loadNodes() {
    return _.mapObject(toml.parse(fs.readFileSync('src/data/nodes.toml', 'utf-8')), this._parseNode.bind(this));
  }

  // Load the transfers
  _loadTransfers() {
    return _.mapObject(toml.parse(fs.readFileSync('src/data/transfers.toml', 'utf-8')), this._parseTransfer.bind(this));
  }

  // Load the routes from the data file
  _loadRoutes() {
    return _.mapObject(toml.parse(fs.readFileSync('src/data/routes.toml', 'utf-8')), this._parseRoute.bind(this));
  }

  // Load the nodes from the data file
  _loadNotifications() {
    return _.mapObject(toml.parse(fs.readFileSync('src/data/notifications.toml', 'utf-8')), this._parseNotification.bind(this));
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
module.exports.Transfer = Transfer;
module.exports.Route = Route;
module.exports.RouteStop = RouteStop;
module.exports.Notification = Notification;
module.exports.Feed = Feed;
