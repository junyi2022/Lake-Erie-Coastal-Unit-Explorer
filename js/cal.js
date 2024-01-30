/* globals turf, shpwrite */
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

import { average } from './model.js';
import { sedimentLossModel } from './model.js';
import { sedimentGainModel } from './model.js';

// list all the dropdown's avaliable models and associated properties
const modelFuncs = {
  'sl': sedimentLossModel,
  'sg': sedimentGainModel,
};

const modelProps = {
  'sl': 'normalsedimentLoss',
  'sg': 'normalsedimentGain',
};

const modelName = {
  'sl': 'Normalized Sediment Loss',
  'sg': 'Normalized Sediment Gain',
};

// color scale for the resolution
// more info at: https://d3js.org/d3-interpolate/color#interpolateRgb
const colorScale = d3.interpolateRgbBasis(['rgb(240, 232, 170)', 'rgb(109, 212, 211)', 'rgb(125, 173, 255)', 'rgb(124, 102, 255)']);
window.colorScale = colorScale;

// color scale for the unit
const unitColorScale = d3.interpolateRgbBasis(['rgb(255, 207, 77)', 'rgb(252, 156, 76)', 'rgb(252, 93, 76)']);
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

// get step 1 buttons
const startButton = document.querySelector('.select-point');
const finishButton = document.querySelector('.finish-point');
// get step 2 input boxes
const step2Form = document.querySelector('.step-two-form');
const resolutionBox = document.querySelector('.resolution');
const firstDrop = document.querySelector('#first-piority');
const secondDrop = document.querySelector('#second-piority');
const unitDrop = document.querySelector('.unit');
const dropdownAll = document.getElementsByClassName('piority'); // all dropdown boxes
const generateResButton = document.querySelector('.generate-resolution');
const finishResButton = document.querySelector('.finish-resolution');
// get step 3 stuff
const categoryBox = document.querySelector('.category');
const generateGroupButton = document.querySelector('.generate-group');
const finishGroupButton = document.querySelector('.finish-group');
// get step 4 stuff
const downloadButton = document.querySelector('.download-unit');
const fileTypeSelect = document.querySelector('.file-type');


// currently each step is set within the previous step, so at the end there will be a lot of indentations
// This is intentional and will be easier to control the buttons in each step

// map.js will cal this function
function handlePointSelection(start, end, map, shorelineBase) {
  // get the turf string of coastal base for calculation
  const coastLine = turf.lineString(shorelineBase.features[0].geometry.coordinates);

  // handle start button
  startButton.addEventListener('click', () => {
    handleMapSelection();
  });

  // start button event
  function handleMapSelection() {
    // clear any existing features / reset
    map.flyToBounds(map.zoomRefLayer.getBounds());
    map.markerLayer.clearLayers();
    if (map.sliceLayer !== null) {
      map.sliceLayer.clearLayers();
    }

    // draggable markers part
    const [startMarker, endMarker] = initializeEndPoints();

    startMarker.addEventListener('dragend', () => {
      handleMarkerSnap(startMarker);
    });

    endMarker.addEventListener('dragend', () => {
      handleMarkerSnap(endMarker);
    });

    // next button part after user selected the area
    // this button is set within the start button to make sure nothing will happen if people do not "start"
    finishButton.addEventListener('click', () => {
      doSomethingWithEndpoints(startMarker.getLatLng(), endMarker.getLatLng(), coastLine);
    });
  }

  // add start and end marker to the end of the shoreline
  function initializeEndPoints() {
    // start and end are inputs from map.js
    const startMarker = L.marker([start[1], start[0]], {
      draggable: true,
      icon: markerIcon,
    }).addTo(map.markerLayer);
    const endMarker = L.marker([end[1], end[0]], {
      draggable: true,
      icon: markerIcon,
    }).addTo(map.markerLayer);
    return [startMarker, endMarker];
  }

  // snap the maker to the nearest point on the coastal line after user drag markers
  function handleMarkerSnap(marker) {
    const newPoint = marker.getLatLng(); // get the coordinates of the final marker

    const newPointTurf = turf.point([newPoint.lng, newPoint.lat]); // turf coordinates are the opposite of leaflet
    const snappedPoint = turf.nearestPointOnLine(coastLine, newPointTurf);

    // reset marker location after dragged, snap to nearest point
    marker.setLatLng([snappedPoint.geometry.coordinates[1], snappedPoint.geometry.coordinates[0]]); // reset the location of the marker
  }

  // handle start and end marker points after user moved them
  function doSomethingWithEndpoints(newStart, newEnd, coastLine) {
    // translate from leaflet to turf
    const startPointForCut = turf.point([newStart.lng, newStart.lat]);
    const endPointForCut = turf.point([newEnd.lng, newEnd.lat]);

    // selected coastline
    const coastalSliced = turf.lineSlice(startPointForCut, endPointForCut, coastLine);
    map.sliceLayer.addData(coastalSliced);

    // enable step 2 input boxes
    resolutionBox.disabled = false;
    unitDrop.disabled = false;
    for (const i of dropdownAll) {
      i.disabled = false;
    }
    // disable step 1 buttons
    startButton.disabled = true;
    finishButton.disabled = true;

    // set map zoom to the selected chunk
    const zoomSliced = turf.buffer(coastalSliced, 2);
    const [minLon, minLat, maxLon, maxLat] =turf.bbox(zoomSliced);
    map.flyToBounds([[minLat, minLon], [maxLat, maxLon]]);

    // handle inputs from form
    generateResButton.addEventListener('click', () => {
      handleCalculations();
    });

    // divide the slice into certain length
    // need to change units first because the default lineChunk unit is km
    function getResolution() {
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

    // actual calculations
    function handleCalculations() {
      if (map.colorLayer !== null) {
        map.colorLayer.clearLayers();
      }
      // check all the boxes are filled
      // process to the calculations when we have everything
      if (step2Form.reportValidity() == false) {
        return; // this just means stop
      }

      const resolutionCollection = getResolution(); // feature collection of a lot of linestrings

      // need to add ID to these line for identification later
      for (let i = 0; i < resolutionCollection.features.length; i++) {
        resolutionCollection.features[i].properties.ID = i;
      }

      // calculation each subcategory's score

      // only call the model that is selected, and only add those properties
      const firstPriorityFunc = modelFuncs[firstDrop.value];
      firstPriorityFunc(map, resolutionCollection);
      const secondPriorityFunc = modelFuncs[secondDrop.value];
      secondPriorityFunc(map, resolutionCollection);

      // calculate final score for each coastline piece and add that as properties
      const firstProp = modelProps[firstDrop.value];
      const secondProp = modelProps[secondDrop.value];

      for (const coastline of resolutionCollection.features) {
        const finalValue = coastline.properties[firstProp] * 0.6 + coastline.properties[secondProp] * 0.4;
        coastline.properties.finalValue = finalValue;
      }

      // add the resolution data to map and color that based on the final score of each coastline piece
      map.colorLayer = L.geoJSON(resolutionCollection, {
        style: (sample) => {
          const colorValue = colorScale(sample.properties.finalValue);
          return {
            stroke: true,
            color: colorValue,
            weight: 3,
          };
        },
      }).addTo(map);

      console.log(resolutionCollection);

      // process to the following step if user click next
      finishResButton.addEventListener('click', () => {
        startGroupRes();
      });

      function startGroupRes() {
        // enable step 3 box
        categoryBox.disabled = false;
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
          handleGroupRes();
        });

        function handleGroupRes() {
          if (map.finalUnitLayer !== null) {
            map.finalUnitLayer.clearLayers();
          }
          const catNum = parseInt(categoryBox.value);
          console.log(catNum);
          // get arrays of resolution that supposed to be grouped
          const resGroupArray = resToGroupArray(resolutionCollection, catNum);
          console.log(resGroupArray);
          // join line together as array
          const featureCollectionArray = arrayOfGroupsToArrayOfLines(resGroupArray, firstProp, secondProp);
          console.log(featureCollectionArray);
          // get final feature collection
          const units = turf.featureCollection(featureCollectionArray);
          // display box
          const unitsBox = getResolutionBoxes(units, 0.5);
          console.log(unitsBox);
          // style the boxes
          const firstPropName = modelName[firstDrop.value];
          const secondPropName = modelName[secondDrop.value];
          map.finalUnitLayer = L.geoJSON(unitsBox, {
            style: (sample) => {
              const colorValue = unitColorScale(sample.properties.unit / catNum);
              return {
                stroke: true,
                fill: false,
                color: colorValue,
                weight: 3,
              };
            },
          }).bindTooltip((l) => { // final unit box tooltip options
            return `<p class="unit-tooltip"><strong>Unit:</strong> ${l.feature.properties.unit}</p>`;
          }).bindPopup((l) => { // final unit box popup options
            return `<h3 class="unit-pop-title">Unit: ${l.feature.properties.unit}</h3>
                    <p class="unit-finalscore"><strong>Final Score:</strong> ${l.feature.properties.finalScore.toFixed(2)}</p>
                    <p class="unit-first-priority"><strong>${firstPropName}:</strong> ${l.feature.properties[firstProp].toFixed(2)}</p>
                    <p class="unit-second-priority"><strong>${secondPropName}:</strong> ${l.feature.properties[secondProp].toFixed(2)}</p>
            `;
          }).addTo(map);

          // finish unit step and go to next step
          finishGroupButton.addEventListener('click', () => {
            fileTypeSelect.disabled = false;
            downloadButton.disabled = false;
          });

          // download button handeler
          downloadButton.addEventListener('click', () => {
            handleDownload();
          });

          // handle download
          // need to be an async function because in the shapefile download part shpwrite.zip generate a promise, and need await for that promise to be down (similar to fetch, also a promise)
          async function handleDownload() {
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
        }
      }
    }
  }
}

// get end points from single lineString
function getStartEndPointsFromLine(lineString) { // returns point's coordinate arrays
  const linePoints = lineString.geometry.coordinates;
  const start = linePoints[0];
  const end = linePoints[linePoints.length - 1];
  return [start, end];
}

// get box within certain distance to prepare for overlap analysis when assigning values
function getResolutionBoxes(Collection, num) {
  const allBoxes = [];
  for ( const i of Collection.features) {
    // if want to see the length of each chunk
    // const length = turf.length(i);
    // console.log(length);

    // simplify the coastaline
    const [simpleIStart, simpleIEnd] = getStartEndPointsFromLine(i);
    const simpleI = turf.lineString([simpleIStart, simpleIEnd]);
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

    // if want to see each individual line
    // L.geoJSON(offsetLine1).addTo(map);
    // L.geoJSON(connectLine2, {color: 'red'}).addTo(map);
    // L.geoJSON(offsetLine2, {color: 'green'}).addTo(map);
    // L.geoJSON(connectLine4, {color: 'pink'}).addTo(map);

    const resolutionBoxLines = turf.featureCollection([offsetLine1, connectLine2, offsetLine2, connectLine4]);
    const resolutionBox = turf.polygonize(resolutionBoxLines);

    // add all the properties from line to box
    resolutionBox.features[0].properties = i.properties;

    allBoxes.push(resolutionBox.features[0]); // .features[0] can avoid the situation of feature collection within feature collection
  }
  const allBoxesCollection = turf.featureCollection(allBoxes);
  return allBoxesCollection;
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
    const eachResScore = resolutionCollection.features[i].properties.finalValue;
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

function arrayOfGroupsToArrayOfLines(resGroupArray, firstProp, secondProp) {
  const featureCollectionArray = [];
  // prepare the properties name for later use
  const firstPriorityValName = firstProp;
  const secondPriorityValName = secondProp;

  for (const eachGroup of resGroupArray) {
    // if group only has one string
    if (eachGroup.length == 1) {
      // need to redo the properties to make it stay the same as the multiple res part's result
      // have a copy of original object
      const newUnit = {...eachGroup[0]}; // spread operator
      // clear target object's proper and add new
      newUnit.properties = {};
      newUnit.properties.unit = eachGroup[0].properties.unit;
      newUnit.properties.finalScore = eachGroup[0].properties.finalValue;
      // use the piority selection to add properties name
      newUnit.properties[firstPriorityValName] = eachGroup[0].properties[firstProp];
      newUnit.properties[secondPriorityValName] = eachGroup[0].properties[secondProp];
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
    const finalValueArray = eachGroup.map((f) => f.properties.finalValue);
    const finalValueAverage = average(finalValueArray);
    // first piority value to add to properties
    const firstDropArray = eachGroup.map((f) => f.properties[firstProp]);
    const firstDropAverage = average(firstDropArray);
    // second piority value to add to properties
    const secondDropArray = eachGroup.map((f) => f.properties[secondProp]);
    const secondDropAverage = average(secondDropArray);

    // create the geojson structure
    const combineLine = {'type': 'Feature', 'properties': {'unit': eachGroup[0].properties.unit, 'finalScore': finalValueAverage}, 'geometry': {'type': 'LineString', 'coordinates': coorArray}};
    // need to add the properties name based on piority selection
    combineLine.properties[firstPriorityValName] = firstDropAverage;
    combineLine.properties[secondPriorityValName] = secondDropAverage;
    featureCollectionArray.push(combineLine);
  }
  return featureCollectionArray;
}

export {
  handlePointSelection,
  getResolutionBoxes,
};


