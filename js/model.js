/* globals turf */
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

import { getResolutionBoxes } from './cal.js';


// sediment loss model
function sedimentLossModel(map, resolutionCollection) {
  // get different boxes for different data layers
  // add sediment loss data to each coastline from sediment budget layer
  calDataFromLayer(map, map.sedimentBudgetLayer, resolutionCollection, 0.2, calSedimentLossFromArray, 'sedimentLoss', 1.5);
}

// sediment gain model
function sedimentGainModel(map, resolutionCollection) {
  // get different boxes for different data layers
  // add sediment loss data to each coastline from sediment budget layer
  calDataFromLayer(map, map.sedimentBudgetLayer, resolutionCollection, 0.2, calSedimentGainFromArray, 'sedimentGain', 1.5);
}

// add data to each coatline piece
function calDataFromLayer(map, whichLayer, resolutionCollection, num, dataNeedToCal, pname, scaleFactor) { // dataNeedToCal is the function for what thing to cal, depending on the data here; pname is the properties name to add to the coastline chunk properties
  const layerResolutionBoxes = getResolutionBoxes(resolutionCollection, num); // layerResolutionBoxes already have ID
  console.log(layerResolutionBoxes);
  // L.geoJSON(layerResolutionBoxes).addTo(map);

  // input value to coastline through overlap of boxes and data layer
  // loop through each coast line
  for (const coastline of resolutionCollection.features) {
    // get the box of each coastline
    const box = findBoxFromLine(coastline, layerResolutionBoxes);

    // get all the values that are connected to the box as an array
    // important, this is let not const because we may resign values to this array if it does not have value
    let propArray = layerLoopToGetOverlapBoxPropArray(whichLayer, box);

    // calculate that value
    // if the coastline piece is very small, it may not have overlap with data layer. So need to specify other function to handle that situation
    if (propArray.length == 0) {
      // add data by finding closet data
      propArray = findClosestData(whichLayer, coastline);
    }

    // calculate data based on the rule of each model
    const value = dataNeedToCal(propArray);

    // add the cal result to coastline properties
    coastline.properties[pname] = value;
  }

  // need to normalize the values
  // this is becuase the data from different models are in different scale, need normalized value of each model to calculate the final score

  // get an array of all the values of the coastline piece of this model calculation
  const propertiesValueArray = resolutionCollection.features.map((f) => f.properties[pname]); // map will return an array of all the properties[pname]

  // calculate the min max of the values
  const min = Math.min(...propertiesValueArray); // ...flatten the array because min/max doesn't take array
  const max = Math.max(...propertiesValueArray);

  // use a D3 scale to normalize this data
  // see avaliable scale here: https://d3js.org/d3-scale
  // scale descriptions: https://observablehq.com/@d3/continuous-scales
  // here use power scale
  const scaleFunc = d3.scalePow([min, max], [0, 1]).exponent(scaleFactor); // need to map to 0 to 1 because the later color scale only take numbers between 0 and 1
  // add the normalized value to each coastline properties
  for (const coastline of resolutionCollection.features) {
    const normalResult = scaleFunc(coastline.properties[pname]);
    const newPropName = 'normal'+ pname;
    coastline.properties[newPropName] = normalResult;
  }
}

// find coast box related to selected coastline
function findBoxFromLine(coastline, layerResolutionBoxes) {
  for (const eachBox of layerResolutionBoxes.features) {
    if (eachBox.properties.ID == coastline.properties.ID) {
      return eachBox;
    }
  }
}

// loop through layer to calculate overlap
function layerLoopToGetOverlapBoxPropArray(whichLayer, box) {
  const overlapArray = [];
  whichLayer.eachLayer((layer) => {
    const singlelayerPoly = layer.feature;
    const intersection = turf.intersect(box, singlelayerPoly, {properties: box.properties}); // will be null if no overlap
    if (intersection != null) {
      overlapArray.push(singlelayerPoly.properties);
    }
  });
  return overlapArray;
}

// cal sediment loss from array of each coast box
function calSedimentLossFromArray(propArray) {
  const sedimentLossArray = [];
  for (const eachData of propArray) {
    const sedimentLoss = eachData.Coarse_Out + eachData.Bypass + eachData.Downdrift + eachData.Fines_Out + eachData.Littoral_C;
    sedimentLossArray.push(sedimentLoss);
  }
  const sedimentLoss = average(sedimentLossArray);
  return sedimentLoss;
}

function calSedimentGainFromArray(propArray) {
  const sedimentGainArray = [];
  for (const eachData of propArray) {
    const sedimentGain = eachData.Bluff_In + eachData.Bedload + eachData.GainDowndr + eachData.Littoral_1;
    sedimentGainArray.push(sedimentGain);
  }
  const sedimentGain = average(sedimentGainArray);
  return sedimentGain;
}

// calculate average from array of numbers
// const average = (array) => array.reduce((a, b) => a + b) / array.length;
function average(array) {
  const sum = array.reduce((a, b) => a + b);
  if (sum == 0) {
    return 0;
  } else {
    return sum / array.length;
  }
}
// how reduce works
// array = [1, 2, 3, 4, 5], 0
// (0, 1) => 1
// (1, 2) => 3
// (3, 3) => 6
// (6, 4) => 10
// (10, 5) => 15

function findClosestData(whichLayer, coastline) {
  const coastlinecenter = turf.pointOnFeature(coastline);
  // need to loop through each shape to get center points because the turf function only take one shape each time
  const centers = [];
  // for (const feature of geoJSONdata.features) {
  //   const featureCenter = turf.pointOnFeature(feature);
  //   featureCenter.properties = feature.properties; // add all feature properties to point properties (although we don't need it later)
  //   centers.push(featureCenter);
  // }

  whichLayer.eachLayer((layer) => {
    const feature = layer.feature;
    const featureCenter = turf.pointOnFeature(feature);
    featureCenter.properties = feature.properties; // add all feature properties to point properties (although we don't need it later)
    centers.push(featureCenter);
  });

  // find nearest center point and use that to get the park shape
  const dataNear = turf.nearestPoint(coastlinecenter, turf.featureCollection(centers)); // truf function take turf feature collection, not just simple array

  const prop = [dataNear.properties];
  console.log(prop);
  return prop;
}


export {
  sedimentLossModel,
  sedimentGainModel,
  average,
};
