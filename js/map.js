/* globals turf */

import { handleAllCalculations } from './cal.js';
import { handleSimilarityCalculations } from './cal-similarity.js';

// prepare data for maps

// map basetiles
const mapBoxTile = L.tileLayer('https://api.mapbox.com/styles/v1/junyiy/clpdjdrj7005r01qjb99zhdr5/tiles/{tileSize}/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoianVueWl5IiwiYSI6ImNsdWVxcHowcDBxbWUyam92MWx5aW40MnkifQ.QR9kni83fZBO-EFBXAaX7g', {
  maxZoom: 19,
  zoomOffset: -1,
  tileSize: 512,
  attribution: `© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>`,
});

// same tile cannot be used for two maps, so need to create another one
const mapBoxTile2 = L.tileLayer('https://api.mapbox.com/styles/v1/junyiy/clpdjdrj7005r01qjb99zhdr5/tiles/{tileSize}/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoianVueWl5IiwiYSI6ImNsdWVxcHowcDBxbWUyam92MWx5aW40MnkifQ.QR9kni83fZBO-EFBXAaX7g', {
  maxZoom: 19,
  zoomOffset: -1,
  tileSize: 512,
  attribution: `© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> <strong><a href="https://www.mapbox.com/map-feedback/" target="_blank">Improve this map</a></strong>`,
});

// other tile options for layer control
const esriWorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
});

const esriWorldImagery2 = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
});


// data layers style
const boundaryStyle = {
  stroke: true,
  fill: false,
  color: '#F0BAAB',
  weight: 3,
};

const censusTractStyle = {
  stroke: true,
  fill: false,
  color: '#919191',
  dashArray: '2 2',
  weight: 0.5,
};

const countyStyle = {
  stroke: true,
  fill: false,
  color: '#919191',
  dashArray: '2 2',
  weight: 1,
};

const huc10Style = {
  stroke: true,
  fill: false,
  color: '#AAB9F0',
  weight: 1,
};

const huc12Style = {
  stroke: true,
  fill: false,
  color: '#AAB9F0',
  weight: 1,
};

const sendimentBudgetStyle = {
  stroke: true,
  fill: false,
  color: '#8996F5',
  weight: 1.5,
};

const shorelineBaseStyle = {
  stroke: true,
  color: '#EF8F5D',
  weight: 1.8,
};

const sliceStyle = {
  stroke: true,
  fill: false,
  color: '#BACC79',
  weight: 2.5,
};

const pickPointStyle = {
  stroke: true,
  fill: true,
  color: '#EF8F5D',
  fillColor: '#EF8F5D',
  fillOpacity: 0,
  radius: 10,
};

function initializeMap(censusTracts, dataBoundary, huc10, huc12, shorelineBase, county, sendimentBudget) {
  const map = L.map('map1', {zoomSnap: 0, layers: [mapBoxTile]}).setView([42.57, -79.22], 10); // zoomSnap 0 make the zoom level to real number

  const baseMaps = {
    'Simple': mapBoxTile,
    'Satellite': esriWorldImagery,
  };

  // add layers
  // if have a lot of layers, it is better to add layers as map's attributes
  map.dataBoundaryLayer = L.geoJSON(dataBoundary, boundaryStyle);
  map.dataBoundaryLayer.addTo(map);

  map.censusTractLayer = L.geoJSON(censusTracts, censusTractStyle);

  map.countyLayer = L.geoJSON(county, countyStyle);

  map.huc10Layer = L.geoJSON(huc10, huc10Style);

  map.huc12Layer = L.geoJSON(huc12, huc12Style);

  map.sedimentBudgetLayer = L.geoJSON(sendimentBudget, sendimentBudgetStyle);

  // coastline scope

  map.shorelineBaseLayer = L.geoJSON(shorelineBase,
    shorelineBaseStyle).bringToFront();
  map.shorelineBaseLayer.addTo(map);

  map.sliceLayer = L.geoJSON(null, sliceStyle);
  map.sliceLayer.addTo(map);

  map.colorLayer = null;
  map.finalUnitLayer = null;

  // initialize legend
  map.legend = L.control({position: 'bottomright'});

  // add back button
  const backView = L.control({position: 'topleft'});
  backView.onAdd = (map) => {
    return backButtonStyle(map);
  };
  backView.addTo(map);

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
    if (map.colorLayer !== null) {
      map.colorLayer.bringToFront();
    }
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


function initializeSimilarAreaMap(censusTracts, dataBoundary, huc10, huc12, shorelineBase, county, sendimentBudget) {
  const map2 = L.map('map2', {zoomSnap: 0, layers: [mapBoxTile2]}).setView([42.57, -79.22], 10); // zoomSnap 0 make the zoom level to real number

  // layer control
  const baseMaps2 = {
    'Simple': mapBoxTile2,
    'Satellite': esriWorldImagery2,
  };

  // add layers
  // if have a lot of layers, it is better to add layers as map's attributes
  map2.dataBoundaryLayer = L.geoJSON(dataBoundary, boundaryStyle);
  map2.dataBoundaryLayer.addTo(map2);

  map2.censusTractLayer = L.geoJSON(censusTracts, censusTractStyle);

  map2.countyLayer = L.geoJSON(county, countyStyle);

  map2.huc10Layer = L.geoJSON(huc10, huc10Style);

  map2.huc12Layer = L.geoJSON(huc12, huc12Style);

  map2.sedimentBudgetLayer = L.geoJSON(sendimentBudget, sendimentBudgetStyle);

  // coastline scope

  map2.shorelineBaseLayer = L.geoJSON(shorelineBase,
    shorelineBaseStyle).bringToFront();
  map2.shorelineBaseLayer.addTo(map2);

  // need to change to circle marker
  map2.pickPointLayer = L.geoJSON(null,
    {style: pickPointStyle,
      pointToLayer: (feature, latlng) => L.circleMarker(latlng),
    });
  map2.pickPointLayer.addTo(map2);

  map2.colorLayer = null;
  map2.finalSimLayer = null;

  // initialize legend
  map2.legend = L.control({position: 'bottomright'});

  // add back button
  const backView = L.control({position: 'topleft'});
  backView.onAdd = (map2) => {
    return backButtonStyle(map2);
  };
  backView.addTo(map2);

  // layer control
  map2.countyLayer.addTo(map2); // need to add it to map2 in order to have this layer show up when initialize

  const layerControl = {
    'Census Tract': map2.censusTractLayer,
    'County': map2.countyLayer,
    'HUC 10': map2.huc10Layer,
    'HUC12': map2.huc12Layer,
    'Sediment Budget': map2.sedimentBudgetLayer,
  };

  // if only have one tile layer
  // L.control.layers(null, layerControl).addTo(map);

  // multiple tile layer
  L.control.layers(baseMaps2, layerControl).addTo(map2);

  // add scale bar
  L.control.scale().addTo(map2);

  // make the zoom level fit different browser size
  // always focus on the buffer zone when initialize the map
  const zoomRef = turf.buffer(dataBoundary, 20);
  map2.zoomRefLayer = L.geoJSON(zoomRef);
  map2.fitBounds(map2.zoomRefLayer.getBounds());

  // always put coastal layer on the top when adding new layers to the map2
  map2.addEventListener('overlayadd', () => {
    map2.shorelineBaseLayer.bringToFront();
    if (map2.colorLayer !== null) {
      map2.colorLayer.bringToFront();
    }
    map2.dataBoundaryLayer.bringToFront();
  });

  // read the original start and end points
  const shorePoints = shorelineBase.features[0].geometry.coordinates;
  const mid = shorePoints[Math.floor(shorePoints.length / 2)]; // might be .5, so get the integer part

  // add a layer for markers
  map2.markerLayer = L.layerGroup();
  map2.markerLayer.addTo(map2);

  // call the calculation part
  handleSimilarityCalculations(mid, map2, shorelineBase);

  return map2;
}


// legend for resolution score

function legend1Style(map, colorScale, divname) {
  const legendDiv = document.createElement('div'); // abstract html div tag
  legendDiv.classList.add('legend'); // div class
  legendDiv.innerHTML = '<h4 class="legendTitle">Legend</h4>'; // add html content

  const legendContent = document.createElement('div'); // abstract html div tag
  legendContent.classList.add(divname); // div class

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

// legend for unit color

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

  legendContent.appendChild(unitColorLegendDiv);
}

// legend for similarity color

function legend3Style(map, colorScale, min, max) {
  const legendContent = document.querySelector('.legend-content-sim');

  // when reset, need to remove the previous legend first
  if (legendContent.querySelector('.similarity-legend') !== null) {
    const oldLegend = legendContent.querySelector('.similarity-legend');
    legendContent.removeChild(oldLegend);
  }

  // create a new div to hold similarity legend
  const similarityColorLegendDiv = document.createElement('div');
  similarityColorLegendDiv.classList.add('similarity-legend');
  similarityColorLegendDiv.innerHTML = `
    <strong><p>Similarity</p></strong>
    <div class="colorTextPair">
    <div class="catColorBox" style="background-color: rgba(255,207,77,0.8)"></div>
    <p class="catText">Coastline within Selected Range</p>
    </div>
  `;

  legendContent.appendChild(similarityColorLegendDiv);
}

// back button
function backButtonStyle(map) {
  const backDiv = document.createElement('div');
  backDiv.classList.add('back-button'); // div class
  backDiv.title = 'Back'; // this will be shown when cursor hover over the button
  backDiv.innerHTML = `<svg id="back" width="23px" height="18px" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" fill="#3d3d3d" stroke="#3d3d3d" stroke-width="33.792"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path fill="#474747" d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64z"></path><path fill="#474747" d="m237.248 512 265.408 265.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312L237.248 512z"></path></g></svg>`;

  backDiv.addEventListener('click', () => {
    resetAllStyles(map);
  });
  return backDiv;
}

function resetAllStyles(map) {
  map.fitBounds(map.zoomRefLayer.getBounds());
}

export {
  initializeMap,
  initializeSimilarAreaMap,
  legend1Style,
  legend2Style,
  legend3Style,
};
