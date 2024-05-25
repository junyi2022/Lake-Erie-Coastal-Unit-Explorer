/* globals turf, shpwrite */
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

import { average, findClosestData } from './model.js';
import { sedimentLossModel, sedimentGainModel, erosionPotentialModel, habitatProtectionModel, wetlandProtectionRestorationModel, socialVulnerabilityModel } from './model.js';
import { legend1Style, legend2Style } from './map.js';
import { handleDropdownDisplay, withSpinnerDo, unitInputRange } from './logistics.js';
import { modelFuncs, modelProps, modelName, colorScale, unitColorScale, markerIcon, shpOptions } from './cal.js';
import { initializeMarkers, handleMarkerSnap, getFtResolution, munipulateResCollection } from './cal.js';

// similar finder inputs
// get step 1 buttons
const startButtonSim = document.querySelector('.select-point-sim');
const finishButtonSim = document.querySelector('.finish-point-sim');
// get step 2 input boxes
const step2FormSim = document.querySelector('.step-two-form');
const firstDropSim = document.querySelector('#first-priority-sim');
const secondDropSim = document.querySelector('#second-priority-sim');
const thirdDropSim = document.querySelector('#third-priority-sim');
const dropdownAllSim = document.getElementsByClassName('priority-sim'); // all dropdown boxes
const generateResButtonSim = document.querySelector('.generate-resolution-sim');
const finishResButtonSim = document.querySelector('.finish-resolution-sim');


// map.js will cal this function for similarity finder
function handleSimilarityCalculations(mid, map2, shorelineBase) {
  const coastLine = turf.lineString(shorelineBase.features[0].geometry.coordinates);

  startButtonSim.addEventListener('click', () => {
    handleSimilarityMapSelection(map2, mid, coastLine);
  });
}


// function for similarity finder
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
  finishButtonSim.addEventListener('click', () => {
    withSpinnerDo(() => {
      calResForSimilarity(midMarker.getLatLng(), coastLine, map2);
    });
  });
}

// function for similarity finder
// handle start and end marker points after user moved them
function calResForSimilarity(newMid, coastLine, map2) {
  // disable step 1 buttons
  startButtonSim.disabled = true;
  finishButtonSim.disabled = true;

  // map selected point on map
  map2.markerLayer.clearLayers();
  const midPointSelect = turf.point([newMid.lng, newMid.lat]);
  map2.pickPointLayer.addData(midPointSelect);

  // handle setp 2 dropdown options
  firstDropSim.disabled = false;
  firstDropSim.addEventListener('change', () => {
    const firstDropSimChoice = firstDropSim.value;
    handleDropdownDisplay(secondDropSim, [firstDropSimChoice]);
    secondDropSim.disabled = false;
  });

  secondDropSim.addEventListener('change', () => {
    const firstDropSimChoice = firstDropSim.value;
    const secondDropSimChoice = secondDropSim.value;
    handleDropdownDisplay(thirdDropSim, [firstDropSimChoice, secondDropSimChoice]);
    thirdDropSim.disabled = false;
  });

  // handle inputs from form
  generateResButtonSim.addEventListener('click', () => {
    withSpinnerDo(() => {
      handleSimCalculations(midPointSelect, step2FormSim, firstDropSim, secondDropSim, thirdDropSim, map2, coastLine);
    });
  });
}

// actual res calculations
function handleSimCalculations(midPointSelect, step2Form, firstDrop, secondDrop, thirdDrop, map2, coastalLine) {
  if (map2.colorLayer !== null) {
    map2.colorLayer.clearLayers();
  }

  // check all the boxes are filled
  // process to the calculations when we have everything
  if (step2Form.reportValidity() == false) {
    return; // this just means stop
  }

  const resolutionCollection = getFtResolution(coastalLine, 5000); // feature collection of a lot of linestrings
  console.log(resolutionCollection);

  const [firstProp, secondProp, thirdProp] = munipulateResCollection(map2, resolutionCollection, firstDrop, secondDrop, thirdDrop);

  // add the resolution data to map and color that based on the final score of each coastline piece
  map2.colorLayer = L.geoJSON(resolutionCollection, {
    style: (sample) => {
      const colorValue = colorScale(sample.properties.finalValueNormal);
      return {
        stroke: true,
        color: colorValue,
        weight: 3,
      };
    },
  }).addTo(map2);

  // add legend for the resolution box
  map2.legend.onAdd = (map2) => {
    return legend1Style(map2, colorScale);
  };
  map2.legend.addTo(map2);

  console.log(resolutionCollection);

  // find final score for the selected point
  // findClosestData only takes polygon/line, not point, so need to buffer the point
  const bufferedPoint = turf.buffer(midPointSelect, 0.1);
  const pointScore = findClosestData(resolutionCollection, bufferedPoint);
  console.log(pointScore);

  map2.pickPointLayer.bringToFront()
    .bindTooltip((l) => { // final unit box tooltip options
      return `<p class="unit-tooltip"><strong>Final score: </strong>${pointScore[0].finalValue.toFixed(2)}</p>`;
    }).bindPopup((l) => { // final unit box popup options
      return `<p class="unit-tooltip">Your selected point has a final score of <strong>${pointScore[0].finalValue.toFixed(2)}</strong></p>`;
    });

  // process to the following step if user click next
  finishResButtonSim.addEventListener('click', () => {
    simGroupRes(map2, resolutionCollection, firstProp, secondProp, thirdProp, pointScore);
  });
}

function simGroupRes(map2, resolutionCollection, firstProp, secondProp, thirdProp, pointScore) {

}


export {
  handleSimilarityCalculations,
};
