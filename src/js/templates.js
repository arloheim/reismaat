const fs = require('fs');
const mustache = require('mustache');


// Render a template
function _render($el, template, view) {
  console.log(view);
  $el.html(mustache.render(template, view));
}


// Reisplanner template
function reisplanner($el, view) {
  let template = fs.readFileSync('src/templates/reisplanner.mustache', 'utf-8');
  _render($el, template, view);
}

// Meldingen template
function meldingen($el, view) {
  let template = fs.readFileSync('src/templates/meldingen.mustache', 'utf-8');
  _render($el, template, view);
}

// Tickets template
function tickets($el, view) {
  let template = fs.readFileSync('src/templates/tickets.mustache', 'utf-8');
  _render($el, template, view);
}

// Dienstregeling template
function dienstregeling($el, view) {
  let template = fs.readFileSync('src/templates/dienstregeling.mustache', 'utf-8');
  _render($el, template, view);
}

// Stations template
function stations($el, view) {
  let template = fs.readFileSync('src/templates/stations.mustache', 'utf-8');
  _render($el, template, view);
}

// Not found template
function notFound($el, view) {
  let template = fs.readFileSync('src/templates/404.mustache', 'utf-8');
  _render($el, template, view);
}


// Define the exports
module.exports.reisplanner = reisplanner;
module.exports.meldingen = meldingen;
module.exports.tickets = tickets;
module.exports.dienstregeling = dienstregeling;
module.exports.stations = stations;
module.exports.notFound = notFound;
