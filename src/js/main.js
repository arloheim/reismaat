const $ = require('jquery');
const _ = require('underscore');
const dayjs = require('dayjs');

const {RaptorAlgorithm} = require('./algorithm')
const {Feed} = require('./feed.js')
const {Router, NotFoundError} = require('./router.js')

require('./styles.js');


// Event handler when the document is ready
$(function() {
  // Create the feed
  let feed = new Feed();
  console.log('Feed:', feed);

  // Create the router
  let router = new Router('/', $('#view'));

  // Add routes to the router
  router.addRoute('home', {path: '/', template: 'pages/home', data: collectHomeData});
  router.addRoute('planner', {path: '/reisadvies', template: 'pages/planner', data: collectPlannerData});
  router.addRoute('notifications', {path: '/meldingen', template: 'pages/notifications'});
  router.addRoute('tickets', {path: '/tickets', template: 'pages/tickets'});
  router.addRoute('routes', {path: '/dienstregeling', template: 'pages/routes', data: collectRoutesData});
  router.addRoute('routes_details', {path: '/dienstregeling/:id', template: 'pages/routes_details', data: collectRoutesDetailsData});
  router.addRoute('nodes', {path: '/stations', template: 'pages/nodes'});
  router.addRoute('nodes_details', {path: '/stations/:id', template: 'pages/nodes_details', data: collectNodesDetailsData});

  // Add hooks to the router
  router.addAfterRoutingHook(afterRouting);
  router.addAfterRenderingHook(afterRendering);

  // Add default data to the router
  router.addDefaultData(match => ({feed}));

  // Resolve the route
  router.resolve();


  // Collect data for the home page
  function collectHomeData(match) {
    return {
      datetime: dayjs().format('YYYY-MM-DDTHH:mm')
    }
  };

  // Collect data for the planner page
  function collectPlannerData(match) {
    let from = feed.getNode(match.params?.van);
    let to = feed.getNode(match.params?.naar);
    let datetime = match.params?.datum;

    if (from === undefined && to === undefined)
      throw new NotFoundError(`Could not find nodes to plan between`);

    let algo = new RaptorAlgorithm(feed);
    let journeys = algo.calculate(from, to, dayjs(datetime));

    return {from, to, datetime, journeys};
  }

  // Collect data for the routes page
  function collectRoutesData(match) {
    return {
      routes: _.chain(feed.routesInOverview)
        .groupBy(r => r.agency.id)
        .pairs()
        .map(([agencyId, agencyRoutes]) => ({agency: feed.getAgency(agencyId), agencyModalities: _.chain(agencyRoutes)
          .groupBy(r => r.modality.id)
          .pairs()
          .map(([modalityId, modalityRoutes]) => ({modality: feed.getModality(modalityId), modalityRoutes}))
          .value()}))
        .value()
    };
  }

  // Collect data for the routes details page
  function collectRoutesDetailsData(match) {
    let routeId = match.data?.id;
    let route = feed.getRoute(routeId);
    if (routeId === undefined || route === undefined)
      throw new NotFoundError(`Could not find route with id '${routeId}'`);

    return {route};
  }

  // Collect data for the nodes details page
  function collectNodesDetailsData(match) {
    let nodeId = match.data?.id;
    let node = feed.getNode(nodeId);
    if (nodeId === undefined || node === undefined)
      throw new NotFoundError(`Could not find node with id '${nodeId}'`);

    let nodeRoutes = node?.routesExcludingNonHalts
      .map(route => ({route, stop: route.getStopAtNode(node)}))
      .toSorted((a, b) => a.stop.platform.localeCompare(b.stop.platform));

    return {node, nodeRoutes};
  }


  // Hook for when the router is done routing
  function afterRouting() {
    // Scroll to the top of the page
    window.scrollTo({top: 0});
  }

  // Hook for when the router is done rendering
  function afterRendering($el) {
    // Show the first element of a collapse group
    $el.find('.collapse[data-group]').first().show();

    // Handle setting the date field to the current time
    $el.find('#now').on('click', function() {
      $el.find('#datetime').val(dayjs().format('YYYY-MM-DDTHH:mm'));
    });

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

    // Event handler for when a node input changes
    $el.find('.node-input').on('input change', _.debounce(function() {
      var $el = $(this);

      var input = $el.val();
      var foundNodes = feed.searchNodes(input);

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
        $el.val(feed.getNode($(this).data('id')).name);
      }

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
    }, 500));

    // Event handler for when a node input loses focus
    $el.find('.node-input').on('blur', _.debounce(function() {
      // Hide the dropdown
      let $dropdown = $(this).parents('.dropdown').removeClass('is-active').hide();
    }, 100));

    // Plan a trip when the planner form is submitted
    $el.find('form#planner').on('submit', function(e) {
      e.preventDefault();

      // Get the params from the form
      let from = $(this).find('#from').val();
      let to = $(this).find('#to').val();
      let datetime = $(this).find('#datetime').val();

      from = feed.searchNodes(from)[0]?.id;
      to = feed.searchNodes(to)[0]?.id;

      console.log(from, to);

      router.navigateToPath(`/reisadvies?van=${from}&naar=${to}&datum=${datetime}`);
    });
  }


  // Check for click events on the navbar burger icon
  $(".navbar-burger").click(function() {
    // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
    $(".navbar-burger").toggleClass("is-active");
    $(".navbar-menu").toggleClass("is-active");
  });
});
