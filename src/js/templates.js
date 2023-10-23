const fs = require('fs');
const mustache = require('mustache');


// Reisplanner template
function reisplanner($el, view) {
  let template = fs.readFileSync('src/templates/reisplanner.mustache', 'utf-8');
  let render = mustache.render(template, view);
  $el.html(render);
}

// Meldingen template
function meldingen($el, view) {
  let template = fs.readFileSync('src/templates/meldingen.mustache', 'utf-8');
  let render = mustache.render(template, view);
  $el.html(render);
}

// Tickets template
function tickets($el, view) {
  let template = fs.readFileSync('src/templates/tickets.mustache', 'utf-8');
  let render = mustache.render(template, view);
  $el.html(render);
}

// Dienstregeling template
function dienstregeling($el, view) {
  let template = fs.readFileSync('src/templates/dienstregeling.mustache', 'utf-8');
  let render = mustache.render(template, view);
  $el.html(render);
}

// Stations template
function stations($el, view) {
  let template = fs.readFileSync('src/templates/stations.mustache', 'utf-8');
  let render = mustache.render(template, view);
  $el.html(render);
}

// Not found template
function notFound($el, view) {
  let template = fs.readFileSync('src/templates/404.mustache', 'utf-8');
  let render = mustache.render(template, view);
  $el.html(render);
}


// Define the exports
module.exports.reisplanner = reisplanner;
module.exports.meldingen = meldingen;
module.exports.tickets = tickets;
module.exports.dienstregeling = dienstregeling;
module.exports.stations = stations;
module.exports.notFound = notFound;
