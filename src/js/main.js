const $ = require('jquery');
const _ = require('underscore');
const Navigo = require('navigo');

const feed = require('./feed.js')
const templates = require('./templates.js');

require('@fortawesome/fontawesome-free/js/all.js');


// Event handler when the document is ready
$(function() {
  // Load the feed
  let feed = new data.Feed();

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

  let router = new Navigo('/');

  router.hooks({
    after(match) {
      // Scroll to the top of the page
      scrollTo({top: 0});

      // Set the header image
      let header = headers[match.route.name] ?? headers.default;
      $('#header').attr('src', `/assets/images/${header}`);

      // Event handler for when a node input changes
      $('.node-input').on('input change', _.debounce(function() {
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
      $('.node-input').on('blur', _.debounce(function() {
        // Hide the dropdown
        let $dropdown = $(this).parents('.dropdown').removeClass('is-active').hide();
      }, 100));
    }
  });

  router.on({
    '/': {
      as: 'reisplanner',
      uses: function(match) {
        templates.reisplanner($routeView, {
          notifications: feed.notifications,
          hasNotifications: feed.notifications.length > 0,
        });
      }
    },
    '/planner': {
      as: 'reisplanner-results',
      uses: function(match) {
        let from = match.params?.van ?? undefined;
        let to = match.params?.naar ?? undefined;
      }
    },
    '/meldingen': {
      as: 'meldingen',
      uses: function(match) {
        templates.meldingen($routeView, {
          notifications: feed.notifications,
          hasNotifications: feed.notifications.length > 0,
        });
      }
    },
    '/tickets': {
      as: 'tickets',
      uses: function(match) {
        templates.tickets($routeView, {});
      }
    },
    '/dienstregeling': {
      as: 'dienstregeling',
      uses: function(match) {
        templates.dienstregeling($routeView, {
          routes: _.chain(feed.routes)
            .groupBy(r => r.agency.id)
            .pairs()
            .map(([agencyId, agencyRoutes]) => ({agency: feed.getAgency(agencyId), agencyModalities: _.chain(agencyRoutes)
                .groupBy(r => r.modality.id)
                .pairs()
                .map(([modalityId, modalityRoutes]) => ({modality: feed.getModality(modalityId), modalityRoutes}))
                .value()}))
            .value()
        });
      }
    },
    '/dienstregeling/:id': {
      as: 'dienstregeling.details',
      uses: function(match) {
        let route = feed.getRoute(match.data.id);

        if (route !== undefined)
          templates.dienstregeling($routeView, {route});
        else
          templates.notFound($routeView, {});
      }
    },
    '/stations': {
      as: 'stations',
      uses: function(match) {
        templates.stations($routeView, {});
      }
    },
    '/stations/:id': {
      as: 'stations.details',
      uses: function(match) {
        let node = feed.getNode(match.data.id);
        let nodeRoutes = node?.routesExcludingNonHalts
          .map(route => ({route, stop: route.getStopAtNode(node)}))
          .toSorted((a, b) => a.stop.platform.localeCompare(b.stop.platform));

        if (node !== undefined)
          templates.stations($routeView, {node, nodeRoutes});
        else
          templates.notFound($routeView, {});
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
