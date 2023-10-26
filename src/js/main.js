const $ = require('jquery');
const _ = require('underscore');
const dayjs = require('dayjs');
const Navigo = require('navigo');

const algorithm = require('./algorithm')
const feed = require('./feed.js')
const templates = require('./templates.js');

require('@fortawesome/fontawesome-free/js/all.js');


// Event handler when the document is ready
$(function() {
  // Load the feed
  let theFeed = new feed.Feed();

  // Create the router
  let $routeView = $('#view');

  let headers = {
    'default': 'default-header.png',
    'reisplanner': 'reisplanner-header.png',
    'meldingen': 'meldingen-header.png',
    'tickets': 'tickets-header.png',
    'dienstregeling': 'dienstregeling-header.png',
    'dienstregeling.details': 'dienstregeling-header.png',
    'stations': 'stations-header.png',
    'stations.details': 'stations-header.png',
  };

  function onTemplateRendered($el) {
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
      var foundNodes = theFeed.searchNodes(input);

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
        $el.val(theFeed.getNode($(this).data('id')).name);
      }

      // Clear the dropdown content
      $dropdownContent.empty();

      // Add the nodes to the dropdown content
      for (let foundNode of foundNodes.slice(0, 10)) {
        theFeed.getNode(foundNode.id).renderDropdownItem()
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

      from = theFeed.searchNodes(from)[0]?.id;
      to = theFeed.searchNodes(to)[0]?.id;

      console.log(from, to);

      router.navigate(`/reisadvies?van=${from}&naar=${to}&datum=${datetime}`);
    })
  }

  let router = new Navigo('/');

  router.hooks({
    after(match) {
      // Scroll to the top of the page
      scrollTo({top: 0});

      // Set the header image
      let header = headers[match.route.name] ?? headers.default;
      $('#header').attr('src', `/assets/images/${header}`);
    }
  });

  router.on({
    '/': {
      as: 'reisplanner',
      uses: function(match) {
        templates.render($routeView, 'pages/reisplanner', {notifications: theFeed.notifications.filter(n => n.showInOverview), datetime: dayjs().format('YYYY-MM-DDTHH:mm')}, onTemplateRendered);
      }
    },
    '/reisadvies': {
      as: 'reisadvies',
      uses: function(match) {
        console.log(match);
        let from = theFeed.getNode(match.params?.van);
        let to = theFeed.getNode(match.params?.naar);
        let datetime = match.params?.datum;

        if (from !== undefined && to !== undefined) {
          let algo = new algorithm.RaptorAlgorithm(theFeed);
          let journeys = algo.calculate(from, to, dayjs(datetime));

          templates.render($routeView, 'pages/reisadvies', {from, to, datetime, journeys}, onTemplateRendered);
        } else {
          templates.renderNotFound($routeView, {}, onTemplateRendered);
        }
      }
    },
    '/meldingen': {
      as: 'meldingen',
      uses: function(match) {
        templates.render($routeView, 'pages/meldingen', {notifications: theFeed.notifications.filter(n => n.showInOverview)}, onTemplateRendered);
      }
    },
    '/tickets': {
      as: 'tickets',
      uses: function(match) {
        templates.render($routeView, 'pages/tickets', {}, onTemplateRendered);
      }
    },
    '/dienstregeling': {
      as: 'dienstregeling',
      uses: function(match) {
        templates.render($routeView, 'pages/dienstregeling', {
          routes: _.chain(theFeed.routes)
            .groupBy(r => r.agency.id)
            .pairs()
            .map(([agencyId, agencyRoutes]) => ({agency: theFeed.getAgency(agencyId), agencyModalities: _.chain(agencyRoutes)
              .groupBy(r => r.modality.id)
              .pairs()
              .map(([modalityId, modalityRoutes]) => ({modality: theFeed.getModality(modalityId), modalityRoutes}))
              .value()}))
            .value()
        }, onTemplateRendered);
      }
    },
    '/dienstregeling/:id': {
      as: 'dienstregeling.details',
      uses: function(match) {
        let route = theFeed.getRoute(match.data.id);

        if (route !== undefined)
          templates.render($routeView, 'pages/dienstregeling', {
            route,
            firstStop: route.stops.at(0),
            lastStop: route.stops.at(-1),
            intermediateStops: route.stops.slice(1, -1),
          }, onTemplateRendered);
        else
          templates.renderNotFound($routeView, {}, onTemplateRendered);
      }
    },
    '/stations': {
      as: 'stations',
      uses: function(match) {
        templates.render($routeView, 'pages/stations', {}, onTemplateRendered);
      }
    },
    '/stations/:id': {
      as: 'stations.details',
      uses: function(match) {
        let node = theFeed.getNode(match.data.id);
        let nodeRoutes = node?.routesExcludingNonHalts
          .map(route => ({route, stop: route.getStopAtNode(node)}))
          .toSorted((a, b) => a.stop.platform.localeCompare(b.stop.platform));

        if (node !== undefined)
          templates.render($routeView, 'pages/stations', {node, nodeRoutes}, onTemplateRendered);
        else
          templates.renderNotFound($routeView, {}, onTemplateRendered);
      }
    }
  });

  router.notFound(function() {
    templates.notFound($routeView, {});
  });

  router.resolve();

  // Check for click events on the navbar burger icon
  $(".navbar-burger").click(function() {
    // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
    $(".navbar-burger").toggleClass("is-active");
    $(".navbar-menu").toggleClass("is-active");
  });
});
