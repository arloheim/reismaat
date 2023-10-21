modalities = {
  rail: 'train',
  metro: 'train-subway',
  tram: 'train-tram',
  hyperloop: 'cloud-bolt',
  funicular: 'cable-car',
  lift: 'elevator',
  ferry: 'ferry',
  eqh: 'horse-head',
  eqd: 'city',
  poi: 'landmark',
};


async function loadData()
{
  let dataRequest = await fetch("data/data.json");
  let dataJson = await dataRequest.json();
  return dataJson;
}

// Event handler when the document is ready
$(function() {
  // Load the data
  let data = {};
  let nodes = [];
  let nodesIndex = null;

  loadData().then(function(dataJson) {
    data = dataJson;

    for (let [id, node] of Object.entries(data.nodes))
      nodes.push({id, ...node});

    nodesIndex = new MiniSearch({
      fields: ['name', 'code'],
      storeFields: ['type'],
      searchOptions: {
        boost: {name: 2},
        boostDocument: (id, term, storedFields) => {
          let types = Object.keys(modalities);
          let typeIndex = types.indexOf(storedFields.type);
          if (typeIndex === -1)
            return 1;
          else
            return 0.7 + (types.length - typeIndex) / types.length * 0.3;
        },
        prefix: term => term.length >= 2,
        combineWith: 'AND'
      }}
    );
    nodesIndex.addAll(nodes);
  })

  // Event handler for when the node input changes
  $('#node').on('input', $.debounce(500, function() {
    var input = $(this).val();
    var foundNodes = nodesIndex.search(input);

    var $table = $('#node-results');
    $table.html('');
    for (let foundNode of foundNodes)
    {
      let node = data.nodes[foundNode.id];

      let $tr = $('<tr>').appendTo($table);
      $('<td>').html(foundNode.id).appendTo($tr);
      $('<td>').html(`<span class="icon-text"><span class="icon"><i class="fas fa-${modalities[node.type]}"></i></span><span>${node.name}</span></span>`).appendTo($tr);
      $('<td>').html(node.type).appendTo($tr);
    }
  }));
});
