const $ = require('jquery');
const _ = require('underscore');
const fs = require('fs');
const toml = require('toml');

const MiniSearch = require('minisearch');


// Object that contains the available files
const _files = {
  'agencies': fs.readFileSync('src/data/agencies.toml', 'utf-8'),
  'modalities': fs.readFileSync('src/data/modalities.toml', 'utf-8'),
  'nodes': fs.readFileSync('src/data/nodes.toml', 'utf-8'),
  'notifications': fs.readFileSync('src/data/notifications.toml', 'utf-8'),
  'notifications_types': fs.readFileSync('src/data/notifications_types.toml', 'utf-8'),
  'routes': fs.readFileSync('src/data/routes.toml', 'utf-8'),
  'services': fs.readFileSync('src/data/services.toml', 'utf-8'),
  'services_types': fs.readFileSync('src/data/services_types.toml', 'utf-8'),
  'transfers': fs.readFileSync('src/data/transfers.toml', 'utf-8'),
};

// Function that returns HTML for an icon
function _iconToHTML(icon, classes) {
  if (icon === undefined)
    return null;

  let match = icon.match(/^(?:(fa[srb]|svg):)?(.*)$/);

  let type = match !== null && match[1] !== undefined ? match[1] : 'fas';
  let id = match !== null ? match[2] : icon;

  if (type === 'fas')
    return `<i class="fa-solid ${classes} fa-${id}"></i>`;
  else if (type === 'far')
    return `<i class="fa-regular ${classes} fa-${id}"></i>`;
  else if (type === 'fab')
    return `<i class="fa-brands ${classes} fa-${id}"></i>`;
  else if (type === 'svg')
    return `<img class="svg-icon ${classes}" src="/assets/images/icons/${id}.svg">`;
  else
    return null;
}


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
    this.icon = props.icon;
  }

  // Return the routes of the agency
  get routes() {
    return this._feed.getRoutesForAgency(this);
  }

  // Return the routes of the agency that are included in the overview
  get includedRoutes() {
    return this._feed.getIncludedRoutesForAgency(this);
  }

  // Return the routes of the agency, grouped by their modality
  get routesGroupedByModality() {
    return Object.entries(_.groupBy(this.routes, r => r.modality?.id)).map(([id, routes]) => ({modality: this._feed.getModality(id), routes: routes}));
  }

  // Return the routes of the agency that are included in the overview, grouped by their modality
  get includedRoutesGroupedByModality() {
    return Object.entries(_.groupBy(this.includedRoutes, r => r.modality?.id)).map(([id, routes]) => ({modality: this._feed.getModality(id), routes: routes}));
  }

  // Return HTML for the icon
  renderIcon() {
    return (classes) => _iconToHTML(this.icon, classes);
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
    this.icon = props.icon;
  }

  // Return HTML for the icon
  renderIcon() {
    return (classes) => _iconToHTML(this.icon, classes);
  }
}


// Class that defines a node in a feed
class Node
{
  // Constructor
  constructor(feed, props) {
    this._feed = feed;

    this.id = props.id;
    this.internalId = props.internalId;
    this.name = props.name;
    this.code = props.code;
    this.abbr = props.abbr;
    this.description = props.description;
    this.url = props.url;
    this.modality = props.modality;
    this.modalityNodeName = props.modalityNodeName ?? this.modality?.nodeName;
    this.icon = props.icon ?? this.modality?.icon ?? 'location-dot';
    this.city = props.city;
    this.include = props.include ?? true;
  }

  // Return the routes that have a stop at the node
  get routes() {
    return this._feed.getRoutesWithStopAtNode(this).map(r => ({route: r, stop: r.getStopAtNode(this)}));
  }

  // Return the routes that have a stop at the node exclding non halting stops
  get routesExcludingNonHalts() {
    return this._feed.getRoutesWithStopAtNode(this, true).map(r => ({route: r, stop: r.getStopAtNode(this)}));
  }

  // Return the transfers that include the node
  get transfers() {
    return this._feed.getTransfersIncludingNode(this);
  }

  // Return the direct transfers that include the node
  get directTransfers() {
    return this._feed.getTransfersIncludingNode(this, true);
  }

  // Return the transfer nodes of the node
  get transferNodes() {
    return this.transfers.map(t => ({transfer: t, node: t.getOppositeNode(this)}));
  }

  // Return the transfer nodes exluding separate transfers of the node
  get directTransferNodes() {
    return this.directTransfers.map(t => ({transfer: t, node: t.getOppositeNode(this)}));
  }

  // Return the notifications that affect the node
  get notifications() {
    return this._feed.getNotificationsThatAffectNode(this);
  }

  // Return the services for the node
  get services() {
    return this._feed.getServicesForNode(this);
  }

  // Return the subtitle of the node
  get subtitle() {
    let parts = [];
    if (this.modalityNodeName !== undefined)
      parts.push(this.modalityNodeName);
    if (this.city !== undefined)
      parts.push(this.city);
    return parts.join(' &middot; ');
  }

  // Return HTML for the icon
  renderIcon() {
    return (classes) => _iconToHTML(this.icon, classes);
  }

  // Return HTML for rendering a dropdown item
  renderDropdownItem() {
    return $('<a class="dropdown-item">')
      .data('id', this.id)
      .append($('<div class="icon is-medium mr-2">')
        .append($('<i class="fas fa-fw fa-xl">').addClass(`fa-${this.icon}`)))
      .append($('<div class="is-flex is-flex-direction-column">')
        .append($('<span>').html(this.name))
        .append($('<span class="is-size-7 has-text-grey">').html(this.subtitle)));
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
    this.description = props.description;
    this.url = props.url;
    this.agency = props.agency;
    this.modality = props.modality;
    this.modalityName = props.modalityName ?? this.modality?.name;
    this.icon = props.icon ?? this.modality?.icon;
    this.headsign = props.headsign;
    this.color = {background: '#ffffff', text: '#000000', ...props.color};
    this.include = props.include ?? true;
    this.stops = props.stops.map(s => s._copy());

    this.initialTime = props.initialTime ?? 0;

    // Calculate cumulative time for the stops of the route
    let lastHeadsign = this.headsign;
    for (let [index, stop] of this.stops.entries())
    {
      // Set the headsign of the stop
      if (stop.headsign !== undefined)
        lastHeadsign = stop.headsign;
      else
        stop.headsign = lastHeadsign;

      // Set the last flag of the last stop
      stop.last = index === this.stops.length - 1;

      // Set the time of the first stop
      stop.time = index > 0 ? stop.time : 0;

      // Calculate cumulative time for the stop
      stop.cumulativeTime = index > 0 ? this.stops[index - 1].cumulativeTime + stop.time : this.initialTime + stop.time;
    }
  }

  // Return the first stop of the route
  get firstStop() {
    return this.stops.at(0);
  }

  // Return the last stop of the route
  get lastStop() {
    return this.stops.at(-1);
  }

  // Return the intermediate stops of the route
  get intermediateStops() {
    return this.stops.slice(1, -1);
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

  // Return HTML for the icon
  renderIcon() {
    return (classes) => _iconToHTML(this.icon, classes);
  }


  // Copy the route
  _copy(modifiedProps = {}) {
    return new Route(this._feed, {...this, ...modifiedProps});
  }

  // Slice the route to begin at the specified node
  _sliceBeginningAtNode(node) {
    let index = this.getStopIndexAtNode(node);
    return index > -1 ? this._copy({stops: this.stops.slice(index)}) : this._copy();
  }

  // Slice the route to end at the specified node
  _sliceEndingAtNode(node) {
    let index = this.getStopIndexAtNode(node);
    return index > -1 ? this._copy({stops: this.stops.slice(0, index + 1)}) : this._copy();
  }

  // Apply an initial time to the route
  _withInitialTime(initialTime) {
    return this._copy({initialTime});
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
    this.platform = props.platform || undefined;
    this.headsign = props.headsign;
    this.alightDirection = props.alightDirection;
    this.status = props.status;

    this.last = false;
    this.formattedTime = undefined;
  }

  // Return if the alight direction of the stop is on the left side
  get alightLeft() {
    return this.alightDirection !== undefined ? this.alightDirection === 'left' : undefined;;
  }

  // Return if the alight direction of the stop is on the right side
  get alightRight() {
    return this.alightDirection !== undefined ? this.alightDirection === 'right' : undefined;;
  }

  // Return if the stop is cancelled
  get cancelled() {
    return this.status === 'cancelled';
  }

  // Return if the stop is an extra stop
  get additional() {
    return this.status === 'additional';
  }


  // Copy the stop
  _copy(modifiedProps = {}) {
    return new RouteStop(this._feed, {...this, modifiedProps});
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
    this.direct = props.direct ?? true;
    this.icon = props.icon ?? 'person-walking';

    this.initialTime = props.initialTime ?? 0;
    this.cumulativeTime = this.initialTime + this.time;
    this.formattedTime = undefined;
  }

  // Get the opposite node of the speficied node in the transfer
  getOppositeNode(node) {
    if (this.between.id === node.id)
      return this.and;
    else if (this.and.id === node.id)
      return this.between;
    else
      return undefined;
  }

  // Return HTML for the icon
  renderIcon() {
    return (classes) => _iconToHTML(this.icon, classes);
  }


  // Copy the transfer
  _copy(modifiedProps = {}) {
    return new Transfer(this._feed, {...this, ...modifiedProps});
  }

  // Align the transfer to the specified node
  _alignToNode(node) {
    if (this.between.id === node.id)
      return this._copy();
    else if (this.and.id === node.id)
      return this._copy({between: this.and, and: this.between});
    else
      return undefined;
  }

  // Align the transfer to the opposite node of the specified node
  _alignToOppositeNode(node) {
    return this._alignToNode(this.getOppositeNode(node));
  }

  // Apply an initial time to the transfer
  _withInitialTime(initialTime) {
    return this._copy({initialTime});
  }
}


// Class that defines the type of a service in a feed
class ServiceType
{
  // Constructor
  constructor(feed, props) {
    this._feed = feed;

    this.name = props.name;
    this.icon = props.icon;
    this.color = props.color;
    this.agency = props.agency;
  }

  // Return HTML for the icon
  renderIcon() {
    return (classes) => _iconToHTML(this.icon, classes);
  }
}


// Class that defines a service in a feed
class Service
{
  // Constructor
  constructor(feed, props) {
    this._feed = feed;

    this.type = props.type;
    this.name = props.name ?? this.type?.name;
    this.icon = props.icon ?? this.type?.icon;
    this.color = props.color ?? this.type?.color;
  }

  // Return HTML for the icon
  renderIcon() {
    return (classes) => _iconToHTML(this.icon, classes);
  }
}


// Class that defines the type of a notification in a feed
class NotificationType
{
  // Constructor
  constructor(feed, props) {
    this._feed = feed;

    this.name = props.name;
    this.icon = props.icon;
    this.color = props.color;
    this.include = props.include ?? true;
    this.severe = props.severe ?? false;
  }
}


// Class that defines a notification in a feed
class Notification
{
  // Constructor
  constructor(feed, props) {
    this._feed = feed;

    this.type = props.type;
    this.typeName = props.typeName ?? this.type?.name;
    this.name = props.name ?? this.type?.name;
    this.description = props.description;
    this.period = props.period;
    this.affectedNodes = props.affectedNodes ?? [];
    this.affectedRoutes = props.affectedRoutes ?? [];
    this.icon = props.icon ?? this.type?.icon ?? 'circle-info';
    this.color = props.color ?? this.type?.color ?? 'info';
    this.include = props.include ?? this.type?.include ?? true;
    this.severe = props.severe ?? this.type?.severe ?? false;
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

  // Return HTML for the icon
  renderIcon() {
    return (classes) => _iconToHTML(this.icon, classes);
  }
}


// Class that defines a feed
class Feed
{
  // Constructor
  constructor(props = {}) {
    this._agencies = this._parseTomlFile('agencies', this._parseAgency);
    this._modalities = this._parseTomlFile('modalities', this._parseModality);
    this._nodes = this._parseTomlFile('nodes', this._parseNode);
    this._routes = this._parseTomlFile('routes', this._parseRoute);
    this._transfers = this._parseTomlFile('transfers', this._parseTransfer);
    this._serviceTypes = this._parseTomlFile('services_types', this._parseServiceType);
    this._services = this._parseTomlFile('services', this._parseServices);
    this._notificationTypes = this._parseTomlFile('notifications_types', this._parseNotificationType);
    this._notifications = this._parseTomlFile('notifications', this._parseNotification);

    this._nodesIndex = new MiniSearch({
      fields: ['name', 'city', 'code'],
      storeFields: ['modality'],
      searchOptions: {prefix: true, fuzzy: 0.1, combineWith: 'AND', boost: {name: 2}, boostDocument: this._boostNodeDocument.bind(this)}
    });
    this._nodesIndex.addAll(Object.values(this.nodes));
  }


  // Return the agencies in the feed
  get agencies() {
    return Object.values(this._agencies);
  }

  // Return the agencies that have routes in the feed
  get agenciesWithRoutes() {
    return this.agencies.filter(a => a.routes.length > 0);
  }

  // Return the agencies that have included routes in the feed
  get agenciesWithIncludedRoutes() {
    return this.agencies.filter(a => a.includedRoutes.length > 0);
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

  // Return the nodes that are included in the overview in the feed
  get includedNodes() {
    return this.nodes.filter(n => n.include);
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


  // Return the routes in the feed
  get routes() {
    return Object.values(this._routes);
  }

  // Return the routes that are included in the overview in the feed
  get includedRoutes() {
    return this.routes.filter(route => route.include);
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

  // Return the routes for the specified agency in the feed
  getRoutesForAgency(agency) {
    return this.routes.filter(route => route.agency.id === agency.id);
  }

  // Return the routes for the specified agency that are included in the overview in the feed
  getIncludedRoutesForAgency(agency) {
    return this.includedRoutes.filter(route => route.agency.id === agency.id);
  }

  // Return the routes that have a stop at the specified node in the feed
  getRoutesWithStopAtNode(node, excludeNonHalts = false) {
    return this.routes.filter(route => route.getStopAtNode(node, excludeNonHalts) !== undefined);
  }


  // Return the transfers in the feed
  get transfers() {
    return Object.values(this._transfers);
  }

  // Return the direct transfers in the feed
  get directTransfers() {
    return this.transfers.filter(transfer => transfer.direct);
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
  getTransfersIncludingNode(node) {
    return this.transfers.filter(transfer => (transfer.between.id === node.id || transfer.and.id === node.id));
  }

  // Return the direct transfers that include the specified node in the feed
  getDirectTransfersIncludingNode(node) {
    return this.directTransfers.filter(transfer => (transfer.between.id === node.id || transfer.and.id === node.id));
  }

  // Return the transfer between the specified nodes in the feed
  getTransferBetweenNodes(between, and) {
    return this.transfers.filter(transfer => ((transfer.between.id === between.id && transfer.and.id === and.id) || (transfer.between.id === and.id && transfer.and.id === between.id))).shift();
  }

  // Return the direct transfer between the specified nodes in the feed
  getDirectTransferBetweenNodes(between, and) {
    return this.directTransfers.filter(transfer => ((transfer.between.id === between.id && transfer.and.id === and.id) || (transfer.between.id === and.id && transfer.and.id === between.id))).shift();
  }


  // Return the notification types in the feed
  get notificationTypes() {
    return Object.values(this._notificationTypes);
  }

  // Return the notification type with the specified id in the feed
  getNotificationType(id) {
    if (id === undefined)
      return undefined;

    let notificationType = this._notificationTypes[id];
    if (notificationType === undefined)
      console.warn(`Could not find notification type with id '${id}'`);
    return notificationType;
  }


  // Return the service types in the feed
  get serviceTypes() {
    return Object.values(this._serviceTypes);
  }

  // Return the service type with the specified id in the feed
  getServiceType(id) {
    if (id === undefined)
      return undefined;

    let serviceType = this._serviceTypes[id];
    if (serviceType === undefined)
      console.warn(`Could not find service type with id '${id}'`);
    return serviceType;
  }


  // Return the services in the feed
  get services() {
    return Object.values(this._services);
  }

  // Return the service for the specified node in the feed
  getServicesForNode(node) {
    let services = this._services[node.id];
    if (services === undefined)
      console.warn(`Could not find services for node with id '${node.id}'`);
    return services;
  }


  // Return the notifications in the feed
  get notifications() {
    return Object.values(this._notifications);
  }

  // Return the notifications that are included in the overview in the feed
  get includedNotifications() {
    return this.notifications.filter(n => n.include);
  }

  // Return the notifications that are included in the overview and severe in the feed
  get severeNotifications() {
    return this.notifications.filter(n => n.include && n.severe);
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


  // Parse a file as TOML
  _parseTomlFile(file, parser) {
    return _.mapObject(toml.parse(_files[file]), parser.bind(this));
  }

  // Parse an agency from an object
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

  // Parse a service type from an object
  _parseServiceType(serviceType, id) {
    if (serviceType.agency !== undefined)
      serviceType.agency = this.getAgency(serviceType.agency);
    return new ServiceType(this, {id, ...serviceType});
  }

  // Parse services from an object
  _parseServices(services, id) {
    return services.map(service => {
      if (typeof service === 'string')
        service = {type: service};
      service.type = this.getServiceType(service.type);
      return new Service(this, {id, ...service})
    });
  }

  // Parse a notification type from an object
  _parseNotificationType(notificationType, id) {
    return new NotificationType(this, {id, ...notificationType});
  }

  // Parse a notification from an object
  _parseNotification(notification, id) {
    notification.type = this.getNotificationType(notification.type);
    notification.affectedNodes = notification.affectedNodes?.map(n => this.getNode(n)) ?? [];
    notification.affectedRoutes = notification.affectedRoutes?.map(r => this.getRoute(r)) ?? [];
    return new Notification(this, {id, ...notification})
  }


  // Function to boost a node document in a search index
  _boostNodeDocument(id, term, storedFields) {
    let modalityIndex = this.modalities.findIndex(m => m.id === storedFields.modality?.id);
    if (storedFields.modality !== undefined && modalityIndex > -1)
      return 0.7 + (this.modalities.length - modalityIndex) / this.modalities.length * 0.3;
    else
      return 0.7;
  }
}


// Define the exports
module.exports = {Agency, Modality, Node, Transfer, Route, RouteStop, Notification, Feed};
