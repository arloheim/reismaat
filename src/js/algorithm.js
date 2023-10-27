const _ = require('underscore');
const dayjs = require('dayjs');

const feed = require('./feed.js');


// Class that defines a route leg of a journey
class RouteLeg
{
  // Constructor
  constructor(route) {
    this.route = route;
  }

  // Get the cumulative time of the route
  get cumulativeTime() {
    return this.route.lastStop.cumulativeTime;
  }

  // Get the departure node of the route
  get departureNode() {
    return this.route.firstStop.node;
  }

  // Get the arrival node of the route
  get arrivalNode() {
    return this.route.lastStop.node;
  }
}


// Class that defines a transfer leg of a journey
class TransferLeg
{
  // Constructor
  constructor(transfer) {
    this.transfer = transfer;
  }

  // Get the cumulative time of the transfer
  get cumulativeTime() {
    return this.transfer.cumulativeTime;
  }

  // Get the departure node of the transfer
  get departureNode() {
    return this.transfer.between;
  }

  // Get the arrival node of the transfer
  get arrivalNode() {
    return this.transfer.and;
  }
}


// Class that defines a journey
class Journey
{
  // Constructor
  constructor(index, legs, departureTime) {
    this.index = index;
    this.legs = legs;

    this.departureNode = this.legs.at(0).departureNode;
    this.arrivalNode = this.legs.at(-1).arrivalNode;
    this.departureTime = departureTime;
    this.arrivalTime = departureTime.add(legs.at(-1).cumulativeTime, 'seconds');
    this.duration = this.arrivalTime.diff(this.departureTime, 'seconds');
    this.transfers = legs.filter(l => l instanceof RouteLeg).length - 1;

    this.formattedDepartureTime = this.departureTime.format('H:mm');
    this.formattedArrivalTime = this.arrivalTime.format('H:mm');
    this.formattedDuration = `${Math.floor(this.duration / 3600)}:${Math.ceil(this.duration % 3600 / 60).toString().padStart(2, '0')}`;

    // Iterate over the legs
    for (let leg of this.legs) {
      // Check the type of the leg
      if (leg instanceof RouteLeg) {
        // Copy the route
        leg.route = leg.route.copy();

        // Iterate over the stops of the route and set the formatted time
        for (let stop of leg.route.stops)
          stop.formattedTime = this.departureTime.add(stop.cumulativeTime, 'seconds').format('H:mm');
      } else if (leg instanceof TransferLeg) {
        // Copy the transfer
        leg.transfer = leg.transfer.copy();

        // Set the formatted time
        leg.transfer.formattedTime = Math.ceil(leg.transfer.time / 60);
      }
    }
  }

  // Return if the first leg is a transfer
  get firstLegIsTransfer() {
    return this.legs.at(0).type === 'transfer';
  }

  // Return if the last leg is a transfer
  get lastLegIsTransfer() {
    return this.legs.at(-1).type === 'transfer';
  }
}


// Class that executes the RAPTOR algorithm on a transit feed
// Adapted from https://www.microsoft.com/en-us/research/wp-content/uploads/2012/01/raptor_alenex.pdf
class RaptorAlgorithm
{
  // Constructor
  constructor(feed) {
    this.feed = feed;
  }


  // Return possible journeys between two nodes
  calculate(departureNode, arrivalNode, dateTime) {
    // Get all connections from the departure node
    let connections = this._scan(departureNode);

    // Check if there are connections to the arrival node
    if ([...connections.keys()].find(n => n.id === arrivalNode.id) === undefined) {
      console.warn(`Could not find any journeys between ${departureNode.name} and ${arrivalNode.name}`);
      return [];
    }

    // Iterate over the connections from the departure node to the arrival node
    let journeys = [];
    for (let k of connections.get(arrivalNode).keys()) {
      let legs = [];
      let toNode = arrivalNode;

      // Iterate over the connections
      while (k >= 0)  {
        // Get the connection at the k-th trip
        let connection = connections.get(toNode)?.get(k);
        if (k === 0 && connection === undefined)
          break;

        // Prepend a new leg
        if (connection instanceof feed.Route) {
          let fromNode = connection.stops[0].node;
          legs.unshift(new RouteLeg(connection));
          toNode = fromNode;
          k --;
        } else if (connection instanceof feed.Transfer) {
          let fromNode = connection.getOppositeNode(toNode);
          legs.unshift(new TransferLeg(connection.alignToNode(fromNode)));
          toNode = fromNode;
        } else {
          console.warn(`Found unrecognized connection type`, connection);
          break;
        }
      }

      // Append the legs to the journey
      journeys.push(new Journey(journeys.length, legs, dateTime ?? dayjs()));
    }

    // Sort the journeys by total time
    journeys.sort((a, b) => a.duration - b.duration);

    // Return the journeys
    return journeys;
  }

  // Return all possible connections at the specified departure node
  _scan(departureNode) {
    // kTimes[i][node] denotes the time it takes to travel to node with up to i trips
    let kTimes = new Map([[0, new Map(this.feed.nodes.map(n => [n, Infinity]))]]);
    kTimes.get(0).set(departureNode, 0);

    // bestTimes[node] denotes the shortest time it takes to travel to node regardless of which trip
    let bestTimes = new Map(this.feed.nodes.map(n => [n, Infinity]));
    bestTimes.set(departureNode, 0);

    // kConnections[node][i] denotes the connection from departureNode to node at the i-th trip
    let kConnections = new Map();

    // markedNodes denotes a set of nodes for which the time is improved at the previous round
    let markedNodes = [departureNode];

    // Iterate over the transfers from the departure node
    for (let transfer of departureNode.transfers) {
      // Apply the time to the transfer
      let transferNode = transfer.getOppositeNode(departureNode);
      transfer = transfer.copy();

      // Update the time to travel to the transfer node
      kTimes.get(0).set(transferNode, transfer.cumulativeTime);
      bestTimes.set(transferNode, transfer.cumulativeTime);

      // Update the connection of the transfer node
      if (!kConnections.has(transferNode))
        kConnections.set(transferNode, new Map());
      kConnections.get(transferNode).set(0, transfer);

      // Mark the transfer node
      if (markedNodes.find(n => n.id === transferNode.id) === undefined)
        markedNodes.push(transferNode);
    }

    // Iterate over the rounds while there are nodes marked
    let k = 0;
    while (markedNodes.length > 0) {
      k ++;
      kTimes.set(k, new Map(this.feed.nodes.map(n => [n, Infinity])));

      if (k > 100)
        break;

      // First stage: accumulate routes serving marked nodes from previous rounds
      let queue = new Map();
      while (markedNodes.length > 0) {
        let node = markedNodes.shift();
        for (let route of node.routesExcludingNonHalts) {
          if (!queue.has(route.id) || this._isNodeBefore(route, node, queue.get(route.id)))
            queue.set(route.id, node);
        }
      }

      // Second stage: examine the routes
      for (let [routeId, routeNode] of queue.entries()) {
        let route = this.feed.getRoute(routeId);

        // Apply the time to the route
        route = route.sliceBeginningAtNode(routeNode).withInitialTime(kTimes.get(k - 1).get(routeNode) + (k > 1 ? 60 : 0));

        // Iterate over the stops in the route starting at routeNode
        for (let stop of route.stops) {
          // Improve the time of the node of the stop if it is shorter than the current best time
          if (stop.cumulativeTime < bestTimes.get(stop.node)) {
            // Update the time to travel to the node of the stop
            kTimes.get(k).set(stop.node, stop.cumulativeTime);
            bestTimes.set(stop.node, stop.cumulativeTime);

            // Update the connection of the node of the stop
            if (!kConnections.has(stop.node))
              kConnections.set(stop.node, new Map());
            kConnections.get(stop.node).set(k, route.sliceEndingAtNode(stop.node));

            // Mark the node of the stop
            if (markedNodes.find(n => n.id === stop.node.id) === undefined)
              markedNodes.push(stop.node);
          }
        }
      }

      // Third stage: examine the transfers
      for (let node of markedNodes) {
        // Iterate over the transfers from the node
        for (let transfer of node.transfers) {
          // Apply the time to the transfer
          let transferNode = transfer.getOppositeNode(node);
          transfer = transfer.withInitialTime(kTimes.get(k).get(node));

          // Improve the time of the transfer node if it is shorter than the best time
          if (transfer.cumulativeTime < kTimes.get(k).get(transferNode)) {
            // Update the time to travel to the transfer node
            kTimes.get(k).set(transferNode, transfer.cumulativeTime);
            bestTimes.set(transferNode, transfer.cumulativeTime);

            // Update the connection of the transfer node
            if (!kConnections.has(transferNode))
              kConnections.set(transferNode, new Map());
            kConnections.get(transferNode).set(k, transfer);

            // Mark the transfer node
            if (markedNodes.find(n => n.id === transferNode.id) === undefined)
              markedNodes.push(transferNode);
          }
        }
      }
    }

    // Return the connections
    return kConnections;
  }

  // Return if a node is before another node in a route
  _isNodeBefore(route, node1, node2) {
    return route.getStopIndexAtNode(node1) < route.getStopIndexAtNode(node2);
  }
}


// Define the exports
module.exports = {RouteLeg, TransferLeg, Journey, RaptorAlgorithm};
