/* globals turf, shpwrite */
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

import { average } from './model.js';
import { sedimentLossModel, sedimentGainModel, erosionPotentialModel, habitatProtectionModel, wetlandProtectionRestorationModel, socialVulnerabilityModel } from './model.js';
import { legend1Style, legend2Style } from './map.js';
import { handleDropdownDisplay, withSpinnerDo, unitInputRange } from './logistics.js';

// list all the dropdown's avaliable models and associated properties
const modelFuncs = {
  'sl': sedimentLossModel,
  'sg': sedimentGainModel,
  'ep': erosionPotentialModel,
  'hp': habitatProtectionModel,
  'wpr': wetlandProtectionRestorationModel,
  'sv': socialVulnerabilityModel,
};

const modelProps = {
  'sl': 'normalsedimentLoss',
  'sg': 'normalsedimentGain',
  'ep': 'normalerosionPotential',
  'hp': 'normalhabitatProtection',
  'wpr': 'normalwetlandProtectionRestoration',
  'sv': 'normalsocialVulnerability',
};

const modelName = {
  'sl': 'Normalized Sediment Loss',
  'sg': 'Normalized Sediment Gain',
  'ep': 'Normalized Erosion Potential',
  'hp': 'Normalized Habitat Protection',
  'wpr': 'Normalized Wetland Protection/Restoration',
  'sv': 'Normalized Social Vulnerability',
};

// color scale for the resolution
// more info at: https://d3js.org/d3-interpolate/color#interpolateRgb
const colorScale = d3.interpolateRgbBasis(['rgb(140, 152, 255)', 'rgb(154, 220, 255)', 'rgb(211, 250, 192)', 'rgb(255, 214, 169)', 'rgb(255, 155, 144)']);
window.colorScale = colorScale;

// color scale for the unit
const unitColorScale = d3.interpolateRgbBasis(['rgb(140, 152, 255)', 'rgb(154, 220, 255)', 'rgb(211, 250, 192)', 'rgb(255, 214, 169)', 'rgb(255, 155, 144)']);
window.unitColorScale = unitColorScale;

// marker icon
const markerIcon = L.icon({
  iconUrl: 'img/ScissorsMarker.png',
  iconSize: [30, 45], // size of the icon
  iconAnchor: [15, 45], // point of the icon which will correspond to marker's location
  popupAnchor: [0, -35], // point from which the popup should open relative to the iconAnchor
});

// shapefile download setting
const shpOptions = {
  folder: 'download_unit_shp',
  filename: 'unit_result',
  outputType: 'blob',
  compression: 'DEFLATE',
  types: {
    // point: 'mypoints',
    // polygon: 'mypolygons',
    polyline: 'Coastline By Unit',
  },
};

// unit generator inputs

// get step 1 buttons
const startButton = document.querySelector('.select-point');
const finishButton = document.querySelector('.finish-point');
// get step 2 input boxes
const step2Form = document.querySelector('.step-two-form');
const resolutionBox = document.querySelector('.resolution');
const firstDrop = document.querySelector('#first-priority');
const secondDrop = document.querySelector('#second-priority');
const thirdDrop = document.querySelector('#third-priority');
const unitDrop = document.querySelector('.unit');
const dropdownAll = document.getElementsByClassName('priority'); // all dropdown boxes
const generateResButton = document.querySelector('.generate-resolution');
const finishResButton = document.querySelector('.finish-resolution');
// get step 3 stuff
const categoryBox = document.querySelector('.category');
const generateGroupButton = document.querySelector('.generate-group');
const finishGroupButton = document.querySelector('.finish-group');
// get step 4 stuff
const downloadButton = document.querySelector('.download-unit');
const fileTypeSelect = document.querySelector('.file-type');

// similar finder inputs
// get step 1 buttons
const startButtonSim = document.querySelector('.select-point-sim');
const finishButtonSim = document.querySelector('.finish-point-sim');


// map.js will cal this function for unit generator
function handleAllCalculations(start, end, map, shorelineBase) {
  // get the turf string of coastal base for calculation
  const coastLine = turf.lineString(shorelineBase.features[0].geometry.coordinates);

  // handle start button
  startButton.addEventListener('click', () => {
    handleMapSelection(map, start, end, coastLine);
  });
}

// map.js will cal this function for similarity finder
function handleSimilarityCalculations(mid, map2, shorelineBase) {
  const coastLine = turf.lineString(shorelineBase.features[0].geometry.coordinates);

  startButtonSim.addEventListener('click', () => {
    handleSimilarityMapSelection(map2, mid, coastLine);
  });
}

// subfunctions collection in the sequence of unit generator steps

// step 1 functions

// step 1 botton manipulation part

function handleMapSelection(map, start, end, coastLine) {
  // clear any existing features / reset
  map.flyToBounds(map.zoomRefLayer.getBounds());
  map.markerLayer.clearLayers();
  if (map.sliceLayer !== null) {
    map.sliceLayer.clearLayers();
  }

  // draggable markers part
  const [startMarker, endMarker] = initializeMarkers(map, [start, end]);

  startMarker.addEventListener('dragend', () => {
    handleMarkerSnap(coastLine, startMarker);
  });

  endMarker.addEventListener('dragend', () => {
    handleMarkerSnap(coastLine, endMarker);
  });

  // next button part after user selected the area
  // this button is set within the start button to make sure nothing will happen if people do not "start"
  finishButton.addEventListener('click', () => {
    withSpinnerDo(() => {
      doSomethingWithEndpoints(startMarker.getLatLng(), endMarker.getLatLng(), coastLine, map);
    });
  });
}

function handleSimilarityMapSelection(map2, mid, coastLine) {
  // clear any existing features / reset
  map2.flyToBounds(map2.zoomRefLayer.getBounds());
  map2.markerLayer.clearLayers();

  // draggable markers part
  const [midMarker] = initializeMarkers(map2, [mid]); // will return an array, so need to destructure it

  midMarker.addEventListener('dragend', () => {
    handleMarkerSnap(coastLine, midMarker);
  });

  // next button part after user selected a point
  // this button is set within the start button to make sure nothing will happen if people do not "start"
  // finishButton.addEventListener('click', () => {
  //   withSpinnerDo(() => {
      
  //   });
  // });
}


// step 1 supporting functions

// add start and end marker to the end of the shoreline

function initializeMarkers(map, points) { // can handle unknown number of points
  // points is an array of [longitude, latitude] pairs
  const markers = points.map((point) => {
    const marker = L.marker([point[1], point[0]], {
      draggable: true,
      icon: markerIcon,
    }).addTo(map.markerLayer);
    return marker;
  });
  return markers;
}


// snap the maker to the nearest point on the coastal line after user drag markers
function handleMarkerSnap(coastLine, marker) {
  const newPoint = marker.getLatLng(); // get the coordinates of the final marker

  const newPointTurf = turf.point([newPoint.lng, newPoint.lat]); // turf coordinates are the opposite of leaflet
  const snappedPoint = turf.nearestPointOnLine(coastLine, newPointTurf);

  // reset marker location after dragged, snap to nearest point
  marker.setLatLng([snappedPoint.geometry.coordinates[1], snappedPoint.geometry.coordinates[0]]); // reset the location of the marker
}


// step for resolution functions

// step for resolution botton manipulation part

// handle start and end marker points after user moved them
function doSomethingWithEndpoints(newStart, newEnd, coastLine, map) {
  // disable step 1 buttons
  startButton.disabled = true;
  finishButton.disabled = true;

  // translate from leaflet to turf
  const startPointForCut = turf.point([newStart.lng, newStart.lat]);
  const endPointForCut = turf.point([newEnd.lng, newEnd.lat]);

  // selected coastline
  const coastalSliced = turf.lineSlice(startPointForCut, endPointForCut, coastLine);
  map.sliceLayer.addData(coastalSliced);

  // enable step 2 input boxes
  resolutionBox.disabled = false;
  unitDrop.disabled = false;

  // handle setp 2 dropdown options
  firstDrop.disabled = false;
  firstDrop.addEventListener('change', () => {
    const firstDropChoice = firstDrop.value;
    handleDropdownDisplay(secondDrop, [firstDropChoice]);
    secondDrop.disabled = false;
  });

  secondDrop.addEventListener('change', () => {
    const firstDropChoice = firstDrop.value;
    const secondDropChoice = secondDrop.value;
    handleDropdownDisplay(thirdDrop, [firstDropChoice, secondDropChoice]);
    thirdDrop.disabled = false;
  });


  // set map zoom to the selected chunk
  const zoomSliced = turf.buffer(coastalSliced, 2);
  const [minLon, minLat, maxLon, maxLat] =turf.bbox(zoomSliced);
  map.flyToBounds([[minLat, minLon], [maxLat, maxLon]]);

  // handle inputs from form
  generateResButton.addEventListener('click', () => {
    withSpinnerDo(() => {
      handleCalculations(map, coastalSliced);
    });
  });
}

// step for resolution calculation part

// actual res calculations
function handleCalculations(map, coastalSliced) {
  if (map.colorLayer !== null) {
    map.colorLayer.clearLayers();
  }

  // check all the boxes are filled
  // process to the calculations when we have everything
  if (step2Form.reportValidity() == false) {
    return; // this just means stop
  }

  const resolutionCollection = getResolution(coastalSliced); // feature collection of a lot of linestrings
  console.log(resolutionCollection);

  // need to add ID to these line for identification later
  for (let i = 0; i < resolutionCollection.features.length; i++) {
    resolutionCollection.features[i].properties.ID = i;
  }

  // calculation each subcategory's score

  // only call the model that is selected, and only add those properties
  const firstPriorityFunc = modelFuncs[firstDrop.value];
  firstPriorityFunc(map, resolutionCollection);
  if (secondDrop.value != 'ns') {
    const secondPriorityFunc = modelFuncs[secondDrop.value];
    secondPriorityFunc(map, resolutionCollection);
  }
  if (thirdDrop.value != 'ns') {
    const thirdPriorityFunc = modelFuncs[thirdDrop.value];
    thirdPriorityFunc(map, resolutionCollection);
  }


  // calculate final score for each coastline piece and add that as properties
  const firstProp = modelProps[firstDrop.value];
  const secondProp = modelProps[secondDrop.value];
  const thirdProp = modelProps[thirdDrop.value];

  for (const coastline of resolutionCollection.features) {
    if (secondDrop.value == 'ns') {
      const finalValue = coastline.properties[firstProp];
      coastline.properties.finalValue = finalValue;
    } else if (thirdDrop.value == 'ns') {
      const finalValue = coastline.properties[firstProp] * 0.6 + coastline.properties[secondProp] * 0.4;
      coastline.properties.finalValue = finalValue;
    } else {
      const finalValue = coastline.properties[firstProp] * 0.5 + coastline.properties[secondProp] * 0.3 + coastline.properties[thirdProp] * 0.2;
      coastline.properties.finalValue = finalValue;
    }
  }

  // The final value now may be skewed, need to normalize it to make sure it will be between 0 and 1
  const finalValueArray = resolutionCollection.features.map((f) => f.properties.finalValue); // map will return an array of all the properties.finalValue

  // calculate the min max of the values
  const min = Math.min(...finalValueArray); // ...flatten the array because min/max doesn't take array
  const max = Math.max(...finalValueArray);

  // here use power scale
  const scaleFunc = d3.scalePow([min, max], [0, 1]).exponent(1); // need to map to 0 to 1 because the later color scale only take numbers between 0 and 1
  // add the normalized value to each coastline properties
  for (const coastline of resolutionCollection.features) {
    coastline.properties.finalValueNormal = scaleFunc(coastline.properties.finalValue);
  }


  // add the resolution data to map and color that based on the final score of each coastline piece
  map.colorLayer = L.geoJSON(resolutionCollection, {
    style: (sample) => {
      const colorValue = colorScale(sample.properties.finalValueNormal);
      return {
        stroke: true,
        color: colorValue,
        weight: 3,
      };
    },
  }).addTo(map);

  // add legend for the resolution box
  map.legend.onAdd = (map) => {
    return legend1Style(map, colorScale);
  };
  map.legend.addTo(map);

  console.log(resolutionCollection);


  // process to the following step if user click next
  finishResButton.addEventListener('click', () => {
    startGroupRes(map, resolutionCollection, firstProp, secondProp, thirdProp);
  });
}

// step for resolution supporting functions

// divide the slice into certain length
// need to change units first because the default lineChunk unit is km
function getResolution(coastalSliced) {
  // read all the inputting values
  const resolution = resolutionBox.value;
  const unitType = unitDrop.value;
  if (unitType == 'ft') {
    const resolutionCal = resolution * 0.0003048; // ft to km
    const resolutionCollection = turf.lineChunk(coastalSliced, resolutionCal); // unit here is km
    return resolutionCollection;
  } if (unitType == 'm') {
    const resolutionCal = resolution / 1000; // m to km
    const resolutionCollection = turf.lineChunk(coastalSliced, resolutionCal); // unit here is km
    return resolutionCollection;
  }
}


// step for category grouping functions

// step for category grouping botton manipulation part

// prepare and call category grouping functions
function startGroupRes(map, resolutionCollection, firstProp, secondProp, thirdProp) {
  // enable step 3 box
  categoryBox.disabled = false;
  // prevent people from entering invalid number
  unitInputRange(categoryBox);
  // disable step 2 buttons
  finishResButton.disabled = true;
  generateResButton.disabled = true;
  resolutionBox.disabled = true;
  unitDrop.disabled = true;
  for (const i of dropdownAll) {
    i.disabled = true;
  }

  // handle inputs from form
  generateGroupButton.addEventListener('click', () => {
    if (categoryBox.value == '') {
      alert('Please enter a value.');
      return;
    }
    handleGroupRes(map, resolutionCollection, firstProp, secondProp, thirdProp);
  });
}

// step for category grouping calculation part

function handleGroupRes(map, resolutionCollection, firstProp, secondProp, thirdProp) {
  if (map.finalUnitLayer !== null) {
    map.finalUnitLayer.clearLayers();
  }
  const catNum = parseInt(categoryBox.value);
  console.log(catNum);

  // add unit legend
  legend2Style(map, unitColorScale, catNum);
  // get arrays of resolution that supposed to be grouped
  const resGroupArray = resToGroupArray(resolutionCollection, catNum);
  console.log(resGroupArray);
  // join line together as array
  const featureCollectionArray = arrayOfGroupsToArrayOfLines(resGroupArray, firstProp, secondProp, thirdProp);
  console.log(featureCollectionArray);
  // get final feature collection
  const units = turf.featureCollection(featureCollectionArray);

  // need to add ID as unit numbering
  for (let i = 0; i < units.features.length; i++) {
    units.features[i].properties.ID = i;
  }
  // console.log(unitsBox);
  console.log(units);

  // style the units, adjust pop up based on number of selected priorities
  const firstPropName = modelName[firstDrop.value];
  if (secondDrop.value == 'ns') {
    map.finalUnitLayer = L.geoJSON(units, {
      style: (sample) => {
        const colorValue = unitColorScale((sample.properties.unit - 1) / (catNum - 1));
        return {
          stroke: true,
          color: colorValue,
          weight: 23,
          opacity: 0.8,
          lineCap: 'butt',
        };
      },
    }).bindTooltip((l) => { // final unit box tooltip options
      return `<p class="unit-tooltip"><strong>Group:</strong> ${l.feature.properties.unit}</p>`;
    }).bindPopup((l) => { // final unit box popup options
      return `<h3 class="unit-pop-title">Unit: ${l.feature.properties.ID + 1}</h3>
              <p class="unit-finalscore"><strong>Group:</strong> ${l.feature.properties.unit}</p>
              <p class="unit-finalscore"><strong>Final Score:</strong> ${l.feature.properties.finalScore.toFixed(2)}</p>
              <p class="unit-first-priority"><strong>${firstPropName}:</strong> ${l.feature.properties[firstProp].toFixed(2)}</p>
      `;
    }).addTo(map);
    map.colorLayer.bringToFront();
  } else if (thirdDrop.value == 'ns') {
    const secondPropName = modelName[secondDrop.value];
    map.finalUnitLayer = L.geoJSON(units, {
      style: (sample) => {
        const colorValue = unitColorScale((sample.properties.unit - 1) / (catNum - 1));
        return {
          stroke: true,
          color: colorValue,
          weight: 23,
          opacity: 0.8,
          lineCap: 'butt',
        };
      },
    }).bindTooltip((l) => { // final unit box tooltip options
      return `<p class="unit-tooltip"><strong>Group:</strong> ${l.feature.properties.unit}</p>`;
    }).bindPopup((l) => { // final unit box popup options
      return `<h3 class="unit-pop-title">Unit: ${l.feature.properties.ID + 1}</h3>
              <p class="unit-finalscore"><strong>Group:</strong> ${l.feature.properties.unit}</p>
              <p class="unit-finalscore"><strong>Final Score:</strong> ${l.feature.properties.finalScore.toFixed(2)}</p>
              <p class="unit-first-priority"><strong>${firstPropName}:</strong> ${l.feature.properties[firstProp].toFixed(2)}</p>
              <p class="unit-second-priority"><strong>${secondPropName}:</strong> ${l.feature.properties[secondProp].toFixed(2)}</p>
      `;
    }).addTo(map);
    map.colorLayer.bringToFront();
  } else {
    const secondPropName = modelName[secondDrop.value];
    const thirdPropName = modelName[thirdDrop.value];
    map.finalUnitLayer = L.geoJSON(units, {
      style: (sample) => {
        const colorValue = unitColorScale((sample.properties.unit - 1) / (catNum - 1));
        return {
          stroke: true,
          color: colorValue,
          weight: 23,
          opacity: 0.8,
          lineCap: 'butt',
        };
      },
    }).bindTooltip((l) => { // final unit box tooltip options
      return `<p class="unit-tooltip"><strong>Group:</strong> ${l.feature.properties.unit}</p>`;
    }).bindPopup((l) => { // final unit box popup options
      return `<h3 class="unit-pop-title">Unit: ${l.feature.properties.ID + 1}</h3>
              <p class="unit-finalscore"><strong>Group:</strong> ${l.feature.properties.unit}</p>
              <p class="unit-finalscore"><strong>Final Score:</strong> ${l.feature.properties.finalScore.toFixed(2)}</p>
              <p class="unit-first-priority"><strong>${firstPropName}:</strong> ${l.feature.properties[firstProp].toFixed(2)}</p>
              <p class="unit-second-priority"><strong>${secondPropName}:</strong> ${l.feature.properties[secondProp].toFixed(2)}</p>
              <p class="unit-second-priority"><strong>${thirdPropName}:</strong> ${l.feature.properties[thirdProp].toFixed(2)}</p>
      `;
    }).addTo(map);
    map.colorLayer.bringToFront();
  }


  // finish unit step and go to next step
  finishGroupButton.addEventListener('click', () => {
    fileTypeSelect.disabled = false;
    downloadButton.disabled = false;
  });

  // download button handeler
  downloadButton.addEventListener('click', () => {
    handleDownload(units);
  });
}

// step for category grouping supporting functions

function arrayOfGroupsToArrayOfLines(resGroupArray, firstProp, secondProp, thirdProp) {
  const featureCollectionArray = [];
  for (const eachGroup of resGroupArray) {
    // if group only has one string
    if (eachGroup.length == 1) {
      // need to redo the properties to make it stay the same as the multiple res part's result
      // have a copy of original object
      const newUnit = {...eachGroup[0]}; // spread operator
      // clear target object's proper and add new
      newUnit.properties = {};
      newUnit.properties.unit = eachGroup[0].properties.unit;
      newUnit.properties.finalScore = eachGroup[0].properties.finalValueNormal;

      // use the priority selection to add properties name
      newUnit.properties[firstProp] = eachGroup[0].properties[firstProp];
      if (secondDrop.value != 'ns') {
        newUnit.properties[secondProp] = eachGroup[0].properties[secondProp];
      }
      if (thirdDrop.value != 'ns') {
        newUnit.properties[thirdProp] = eachGroup[0].properties[thirdProp];
      }

      featureCollectionArray.push(newUnit);
      continue; // save else indentation
    }
    // group has multiple strings
    let coorArray = [];
    for (let i = 0; i < eachGroup.length; i++) { // add coordinates together after removing the first point of each string
      if (i == 0) { // keep all the coordinates in the first line segment
        coorArray = coorArray.concat(eachGroup[i].geometry.coordinates);
        continue;
      }
      // remove the first point for all other segments
      const coor = eachGroup[i].geometry.coordinates.slice(1);
      coorArray = coorArray.concat(coor);
    }

    // calculate the average values of each joined unit
    // final value to add to properties
    const finalValueArray = eachGroup.map((f) => f.properties.finalValueNormal);
    const finalValueAverage = average(finalValueArray);
    // first priority value to add to properties
    const firstDropArray = eachGroup.map((f) => f.properties[firstProp]);
    const firstDropAverage = average(firstDropArray);
    // second priority value to add to properties
    let secondDropAverage = null;
    if (secondDrop.value != 'ns') {
      const secondDropArray = eachGroup.map((f) => f.properties[secondProp]);
      secondDropAverage = average(secondDropArray);
    }
    // third priority value to add to properties
    let thirdDropAverage = null;
    if (thirdDrop.value != 'ns') {
      const thirdDropArray = eachGroup.map((f) => f.properties[thirdProp]);
      thirdDropAverage = average(thirdDropArray);
    }


    // create the geojson structure
    const combineLine = {'type': 'Feature', 'properties': {'unit': eachGroup[0].properties.unit, 'finalScore': finalValueAverage}, 'geometry': {'type': 'LineString', 'coordinates': coorArray}};
    // need to add the properties name based on priority selection
    combineLine.properties[firstProp] = firstDropAverage;
    if (secondDrop.value != 'ns') {
      combineLine.properties[secondProp] = secondDropAverage;
    }
    if (thirdDrop.value != 'ns') {
      combineLine.properties[thirdProp] = thirdDropAverage;
    }

    featureCollectionArray.push(combineLine);
  }
  return featureCollectionArray;
}

// assign category number to final score's value
function assignCatToScore(score, catNum) {
  const scoreRange = 1 / catNum;
  // if score == 1, it is possible that scoreRange * catNum will never be larger than 1, so need to handle this situation beforehand
  if (score == 1) {
    return catNum;
  }
  for (let i = 1; i <= catNum; i++) {
    if (score <= scoreRange * i) {
      return i;
    }
  }
}

// after having all the resolution lines, we need to group them together into final units
function resToGroupArray(resolutionCollection, catNum) {
  // for (const eachRes of resolutionCollection.features) {
  //   const eachResScore = eachRes.properties.finalValue;
  // }
  let array = [];
  const groupArray = [];
  for (let i = 0; i < resolutionCollection.features.length; i++) {
    const eachResScore = resolutionCollection.features[i].properties.finalValueNormal;
    const eachResCat = assignCatToScore(eachResScore, catNum);
    resolutionCollection.features[i].properties.unit = eachResCat;
    // first res will be different from other
    if (i == 0) {
      array.push(resolutionCollection.features[i]);
    } else {
      if (eachResCat == resolutionCollection.features[i-1].properties.unit) { // in the same unit
        array.push(resolutionCollection.features[i]);
      } else { // not in the same unit
        groupArray.push(array);
        array = [];
        array.push(resolutionCollection.features[i]);
      }
    }
    // handle the situation of last resolution in a different group
    if (i == resolutionCollection.features.length - 1) {
      groupArray.push(array);
    }
  }
  return groupArray;
}


// last step functions

// handle download
// need to be an async function because in the shapefile download part shpwrite.zip generate a promise, and need await for that promise to be down (similar to fetch, also a promise)
async function handleDownload(units) {
  // figure out downloading data type based on dropdown box value
  const fileType = fileTypeSelect.value;
  let blob; // for the browser download
  let fileName; // have it here to be reassigned later for the filename based on selection
  if (fileType == 'geojson') {
    const stringUnit = JSON.stringify(units); // stringfy geojson feature collection
    blob = new Blob([stringUnit], {type: 'application/json'});
    fileName = 'unit.json';
  } if (fileType == 'shapefile') {
    // a GeoJSON bridge for features
    // in the options can have blob as output type
    blob = await shpwrite.zip(
      units, // need geojson here
      shpOptions,
    );
    console.log(blob);
    fileName = 'unit.zip';
  }
  // how to download from blob object
  const url = window.URL.createObjectURL(blob);
  console.log(url);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  // the filename you want
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
}


// Other functions related to model calculations

// get end points from single lineString
function getStartEndPointsFromLine(lineString) { // returns point's coordinate arrays
  const linePoints = lineString.geometry.coordinates;
  const start = linePoints[0];
  const end = linePoints[linePoints.length - 1];
  return [start, end];
}

function getSimplerLineFromLine(lineString) { // returns point's coordinate arrays
  const linePoints = lineString.geometry.coordinates;
  const pointNum = linePoints.length;
  const start = linePoints[0];
  const end = linePoints[pointNum - 1];
  // prepare for the middle points addition
  const pointArray = [];
  pointArray.push(start);

  if (pointNum < 6) {
    return [start, end];
  } else if (pointNum < 40) { // add middle point for line with more than 6 points but less than 20 points
    const chunkLength = Math.floor(pointNum / 2); // calculate the interval of selection and get the integer part
    const mid = linePoints[chunkLength];
    pointArray.push(mid);
    pointArray.push(end);
    return pointArray;
  } else { // more than 20 points, add 4 middle points
    const chunkLength = Math.floor(pointNum / 4); // calculate the interval of selection and get the integer part
    for (let i = chunkLength; i < pointNum - 1; i = i + chunkLength) {
      const midPoint = linePoints[i];
      // Sometimes the last midPoint will be the same as the end point, and turf cannot process that
      if (midPoint[0] !== end[0] || midPoint[1] !== end[1]) {
        pointArray.push(midPoint);
      }
    }
    pointArray.push(end);
    return pointArray;
  }
}

// get box within certain distance to prepare for overlap analysis when assigning values
function getResolutionBoxes(Collection, num) {
  const allBoxes = [];
  for ( const i of Collection.features) {
    // if want to see the length of each chunk
    // const length = turf.length(i);
    // console.log(length);

    // simplify the coastaline
    const simplerArray = getSimplerLineFromLine(i);
    const simpleI = turf.lineString(simplerArray);
    // L.geoJson(simpleI, {color: 'black'}).addTo(map);

    // offset simplified coastline and get end points for each
    const offsetLine1 = turf.lineOffset(simpleI, num); // unit in km
    const offsetLine2 = turf.lineOffset(simpleI, -num); // unit in km
    const [Line1Start, Line1End] = getStartEndPointsFromLine(offsetLine1);
    const [Line2Start, Line2End] = getStartEndPointsFromLine(offsetLine2);

    // draw the additional boundary lines
    // const connectLine1 = turf.lineString([Line1Start, Line1End]);
    const connectLine2 = turf.lineString([Line1End, Line2End]);
    // const connectLine3 = turf.lineString([Line2End, Line2Start]);
    const connectLine4 = turf.lineString([Line2Start, Line1Start]);

    const resolutionBoxLines = turf.featureCollection([offsetLine1, connectLine2, offsetLine2, connectLine4]);

    const resolutionBox = turf.polygonize(resolutionBoxLines);

    // add all the properties from line to box
    resolutionBox.features[0].properties = i.properties;

    allBoxes.push(resolutionBox.features[0]); // .features[0] can avoid the situation of feature collection within feature collection
  }
  const allBoxesCollection = turf.featureCollection(allBoxes);
  return allBoxesCollection;
}


export {
  handleAllCalculations,
  handleSimilarityCalculations,
  getResolutionBoxes,
};


