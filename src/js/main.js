const $ = require('jquery');
const _ = require('underscore');
const dayjs = require('dayjs');

const {RaptorAlgorithm} = require('./algorithm')
const {Feed} = require('./feed.js')
const {Router, NotFoundError} = require('./router.js')

require('./styles.js');


// Event handler when the document is ready
$(function() {
  // Inline SVG image tags
  inlineSVG();

  // Create the feed
  let feed = new Feed();

  // Create the router
  let router = new Router('/', $('#view'));

  // Add routes to the router
  router.addRoute('home', {path: '/', template: 'pages/home', data: collectHomeData});
  router.addRoute('planner', {path: '/reisadvies', template: 'pages/planner', data: collectPlannerData});
  router.addRoute('notifications', {path: '/meldingen', template: 'pages/notifications'});
  router.addRoute('tickets', {path: '/tickets', template: 'pages/tickets'});
  router.addRoute('routes', {path: '/dienstregeling', template: 'pages/routes'});
  router.addRoute('routes_details', {path: '/dienstregeling/:slug', template: 'pages/routes_details', data: collectRoutesDetailsData});
  router.addRoute('nodes', {path: '/stations', template: 'pages/nodes'});
  router.addRoute('nodes_details', {path: '/stations/:slug', template: 'pages/nodes_details', data: collectNodesDetailsData});
  router.addRoute('about', {path: '/over', template: 'pages/about'});

  // Add hooks to the router
  router.addAfterRoutingHook(afterRouting);
  router.addAfterRenderingHook(afterRendering);

  // Add default data to the router
  router.addDefaultData(match => ({feed}));

  // Resolve the route
  router.resolve();


  // Collect data for the home page
  function collectHomeData(match) {
    let date = dayjs().format('YYYY-MM-DDTHH:mm');

    return {date};
  };

  // Collect data for the planner page
  function collectPlannerData(match) {
    let from = feed.getNodeWithSlug(match.params?.f);
    let to = feed.getNodeWithSlug(match.params?.t);
    let date = match.params?.d;

    if (from === undefined || to === undefined)
      throw new NotFoundError(`Could not find nodes to plan between`);

    let algo = new RaptorAlgorithm(feed);
    let journeys = algo.calculate(from, to, dayjs(date));

    return {from, to, date, journeys};
  }

  // Collect data for the routes details page
  function collectRoutesDetailsData(match) {
    let slug = match.data?.slug;
    let route = feed.getRouteWithSlug(slug);
    if (slug === undefined || route === undefined)
      throw new NotFoundError(`Could not find route with slug '${slug}'`);

    return {route};
  }

  // Collect data for the nodes details page
  function collectNodesDetailsData(match) {
    let slug = match.data?.slug;
    let node = feed.getNodeWithSlug(slug);
    if (slug === undefined || node === undefined)
      throw new NotFoundError(`Could not find node with slug '${slug}'`);

    function mapRoutes(routes, node) {
      return routes.filter(r => !r.stop.last).toSorted(sortByPlatform);
    }

    function sortByPlatform(a, b) {
      if (a.stop.platform === undefined && b.stop.platform === undefined)
        return 0;
      else if (a.stop.platform === undefined)
        return 1;
      else if (b.stop.platform === undefined)
        return -1;
      else
        return a.stop.platform.localeCompare(b.stop.platform, undefined, {numeric: true, sensitivity: 'base'});
    }

    let allTransferNodes = node.transferNodes.filter(t => t.node.include);
    let allOwnRoutes = mapRoutes(node.routes, node);
    let allTransferRoutes = allTransferNodes.map(t => ({node: t.node, routes: mapRoutes(t.node.routes, t.node)}));

    return {node, allTransferNodes, allOwnRoutes, allTransferRoutes};
  }


  // Function to convert SVG image tags to inline SVG
  function inlineSVG($el) {
    $el = $el ?? $(':root');

    $el.find('img.svg-icon').each(function() {
      if (this.parentNode === null)
        return;

      fetch(this.src)
        .then(res => res.text())
        .then(data => {
          const parser = new DOMParser();
          const svg = parser.parseFromString(data, 'image/svg+xml').querySelector('svg');

          svg.width = this.offsetWidth;
          svg.height = this.offsetHeight;
          if (this.id)
            svg.id = this.id;
          if (this.className)
            svg.classList = this.classList;
          svg.classList.add('svg-inline--fa');

          this.parentNode.replaceChild(svg, this);
        })
        .catch(error => console.error(error));
    });
  }

  // Hook for when the router is done routing
  function afterRouting() {
    // Scroll to the top of the page
    window.scrollTo({top: 0});
  }

  // Hook for when the router is done rendering
  function afterRendering($el) {
    // Inline SVG image tags
    inlineSVG($el);

    // Show the first element of a collapse group
    $el.find('.collapse[data-group]').first().show();

    // Toggle a collapse element when the corresponding link is clicked
    $el.find('a[data-collapse]').on('click', function() {
      let collapseElement = $(this).data('collapse');

      // Toggle the collapse
      let $collapse = $el.find(`.collapse#${collapseElement}`);

      let group = $collapse.data('group');
      if (group !== undefined)
        $el.find(`.collapse[data-group="${group}"]`).hide();

      if ($collapse.data('slide') !== undefined)
        $collapse.slideToggle(250);
      else
        $collapse.toggle();

      // Toggle the icon of the link
      $(this).find('.icon > svg').toggleClass('fa-chevron-down fa-chevron-up');
    });

    // Plan a trip when the planner form is submitted
    $el.find('form#planner').on('submit', function(e) {
      e.preventDefault();

      // Get the params from the form
      let fromId = $(this).find('#from').data('id');
      let from = feed.getNode(fromId);
      let toId = $(this).find('#to').data('id');
      let to = feed.getNode(toId);
      let datetime = $(this).find('#datetime').val();

      if (from !== undefined && to !== undefined)
        router.navigateToPath(`/reisadvies?f=${from.slug}&t=${to.slug}&d=${datetime}`);
      else
        console.log();
    });

    // Handle switching the from and to fields
    $el.find('form#planner #switch').on('click', function() {
      let temp = $el.find('#from').val();;
      $el.find('#from').val($el.find('#to').val());
      $el.find('#to').val(temp);
    });

    // Handle setting the date field to the current time
    $el.find('form#planner #now').on('click', function() {
      $el.find('#datetime').val(dayjs().format('YYYY-MM-DDTHH:mm'));
    });

    // Event handler for when a node input changes
    $el.find('.node-input').on('input', _.debounce(function() {
      var $input = $(this);

      // Clear the stored id
      $input.data('id', undefined);

      // Get the dropdown and create the dropdown content
      let $dropdown = $input.parents('.dropdown');

      let $dropdownMenu = $dropdown.find('.dropdown-menu');
      if ($dropdownMenu.length === 0)
        $dropdownMenu = $('<div class="dropdown-menu">').appendTo($dropdown);

      let $dropdownContent = $dropdownMenu.find('.dropdown-content');
      if ($dropdownContent.length == 0)
        $dropdownContent = $('<div class="dropdown-content">').appendTo($dropdownMenu);

      // Function that defines an event handler when a dropdown item is clicked
      let dropdownItemClick = function() {
        let id = $(this).data('id');

        $dropdown.hide().removeClass('is-active');
        $input.data('id', id);
        $input.val(feed.getNode(id).name);
      }

      // Get the query of the input and search for matching nodes
      var query = $input.val();
      var foundNodes = feed.searchNodes(query);

      if (query === "" || foundNodes.length === 0) {
        // Hide the dropdown
        $dropdown.removeClass('is-active').hide();
      } else {
        // Clear the dropdown content
        $dropdownContent.empty();

        // Add the nodes to the dropdown content
        for (let foundNode of foundNodes.slice(0, 10)) {
          feed.getNode(foundNode.id).renderDropdownItem()
            .on('click', dropdownItemClick)
            .appendTo($dropdownContent);
        }

        // Activate the dropdown
        $dropdown.show().addClass('is-active');
      }
    }, 500));

    // Event handler for when a node input loses focus
    $el.find('.node-input').on('blur', _.debounce(function() {
      let $input = $(this);
      // Hide the dropdown
      $input.parents('.dropdown').removeClass('is-active').hide();

      // Check if the input has an attached id
      if ($input.data('id') === undefined)
        $input.addClass('is-danger');
      else
        $input.removeClass('is-danger');
    }, 100));
  }


  // Check for click events on the navbar burger icon
  $(".navbar-burger").on('click', function() {
    // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
    $(".navbar-burger").toggleClass("is-active");
    $(".navbar-menu").toggleClass("is-active");
  });
});
