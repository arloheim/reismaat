// Import modules
const $ = require('jquery');
const fs = require('fs');
const toml = require('toml');
const underscore = require('underscore');

const MiniSearch = require('minisearch');

// Import visual modules
require('@fortawesome/fontawesome-free/js/all.js');


modalities = {
  rail: 'train',
  metro: 'train-subway',
  tram: 'train-tram',
  ferry: 'ferry',
  funicular: 'cable-car',
  lift: 'elevator',
  hyperloop: 'bolt',
  eqh: 'horse-head'
};


// Class that defines an agency
class Agency
{
  // Constructor
  constructor(props) {
    Object.assign(this, props);
  }
}


// Class that defines a node
class Node
{
  // Constructor
  constructor(props) {
    Object.assign(this, props);

    if (this.icon === undefined)
      this.icon = modalities[this.type] ?? 'location-dot';
  }

  // Return a description
  getDescription(data) {
    let parts = [];
    if (this.type !== undefined)
      parts.push(data.translate('modalities_node.' + this.type));
    if (this.location !== undefined)
      parts.push(this.location);
    parts.push(this.id);
    return parts.join(' &middot; ');
  }

  // Return HTMl for rendering a name
  renderName(data) {
    return $('<span class="icon-text">')
      .data('id', this.id)
      .append($('<span class="icon">').html(`<i class="fas fa-fw fa-${this.icon}"></i>`))
      .append($('<span>').html(this.name));
  }

  // Return HTML for rendering a dropdown item
  renderDropdownItem(data) {
    return $('<a class="dropdown-item">')
      .data('id', this.id)
      .append($('<div class="icon is-medium mr-2">')
        .append($('<i class="fas fa-fw fa-xl">').addClass(`fa-${this.icon}`)))
      .append($('<div class="is-flex is-flex-direction-column">')
        .append($('<span>').html(this.name))
        .append($('<span class="is-size-7 has-text-grey">').html(this.getDescription(data))));
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

    this.agencies = underscore.mapObject(toml.parse(fs.readFileSync('src/data/agencies.toml', 'utf-8')), (a, id) => (new Agency({id, ...a})));
    this.agenciesIndex = new MiniSearch({fields: ['name', 'abbr'], searchOptions: {...this.options.searchOptions}});
    this.agenciesIndex.addAll(Object.keys(this.agencies).map(id => ({id, ...this.agencies[id]})))

    this.nodes = underscore.mapObject(toml.parse(fs.readFileSync('src/data/nodes.toml', 'utf-8')), (n, id) => (new Node({id, ...n})));
    this.nodesIndex = new MiniSearch({fields: ['name', 'location', 'code'], storeFields: ['type'], searchOptions: {...this.options.searchOptions, boost: {name: 2}, boostDocument: this._boostNodeDocument}});
    this.nodesIndex.addAll(Object.values(this.nodes));

    this.translations = toml.parse(fs.readFileSync('src/data/translations.toml', 'utf-8'));
  }

  // Translate
  translate(key) {
    return key.split('.').reduce((o, k) => o && o[k], this.translations);
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


// Event handler when the document is ready
$(function() {
  // Load the data
  let data = new Data();

  // Event handler for when a node input changes
  $('.node-input').on('input change', underscore.debounce(function() {
    var $el = $(this);

    var input = $el.val();
    var foundNodes = data.searchNodes(input);

    // Get the dropdown
    let $dropdown = $el.parents('.dropdown');

    // Create the dropdown content
    let $dropdownMenu = $dropdown.find('.dropdown-menu');
    if ($dropdownMenu.length === 0)
      $dropdownMenu = $('<div class="dropdown-menu">').appendTo($dropdown);

    let $dropdownContent = $dropdownMenu.find('.dropdown-content');
    if ($dropdownContent.length == 0)
      $dropdownContent = $('<div class="dropdown-content">').appendTo($dropdownMenu);

    // Function that defines an event handler when a dropdown item is clicked
    function dropdownItemClick() {
      $dropdown.hide().removeClass('is-active');
      $el.val(data.nodes[$(this).data('id')].name);
    }

    // Clear the dropdown content
    $dropdownContent.empty();

    // Add the nodes to the dropdown content
    for (let foundNode of foundNodes.slice(0, 10)) {
      data.nodes[foundNode.id].renderDropdownItem(data)
        .on('click', dropdownItemClick)
        .appendTo($dropdownContent);
    }

    // Activate the dropdown
    $dropdown.show().addClass('is-active');
  }, 500));

  // Event handler for when a node input loses focus
  $('.node-input').on('blur', underscore.debounce(function() {
    // Hide the dropdown
    let $dropdown = $(this).parents('.dropdown').removeClass('is-active').hide();
  }, 100));
});
