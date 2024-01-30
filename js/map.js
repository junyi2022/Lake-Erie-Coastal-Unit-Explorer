/* globals turf */

import { handlePointSelection } from './cal.js';

function initializeMap(censusTracts, dataBoundary, huc10, huc12, shorelineBase, county, flowline, sendimentBudget) {
  const map = L.map('map', {zoomSnap: 0}).setView([42.57, -79.22], 10); // zoomSnap 0 make the zoom level to real number
  const baseTileLayer = L.tileLayer('https://api.mapbox.com/styles/v1/junyiy/clpdjdrj7005r01qjb99zhdr5/tiles/{tileSize}/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoianVueWl5IiwiYSI6ImNsbXMza292bjAxcXoybG1meHhuZ3N1cjYifQ.EYo5VECxk9-NCAEgc3dm9w', {
    maxZoom: 19,
    zoomOffset: -1,
    tileSize: 512,
    attribution: `© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>`,
  });
  baseTileLayer.addTo(map);

  // add layers
  // if have a lot of layers, it is better to add layers as map's attributes
  map.dataBoundaryLayer = L.geoJSON(dataBoundary,
    { stroke: true,
      fill: false,
      color: '#F0BAAB',
      weight: 3,
    });
  map.dataBoundaryLayer.addTo(map);

  map.censusTractLayer = L.geoJSON(censusTracts,
    { stroke: true,
      fill: false,
      color: '#919191',
      dashArray: '2 2',
      weight: 0.5,
    });

  map.countyLayer = L.geoJSON(county,
    { stroke: true,
      fill: false,
      color: '#919191',
      dashArray: '2 2',
      weight: 1,
    });

  map.huc10Layer = L.geoJSON(huc10,
    { stroke: true,
      fill: false,
      color: '#AAB9F0',
      weight: 1,
    });

  map.huc12Layer = L.geoJSON(huc12,
    { stroke: true,
      fill: false,
      color: '#AAB9F0',
      weight: 1,
    });

  map.flowlineLayer = L.geoJSON(flowline,
    { stroke: true,
      fill: false,
      color: '#BFD3EF',
      weight: 0.5,
    });

  map.sedimentBudgetLayer = L.geoJSON(sendimentBudget,
    { stroke: true,
      fill: false,
      color: '#8996F5',
      weight: 1.5,
    });

  map.shorelineBaseLayer = L.geoJSON(shorelineBase,
    { stroke: true,
      color: '#EF8F5D',
      weight: 1.8,
    }).bringToFront();
  map.shorelineBaseLayer.addTo(map);

  map.sliceLayer = L.geoJSON(null,
    { stroke: true,
      fill: false,
      color: '#BACC79',
      weight: 2.5,
    });
  map.sliceLayer.addTo(map);

  map.colorLayer = null;
  map.finalUnitLayer = null;

  // layer control
  map.countyLayer.addTo(map); // need to add it to map in order to have this layer show up when initialize

  const layerControl = {
    'Census Tract': map.censusTractLayer,
    'County': map.countyLayer,
    'HUC 10': map.huc10Layer,
    'HUC12': map.huc12Layer,
    'Flowline': map.flowlineLayer,
    'Sediment Budget': map.sedimentBudgetLayer,
  };

  L.control.layers(null, layerControl).addTo(map);

  // add scale bar
  L.control.scale().addTo(map);

  // make the zoom level fit different browser size
  const zoomRef = turf.buffer(dataBoundary, 20);
  map.zoomRefLayer = L.geoJSON(zoomRef);
  map.fitBounds(map.zoomRefLayer.getBounds());

  // always put coastal layer on the top when adding new layers to the map
  map.addEventListener('overlayadd', () => {
    map.shorelineBaseLayer.bringToFront();
    map.sliceLayer.bringToFront();
    map.dataBoundaryLayer.bringToFront();
  });

  // read the original start and end points
  const shorePoints = shorelineBase.features[0].geometry.coordinates;
  const start = shorePoints[0];
  const end = shorePoints[shorePoints.length - 1]; // JS cannot select -1

  // add a layer for markers
  map.markerLayer = L.layerGroup();
  map.markerLayer.addTo(map);

  // call the calculation part
  handlePointSelection(start, end, map, shorelineBase);

  return map;
}

export {
  initializeMap,
};
