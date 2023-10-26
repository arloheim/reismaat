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

  // Error pages
  'pages/errors/404': fs.readFileSync('src/templates/pages/errors/404.mustache', 'utf-8'),

  // Tiles
  'tiles/planner': fs.readFileSync('src/templates/tiles/planner.mustache', 'utf-8'),
  'tiles/route_stops': fs.readFileSync('src/templates/tiles/route_stops.mustache', 'utf-8'),

  // Components
  'components/journey_details': fs.readFileSync('src/templates/components/journey_details.mustache', 'utf-8'),
  'components/journey_box_route': fs.readFileSync('src/templates/components/journey_box_route.mustache', 'utf-8'),
  'components/journey_box_transfer': fs.readFileSync('src/templates/components/journey_box_transfer.mustache', 'utf-8'),
  'components/journey_cell_node': fs.readFileSync('src/templates/components/journey_cell_node.mustache', 'utf-8'),
  'components/journey_cell_node_simple': fs.readFileSync('src/templates/components/journey_cell_node_simple.mustache', 'utf-8'),
  'components/journey_cell_platform': fs.readFileSync('src/templates/components/journey_cell_platform.mustache', 'utf-8'),
  'components/journey_cell_route': fs.readFileSync('src/templates/components/journey_cell_route.mustache', 'utf-8'),
  'components/journey_cell_time': fs.readFileSync('src/templates/components/journey_cell_time.mustache', 'utf-8'),

  // Feed components
  'feed/node_long': fs.readFileSync('src/templates/feed/node_long.mustache', 'utf-8'),
  'feed/node_short': fs.readFileSync('src/templates/feed/node_short.mustache', 'utf-8'),
  'feed/notification': fs.readFileSync('src/templates/feed/notification.mustache', 'utf-8'),
  'feed/route_long': fs.readFileSync('src/templates/feed/route_long.mustache', 'utf-8'),
  'feed/route_short': fs.readFileSync('src/templates/feed/route_short.mustache', 'utf-8'),
};


// Render a template
function render(el, template, view, callback) {
  console.log(view);

  template = _templates[template];
  if (template !== undefined)
    el.html(mustache.render(template, view, _templates));
  else
    el.html(mustache.render(_templates['pages/errors/404'], view, _templates));

  if (callback !== undefined)
    callback(el);
}

// Render the not found template
function renderNotFound(el, view, callback) {
  render(el, 'pages/errors/404', view, callback);
}


// Define the exports
module.exports.render = render;
module.exports.renderNotFound = renderNotFound;
