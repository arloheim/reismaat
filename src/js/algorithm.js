const _ = require('underscore');
const dayjs = require('dayjs');

const feed = require('./feed.js');


// Class that defines a route leg of a journey
class RouteLeg
{
  // Constructor
  constructor(route) {
    this.route = route;

    this.last = false;
  }

  // Return the cumulative time of the route
  get cumulativeTime() {
    return this.route.lastStop.cumulativeTime;
  }

  // Return the departure node of the route
  get departureNode() {
    return this.route.firstStop.node;
  }

  // Return the arrival node of the route
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

    this.last = false;
  }

  // Return the cumulative time of the transfer
  get cumulativeTime() {
    return this.transfer.cumulativeTime;
  }

  // Return the departure node of the transfer
  get departureNode() {
    return this.transfer.between;
  }

  // Return the arrival node of the transfer
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
    for (let [index, leg] of this.legs.entries()) {
      // Set the last flag of the last leg
      leg.last = this.legs.indexOf(leg) === this.legs.length - 1;

      // Check the type of the leg
      if (leg instanceof RouteLeg) {
        // Copy the route
        leg.route = leg.route._copy();

        // Iterate over the stops of the route and set the formatted time
        for (let stop of leg.route.stops)
          stop.formattedTime = this.departureTime.add(stop.cumulativeTime, 'seconds').format('H:mm');
      } else if (leg instanceof TransferLeg) {
        // Copy the transfer
        leg.transfer = leg.transfer._copy();

        // Set the formatted time
        leg.transfer.formattedTime = Math.ceil(leg.transfer.time / 60);
      }
    }
  }

  // Return if the first leg is a transfer
  get firstLegIsTransfer() {
    return this.legs.at(0) instanceof TransferLeg;
  }

  // Return if the last leg is a transfer
  get lastLegIsTransfer() {
    return this.legs.at(-1) instanceof TransferLeg;
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
    // Get all labels from the departure node
    let kLabels = this._scan(departureNode);
    
    // Iterate over the labels from the departure node to the arrival node
    let journeys = [];
    for (let k = 1; k < kLabels.length; k ++) {
      // Break if there are no labels in this round
      if (kLabels[k].size === 0)
        break;

      // Get the trace of k trips and append it to the journeys
      let trace = this._traceBack(kLabels, arrivalNode, k).slice(1);
      if (trace.length > 0)
        journeys.push(new Journey(journeys.length, trace.map(t => t.leg), dateTime ?? dayjs()));
    }

    // Sort the journeys by total time
    journeys.sort((a, b) => a.duration - b.duration);

    // Return the journeys
    if (journeys.length === 0)
      console.warn(`Could not find any journeys between ${departureNode.name} and ${arrivalNode.name}`);
    return journeys;
  }

  // Return if a node is before another node in a route
  _isNodeBefore(route, node1, node2) {
    return route.getStopIndexAtNode(node1) < route.getStopIndexAtNode(node2);
  }

  // Return all possible labels at the specified departure node
  _scan(departureNode, rounds = 10) {
    // kLabels[i][node] denodes the label for node up to i trips
    let kLabels = Array.from({length: rounds}, () => new Map());
    kLabels[0].set(departureNode, {cumulativeTime: 0});

    // bestLabels[node] denotes the shortest time it takes to travel to node regardless of which trip
    let bestLabels = new Map();
    bestLabels.set(departureNode, {cumulativeTime: 0});

    // markedNodes denotes a set of nodes for which the time is improved at the previous round
    let markedNodes = new Set([departureNode]);

    // Iterate over the transfers from the departure node
    for (let transfer of departureNode.transfers) {
      let transferNode = transfer.getOppositeNode(departureNode);

      // Update the time to travel to the transfer node
      let alignedTransfer = transfer._alignToNode(departureNode);
      kLabels[0].set(transferNode, {node: departureNode, transfer: alignedTransfer, leg: new TransferLeg(alignedTransfer), cumulativeTime: alignedTransfer.cumulativeTime});
      bestLabels.set(transferNode, {node: departureNode, transfer: alignedTransfer, leg: new TransferLeg(alignedTransfer), cumulativeTime: alignedTransfer.cumulativeTime});

      // Mark the transfer node
      markedNodes.add(transferNode);
    }

    // Iterate over the rounds while there are nodes marked
    let queue = new Map();
    for (let k = 1; k < rounds; k ++) {
      // First stage: accumulate routes serving marked nodes from previous rounds
      queue.clear();
      for (let node of markedNodes) {
        for (let {route, stop} of node.routesExcludingNonHalts) {
          if (stop.last)
            continue;
          if (!queue.has(route.id) || this._isNodeBefore(route, node, queue.get(route.id)))
            queue.set(route.id, node);
        }
        markedNodes.delete(node);
      }

      // Second stage: examine the routes
      for (let [routeId, routeNode] of queue.entries()) {
        let route = this.feed.getRoute(routeId);

        // Apply the time to the route
        route = route._sliceBeginningAtNode(routeNode)._withInitialTime(kLabels[k - 1].get(routeNode).cumulativeTime + (k > 1 ? 60 : 0));

        // Iterate over the stops in the route starting at routeNode
        let stopIndex = 1;
        while (stopIndex < route.stops.length) {
          let stop = route.stops[stopIndex];

          // Check if there is a faster route to the node of the stop
          if (kLabels[k - 1].has(stop.node)) {
            let label = kLabels[k - 1].get(stop.node);

            // Check if the node can be reached faster using the label
            if (label.cumulativeTime < stop.cumulativeTime) {
              // Slice the route with the better time
              route = route._sliceBeginningAtNode(stop.node)._withInitialTime(label.cumulativeTime + (k > 1 ? 60 : 0));

              // Update the route-dependent variables
              routeNode = stop.node;
              stopIndex = 0;
              stop = route.stops[stopIndex];
            }
          }

          // Improve the time of the node of the stop if it is shorter than the current best time
          if (stop.cumulativeTime < (bestLabels.get(stop.node)?.cumulativeTime ?? Infinity)) {
            let routeSoFar = route._sliceEndingAtNode(stop.node);

            // Check if the route has more than one stop
            if (routeSoFar.stops.length > 1) {
              // Update the time to travel to the node of the stop
              kLabels[k].set(stop.node, {node: routeNode, route: routeSoFar, leg: new RouteLeg(routeSoFar), cumulativeTime: stop.cumulativeTime});
              bestLabels.set(stop.node, {node: routeNode, route: routeSoFar, leg: new RouteLeg(routeSoFar), cumulativeTime: stop.cumulativeTime});

              // Mark the node of the stop
              markedNodes.add(stop.node);
            }
          }

          // Increase the stopIndex
          stopIndex ++;
        }
      }

      // Third stage: examine the transfers
      for (let node of markedNodes) {
        // Iterate over the transfers from the node
        for (let transfer of node.transfers) {
          let transferNode = transfer.getOppositeNode(node);

          // Check for cyclic labels
          let trace = this._traceBack(kLabels, node, k);
          if (trace.find(label => label.leg instanceof TransferLeg && label.node === transferNode))
            continue;

          // Apply the time to the transfer
          transfer = transfer._withInitialTime(kLabels[k].get(node).cumulativeTime);

          // Improve the time of the transfer node if it is shorter than the best time
          if (transfer.cumulativeTime < (bestLabels.get(transferNode)?.cumulativeTime ?? Infinity)) {
            // Update the time to travel to the transfer node
            let alignedTransfer = transfer._alignToNode(transferNode);
            kLabels[k].set(transferNode, {node: node, transfer: alignedTransfer, leg: new TransferLeg(alignedTransfer), cumulativeTime: alignedTransfer.cumulativeTime});

            // Mark the transfer node
            markedNodes.add(transferNode);
          }
        }
      }

      // If there are no more marked nodes, then stop the algorithm
      if (markedNodes.size === 0)
        break;
    }

    // Return the labels
    return kLabels;
  }

  // Trace back a label
  _traceBack(kLabels, arrivalNode, round) {
    let trace = [];
    let previousNode = arrivalNode;

    // Iterate over the labels
    let k = round;
    while (k >= 0) {
      // Get the label at the k-th trip
      let previousLabel = kLabels[k].get(previousNode);
      if (previousLabel === undefined)
        break;

      // Prepend the label
      trace.unshift(previousLabel);
      previousNode = previousLabel.node;
      if (!(previousLabel.leg instanceof TransferLeg))
        k --;
    }

    // Return the trace
    return trace;
  }
}


// Define the exports
module.exports = {RouteLeg, TransferLeg, Journey, RaptorAlgorithm};
