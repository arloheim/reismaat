const Navigo = require('navigo');

const {templateExists, renderTemplate, renderNotFoundTemplate, renderErrorTemplate} = require('./templates.js');


// Class that defines a route
class Route
{
  // Constructor
  constructor(props) {
    this.path = props.path;
    this.template = props.template;
    this.data = props.data;

    this.beforeRoutingHook = undefined;
    this.afterRoutingHook = undefined;
  }

  // Add a before routing hook
  addBeforeRoutingHook(hook) {
    this.beforeRoutingHook = hook;
  }

  // Add an after routing hook
  addAfterRoutingHook(hook) {
    this.afterRoutingHook = hook;
  }
}

// Class that defines a router for routes
class Router
{
  // Constructor
  constructor(root, element) {
    this.root = root;
    this.element = element;

    this.routes = {};
    this.beforeRoutingHook = undefined;
    this.afterRoutingHook = undefined;
    this.afterRenderingHook = undefined;
    this.defaultData = undefined;

    this._navigo = undefined;
  }

  // Add a route
  addRoute(name, route) {
    return this.routes[name] = new Route(route);
  }

  // Add a before routing hook
  addBeforeRoutingHook(hook) {
    this.beforeRoutingHook = hook;
  }

  // Add an after routing hook
  addAfterRoutingHook(hook) {
    this.afterRoutingHook = hook;
  }

  // Add an after rendering hook
  addAfterRenderingHook(hook) {
    this.afterRenderingHook = hook;
  }

  // Add default data to the router
  addDefaultData(data) {
    this.defaultData = data;
  }

  // Navigate to a route by name
  navigateToRoute(name, data, options) {
    if (this._navigo === undefined)
      this._navigo = this._createRouter();

    this._navigo.navigateByName(name, data, options);
  }

  // Navigate to a route by path
  navigateToPath(path, options) {
    if (this._navigo === undefined)
      this._navigo = this._createRouter();

    this._navigo.navigate(path, options);
  }

  // Resolve a route
  resolve(options) {
    if (this._navigo === undefined)
      this._navigo = this._createRouter();

    this._navigo.resolve(options);
  }

  // Return a generated link for a route
  link(path, options) {
    if (this._navigo === undefined)
      this._navigo = this._createRouter();

    return this._navigo.generate(path, options);
  }


  // Render a template
  _renderTemplate(template, data) {
    renderTemplate(this.element, template, data, this.afterRenderingHook);
  }

  // Render the not found template
  _renderNotFoundTemplate(err) {
    renderNotFoundTemplate(this.element, err, this.afterRenderingHook);
  }

  // Render the error template
  _renderErrorTemplate(err) {
    renderErrorTemplate(this.element, err, this.afterRenderingHook);
  }


  // Create the Navigo router
  _createRouter() {
    let navigo = new Navigo(this.root);
    navigo.hooks({before: this.beforeRoutingHook, after: this.afterRoutingHook});
    navigo.on(this._createRouterRoutes());
    navigo.notFound(() => this._renderNotFoundTemplate(null));
    return navigo;
  }

  // Create the Navigo routes
  _createRouterRoutes() {
    return Object.fromEntries(Object.entries(this.routes).map(([name, route]) => [route.path, {
      as: name,
      uses: this._createRouterRoutesHandler(route),
      hooks: route.hooks,
    }]))
  }

  // Create a Navigo route handler from a route
  _createRouterRoutesHandler(route) {
    return match => {
      console.group(`Handling route ${route.path}`);
      console.log('Route:', route)
      console.log('Match:', match)

      try {
        // Create the data for the handler
        let data = {};
        if (this.defaultData !== undefined)
          data = {...data, ...this.defaultData(match)};
        if (route.data !== undefined)
          data = {...data, ...route.data(match)};
        console.log('Data:', data)

        // Check if the template exists
        if (!templateExists(route.template))
          throw new NotFoundError(`Cannot find template ${route.template}`);

        // Render the template
        this._renderTemplate(route.template, data);
      } catch (err) {
        // If it is a not found error, then render the not found template
        if (err instanceof NotFoundError) {
          console.error(err);
          this._renderNotFoundTemplate(err);
        }

        // Otherwise render the error template
        else {
          console.error(err);
          this._renderErrorTemplate(err);
        }
      }

      console.groupEnd();
    };
  };
}


// Error that is thrown when a page or entity is not found
class NotFoundError extends Error
{
  // Constructor
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
  }
}


// Define the exports
module.exports = {Route, Router, NotFoundError};
