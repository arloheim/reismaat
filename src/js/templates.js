const fs = require('fs');
const mustache = require('mustache');
const path = require('path');


// Object that contains the available templates
const _templates = {
  // Normal pages
  'pages/home': fs.readFileSync('src/templates/pages/home.mustache', 'utf-8'),
  'pages/home/planner': fs.readFileSync('src/templates/pages/home/planner.mustache', 'utf-8'),
  'pages/home/notifications': fs.readFileSync('src/templates/pages/home/notifications.mustache', 'utf-8'),
  'pages/home/actions': fs.readFileSync('src/templates/pages/home/actions.mustache', 'utf-8'),
  'pages/home/tickets': fs.readFileSync('src/templates/pages/home/tickets.mustache', 'utf-8'),
  'pages/home/routes': fs.readFileSync('src/templates/pages/home/routes.mustache', 'utf-8'),
  'pages/home/nodes': fs.readFileSync('src/templates/pages/home/nodes.mustache', 'utf-8'),
  'pages/planner': fs.readFileSync('src/templates/pages/planner.mustache', 'utf-8'),
  'pages/planner/journey': fs.readFileSync('src/templates/pages/planner/journey.mustache', 'utf-8'),
  'pages/notifications': fs.readFileSync('src/templates/pages/notifications.mustache', 'utf-8'),
  'pages/notifications/title': fs.readFileSync('src/templates/pages/notifications/title.mustache', 'utf-8'),
  'pages/notifications/notification': fs.readFileSync('src/templates/pages/notifications/notification.mustache', 'utf-8'),
  'pages/tickets': fs.readFileSync('src/templates/pages/tickets.mustache', 'utf-8'),
  'pages/routes': fs.readFileSync('src/templates/pages/routes.mustache', 'utf-8'),
  'pages/routes/title': fs.readFileSync('src/templates/pages/routes/title.mustache', 'utf-8'),
  'pages/routes/agency': fs.readFileSync('src/templates/pages/routes/agency.mustache', 'utf-8'),
  'pages/routes_details': fs.readFileSync('src/templates/pages/routes_details.mustache', 'utf-8'),
  'pages/routes_details/title': fs.readFileSync('src/templates/pages/routes_details/title.mustache', 'utf-8'),
  'pages/routes_details/stops': fs.readFileSync('src/templates/pages/routes_details/stops.mustache', 'utf-8'),
  'pages/routes_details/agency': fs.readFileSync('src/templates/pages/routes_details/agency.mustache', 'utf-8'),
  'pages/routes_details/notifications': fs.readFileSync('src/templates/pages/routes_details/notifications.mustache', 'utf-8'),
  'pages/nodes': fs.readFileSync('src/templates/pages/nodes.mustache', 'utf-8'),
  'pages/nodes_details': fs.readFileSync('src/templates/pages/nodes_details.mustache', 'utf-8'),
  'pages/nodes_details/title': fs.readFileSync('src/templates/pages/nodes_details/title.mustache', 'utf-8'),
  'pages/nodes_details/transfers': fs.readFileSync('src/templates/pages/nodes_details/transfers.mustache', 'utf-8'),
  'pages/nodes_details/routes': fs.readFileSync('src/templates/pages/nodes_details/routes.mustache', 'utf-8'),
  'pages/nodes_details/notifications': fs.readFileSync('src/templates/pages/nodes_details/notifications.mustache', 'utf-8'),
  'pages/nodes_details/services': fs.readFileSync('src/templates/pages/nodes_details/services.mustache', 'utf-8'),
  'pages/about': fs.readFileSync('src/templates/pages/about.mustache', 'utf-8'),

  // Error pages
  'pages/errors/404': fs.readFileSync('src/templates/pages/errors/404.mustache', 'utf-8'),
  'pages/errors/500': fs.readFileSync('src/templates/pages/errors/500.mustache', 'utf-8'),

  // Components
  'components/journey_box_route': fs.readFileSync('src/templates/components/journey_box_route.mustache', 'utf-8'),
  'components/journey_box_transfer': fs.readFileSync('src/templates/components/journey_box_transfer.mustache', 'utf-8'),
  'components/journey_cell_node': fs.readFileSync('src/templates/components/journey_cell_node.mustache', 'utf-8'),
  'components/journey_cell_node_simple': fs.readFileSync('src/templates/components/journey_cell_node_simple.mustache', 'utf-8'),
  'components/journey_cell_platform': fs.readFileSync('src/templates/components/journey_cell_platform.mustache', 'utf-8'),
  'components/journey_cell_route': fs.readFileSync('src/templates/components/journey_cell_route.mustache', 'utf-8'),
  'components/journey_cell_time': fs.readFileSync('src/templates/components/journey_cell_time.mustache', 'utf-8'),
  'components/journey_link': fs.readFileSync('src/templates/components/journey_link.mustache', 'utf-8'),

  // Feed components
  'feed/agency_link': fs.readFileSync('src/templates/feed/agency_link.mustache', 'utf-8'),
  'feed/agency_box_link': fs.readFileSync('src/templates/feed/agency_box_link.mustache', 'utf-8'),
  'feed/node_long': fs.readFileSync('src/templates/feed/node_long.mustache', 'utf-8'),
  'feed/node_long_link': fs.readFileSync('src/templates/feed/node_long_link.mustache', 'utf-8'),
  'feed/node_short': fs.readFileSync('src/templates/feed/node_short.mustache', 'utf-8'),
  'feed/node_short_link': fs.readFileSync('src/templates/feed/node_short_link.mustache', 'utf-8'),
  'feed/notification': fs.readFileSync('src/templates/feed/notification.mustache', 'utf-8'),
  'feed/route_abbr': fs.readFileSync('src/templates/feed/route_abbr.mustache', 'utf-8'),
  'feed/route_long': fs.readFileSync('src/templates/feed/route_long.mustache', 'utf-8'),
  'feed/route_long_link': fs.readFileSync('src/templates/feed/route_long_link.mustache', 'utf-8'),
  'feed/route_short': fs.readFileSync('src/templates/feed/route_short.mustache', 'utf-8'),
  'feed/route_short_link': fs.readFileSync('src/templates/feed/route_short_link.mustache', 'utf-8'),
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


// Function that returns HTML for an icon
function iconToHTML(icon, classes) {
  let match = icon.match(/^(?:(fa|svg):)?(.*)$/);

  let type = match !== null && match[1] !== undefined ? match[1] : 'fa';
  let id = match !== null ? match[2] : icon;

  if (type === 'fa')
    return `<i class="fa-solid ${classes} fa-${id}"></i>`;
  else if (type === 'svg')
    return `<img class="svg-icon ${classes}" src=/assets/images/icons/${id}.svg>`;
  else
    return null;
}


// Define the exports
module.exports = {templateExists, renderTemplate, renderNotFoundTemplate, renderErrorTemplate};
