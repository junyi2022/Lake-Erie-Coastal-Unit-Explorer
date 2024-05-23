/* globals turf */

import { handleAllCalculations } from './cal.js';

function initializeMap(censusTracts, dataBoundary, huc10, huc12, shorelineBase, county, sendimentBudget) {
  const map = L.map('map', {zoomSnap: 0}).setView([42.57, -79.22], 10); // zoomSnap 0 make the zoom level to real number
  const baseTileLayer = L.tileLayer('https://api.mapbox.com/styles/v1/junyiy/clpdjdrj7005r01qjb99zhdr5/tiles/{tileSize}/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoianVueWl5IiwiYSI6ImNsdWVxcHowcDBxbWUyam92MWx5aW40MnkifQ.QR9kni83fZBO-EFBXAaX7g', {
    maxZoom: 19,
    zoomOffset: -1,
    tileSize: 512,
    attribution: `© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>`,
  });
  baseTileLayer.addTo(map);

  // other tile options for layer control
  const esriWorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  });

  const baseMaps = {
    'Simple': baseTileLayer,
    'Satellite': esriWorldImagery,
  };

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

  // layers for model

  map.sedimentBudgetLayer = L.geoJSON(sendimentBudget,
    { stroke: true,
      fill: false,
      color: '#8996F5',
      weight: 1.5,
    });

  // coastline scope

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

  // initialize legend
  map.legend = L.control({position: 'bottomright'});

  // layer control
  map.countyLayer.addTo(map); // need to add it to map in order to have this layer show up when initialize

  const layerControl = {
    'Census Tract': map.censusTractLayer,
    'County': map.countyLayer,
    'HUC 10': map.huc10Layer,
    'HUC12': map.huc12Layer,
    'Sediment Budget': map.sedimentBudgetLayer,
  };

  // if only have one tile layer
  // L.control.layers(null, layerControl).addTo(map);

  // multiple tile layer
  L.control.layers(baseMaps, layerControl).addTo(map);

  // add scale bar
  L.control.scale().addTo(map);

  // make the zoom level fit different browser size
  // always focus on the buffer zone when initialize the map
  const zoomRef = turf.buffer(dataBoundary, 20);
  map.zoomRefLayer = L.geoJSON(zoomRef);
  map.fitBounds(map.zoomRefLayer.getBounds());

  // always put coastal layer on the top when adding new layers to the map
  map.addEventListener('overlayadd', () => {
    map.shorelineBaseLayer.bringToFront();
    map.sliceLayer.bringToFront();
    map.colorLayer.bringToFront();
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
  handleAllCalculations(start, end, map, shorelineBase);

  return map;
}

function legend1Style(map, colorScale) {
  const legendDiv = document.createElement('div'); // abstract html div tag
  legendDiv.classList.add('legend'); // div class
  legendDiv.innerHTML = '<h4 class="legendTitle">Legend</h4>'; // add html content

  const legendContent = document.createElement('div'); // abstract html div tag
  legendContent.classList.add('legend-content'); // div class

  const resColorLegendDiv = document.createElement('div');
  resColorLegendDiv.classList.add('res-legend');
  resColorLegendDiv.innerHTML = `
    <strong><p>Resolution Score from Low to High</p></strong>
    <div class="resColorBox" style="background: linear-gradient(90deg, ${colorScale(0)}, ${colorScale(0.25)}, ${colorScale(0.5)}, ${colorScale(0.75)}, ${colorScale(1)})"></div>
  `;

  // if want to use querySelector here, cannot use document because it is not yet in the document
  // resColorLegendDiv.querySelector('.resColorBox');

  legendContent.appendChild(resColorLegendDiv);
  legendDiv.appendChild(legendContent);
  return legendDiv;
}


function legend2Style(map, unitColorScale, numvalues) {
  const legendContent = document.querySelector('.legend-content');

  // when reset, need to remove the previous unit legend first
  if (legendContent.querySelector('.unit-legend') !== null) {
    const oldLegend = legendContent.querySelector('.unit-legend');
    legendContent.removeChild(oldLegend);
  }

  // create a new div to hold unit legend
  const unitColorLegendDiv = document.createElement('div');
  unitColorLegendDiv.classList.add('unit-legend');
  let html = `
    <strong><p>Group Number</p></strong>
    <div class="catWrapper">
  `;

  for (let i = 0; i < numvalues; i++) {
    html += `
    <div class="colorTextPair">
    <div class="catColorBox" style="background-color: ${unitColorScale(i / (numvalues - 1))}"></div>
    <p class="catText">Group ${i+1}</p>
    </div>
    `;
  }

  html += '</div>'; // Close the wrapper
  unitColorLegendDiv.innerHTML = html;
  console.log(unitColorLegendDiv);

  legendContent.appendChild(unitColorLegendDiv);
}

export {
  initializeMap,
  legend1Style,
  legend2Style,
};
