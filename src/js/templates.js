const fs = require('fs');
const mustache = require('mustache');
const path = require('path');


// Object that contains the available templates
const _templates = {
  // Normal pages
  'pages/home': fs.readFileSync('src/templates/pages/home.mustache', 'utf-8'),
  'pages/planner': fs.readFileSync('src/templates/pages/planner.mustache', 'utf-8'),
  'pages/notifications': fs.readFileSync('src/templates/pages/notifications.mustache', 'utf-8'),
  'pages/tickets': fs.readFileSync('src/templates/pages/tickets.mustache', 'utf-8'),
  'pages/routes': fs.readFileSync('src/templates/pages/routes.mustache', 'utf-8'),
  'pages/routes_details': fs.readFileSync('src/templates/pages/routes_details.mustache', 'utf-8'),
  'pages/nodes': fs.readFileSync('src/templates/pages/nodes.mustache', 'utf-8'),
  'pages/nodes_details': fs.readFileSync('src/templates/pages/nodes_details.mustache', 'utf-8'),
  'pages/about': fs.readFileSync('src/templates/pages/about.mustache', 'utf-8'),

  // Error pages
  'pages/errors/404': fs.readFileSync('src/templates/pages/errors/404.mustache', 'utf-8'),
  'pages/errors/500': fs.readFileSync('src/templates/pages/errors/500.mustache', 'utf-8'),

  // Tiles
  'tiles/action_nodes': fs.readFileSync('src/templates/tiles/action_nodes.mustache', 'utf-8'),
  'tiles/action_notifications': fs.readFileSync('src/templates/tiles/action_notifications.mustache', 'utf-8'),
  'tiles/action_planner': fs.readFileSync('src/templates/tiles/action_planner.mustache', 'utf-8'),
  'tiles/action_routes': fs.readFileSync('src/templates/tiles/action_routes.mustache', 'utf-8'),
  'tiles/action_tickets': fs.readFileSync('src/templates/tiles/action_tickets.mustache', 'utf-8'),
  'tiles/nodes_details_routes': fs.readFileSync('src/templates/tiles/nodes_details_routes.mustache', 'utf-8'),
  'tiles/nodes_details_services': fs.readFileSync('src/templates/tiles/nodes_details_services.mustache', 'utf-8'),
  'tiles/notifications_details': fs.readFileSync('src/templates/tiles/notifications_details.mustache', 'utf-8'),
  'tiles/routes_details_stops': fs.readFileSync('src/templates/tiles/routes_details_stops.mustache', 'utf-8'),
  'tiles/routes_details_summary': fs.readFileSync('src/templates/tiles/routes_details_summary.mustache', 'utf-8'),

  // Components
  'components/journey_details': fs.readFileSync('src/templates/components/journey_details.mustache', 'utf-8'),
  'components/journey_box_route': fs.readFileSync('src/templates/components/journey_box_route.mustache', 'utf-8'),
  'components/journey_box_transfer': fs.readFileSync('src/templates/components/journey_box_transfer.mustache', 'utf-8'),
  'components/journey_cell_node': fs.readFileSync('src/templates/components/journey_cell_node.mustache', 'utf-8'),
  'components/journey_cell_node_simple': fs.readFileSync('src/templates/components/journey_cell_node_simple.mustache', 'utf-8'),
  'components/journey_cell_platform': fs.readFileSync('src/templates/components/journey_cell_platform.mustache', 'utf-8'),
  'components/journey_cell_route': fs.readFileSync('src/templates/components/journey_cell_route.mustache', 'utf-8'),
  'components/journey_cell_time': fs.readFileSync('src/templates/components/journey_cell_time.mustache', 'utf-8'),
  'components/journey_link': fs.readFileSync('src/templates/components/journey_link.mustache', 'utf-8'),

  // Feed components
  'feed/node_long': fs.readFileSync('src/templates/feed/node_long.mustache', 'utf-8'),
  'feed/node_short': fs.readFileSync('src/templates/feed/node_short.mustache', 'utf-8'),
  'feed/notification': fs.readFileSync('src/templates/feed/notification.mustache', 'utf-8'),
  'feed/route_long': fs.readFileSync('src/templates/feed/route_long.mustache', 'utf-8'),
  'feed/route_short': fs.readFileSync('src/templates/feed/route_short.mustache', 'utf-8'),
};



// Return if a template exists
function templateExists(template) {
  return _templates[template] !== undefined;
}

// Render a template
function renderTemplate(element, template, data, callback) {
  element.html(mustache.render(_templates[template], data, _templates));
  if (callback !== undefined)
    callback(element);
}

// Render the not found template
function renderNotFoundTemplate(element, error, callback) {
  renderTemplate(element, 'pages/errors/404', {error}, callback);
}

// Render the error template
function renderErrorTemplate(element, error, callback) {
  renderTemplate(element, 'pages/errors/500', {error}, callback);
}


// Define the exports
module.exports = {templateExists, renderTemplate, renderNotFoundTemplate, renderErrorTemplate};
