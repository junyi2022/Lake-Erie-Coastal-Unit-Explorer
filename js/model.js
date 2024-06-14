/* globals turf */
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

import { getResolutionBoxes } from './cal.js';

// because point cloud has too many features, it is better to import the data instead of using map layer as a middle step
import { sendimentBudget, shorelineType, soilErosion, fishWildlifePoints, wetlandPotentialPoints, communityExposurePoints, endangeredSpecies, invasiveSpecies } from './main.js';

const invasiveMethod = [ // buffer unit is km
  {'species': 'Neogobius melanostomus', 'buffer': 0.2},
  {'species': 'Myriophyllum spicatum', 'buffer': 0.1},
  {'species': 'Lythrum salicaria', 'buffer': 0.1},
  {'species': 'Dreissena polymorpha', 'buffer': 1},
  {'species': 'Cyprinus carpio', 'buffer': 1.5},
  {'species': 'Phragmites australis', 'buffer': 0.1},
];

// sediment loss model
function sedimentLossModel(map, resolutionCollection) {
  // get different boxes for different data layers
  // add sediment loss data to each coastline from sediment budget layer
  calDataFromLayer(map, sendimentBudget, resolutionCollection, 0.1, calSedimentLossFromArray, 'sedimentLoss', 1.5);
}

// sediment gain model
function sedimentGainModel(map, resolutionCollection) {
  // get different boxes for different data layers
  // add sediment loss data to each coastline from sediment budget layer
  calDataFromLayer(map, sendimentBudget, resolutionCollection, 0.1, calSedimentGainFromArray, 'sedimentGain', 1.5);
}

// erosion potential model
function erosionPotentialModel(map, resolutionCollection) {
  // get different boxes for different data layers
  // add retreat rate data to each coastline from sediment budget layer
  calDataFromLayer(map, sendimentBudget, resolutionCollection, 0.1, calRetreatRateFromArray, 'retreatRate', 1); // scale factor = 1 means linear

  // add shoreline type data to each coastline from shoreline type layer
  calDataFromLayer(map, shorelineType, resolutionCollection, 0.05, calShorelineTypeFromArray, 'shorelineType', 1); // scale factor = 1 means linear

  // add soil erosion data to each coastline from soil erosion layer
  calDataFromLayer(map, soilErosion, resolutionCollection, 0.05, calSoilErosionFromArray, 'soilErosion', 1); // scale factor = 1 means linear

  // weight all the layers
  for (const coastline of resolutionCollection.features) {
    coastline.properties.normalerosionPotential = coastline.properties.normalretreatRate * 0.5 + coastline.properties.normalshorelineType * 0.3 + coastline.properties.normalsoilErosion * 0.2;
  }
}

// habitat protection model
function habitatProtectionModel(map, resolutionCollection) {
  calDataFromPoints(map, fishWildlifePoints, resolutionCollection, 0.15, calRasterIndex, 'wild_index', 'habitatProtection', 1);
}

// wetland protection model
function wetlandProtectionRestorationModel(map, resolutionCollection) {
  calDataFromPoints(map, wetlandPotentialPoints, resolutionCollection, 0.15, calRasterIndex, 'potential', 'wetlandProtectionRestoration', 1);
}

// social vulnerability model
function socialVulnerabilityModel(map, resolutionCollection) {
  calDataFromPoints(map, communityExposurePoints, resolutionCollection, 0.1, calRasterIndex, 'comEIndex', 'socialVulnerability', 1);
}

// invasive species model
function invasiveSpeciesModel(map, resolutionCollection) {
  speciesPointToBufferPolygon(invasiveSpecies, invasiveMethod);
}


// add data to each coatline piece

// only support single, polygon layer
function calDataFromLayer(map, whichData, resolutionCollection, num, dataNeedToCal, pname, scaleFactor) { // dataNeedToCal is the function for what thing to cal, depending on the data here; pname is the properties name to add to the coastline chunk properties
  const layerResolutionBoxes = getResolutionBoxes(resolutionCollection, num); // layerResolutionBoxes already have ID

  // input value to coastline through overlap of boxes and data layer
  // loop through each coast line
  for (const coastline of resolutionCollection.features) {
    // get the box of each coastline
    const box = findBoxFromLine(coastline, layerResolutionBoxes);

    // get all the values that are connected to the box as an array
    // important, this is let not const because we may resign values to this array if it does not have value
    let propArray = dataLoopToGetOverlapBoxPropArray(whichData, box);

    // calculate that value
    // if the coastline piece is very small, it may not have overlap with data layer. So need to specify other function to handle that situation
    if (propArray.length == 0) {
      // add data by finding closet data
      propArray = findClosestData(whichData, coastline);
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
  // scale factor is the thing to control the shape of the reprojection
  const scaleFunc = d3.scalePow([min, max], [0, 1]).exponent(scaleFactor); // need to map to 0 to 1 because the later color scale only take numbers between 0 and 1
  // add the normalized value to each coastline properties
  for (const coastline of resolutionCollection.features) {
    const normalResult = scaleFunc(coastline.properties[pname]);
    const newPropName = 'normal'+ pname;
    coastline.properties[newPropName] = normalResult;
  }
}

// raster data - point cloud
// support point cloud layer
function calDataFromPoints(map, whichData, resolutionCollection, num, dataNeedToCal, whatIndex, pname, scaleFactor) { // dataNeedToCal is the function for what thing to cal, depending on the data here; pname is the properties name to add to the coastline chunk properties
  const layerResolutionBoxes = getResolutionBoxes(resolutionCollection, num); // layerResolutionBoxes already have ID

  // input value to coastline through points in box
  // loop through each coast line
  for (const coastline of resolutionCollection.features) {
    // get the box of each coastline
    const box = findBoxFromLine(coastline, layerResolutionBoxes);

    // get points within box
    // important, this is let not const because we may resign values to this array if it does not have value
    let pointsWithin = turf.pointsWithinPolygon(whichData, box);

    // calculate that value
    // if the coastline piece is very small, it may not have points within. So need to specify other function to handle that situation
    if (pointsWithin.features.length == 0) {
      // add data by finding closet data
      const coastlinecenter = turf.pointOnFeature(coastline);
      pointsWithin = turf.nearestPoint(coastlinecenter, whichData);
    }

    // calculate data based on the rule of each model
    const value = dataNeedToCal(pointsWithin, whatIndex);

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
  // scale factor is the thing to control the shape of the reprojection
  const scaleFunc = d3.scalePow([min, max], [0, 1]).exponent(scaleFactor); // need to map to 0 to 1 because the later color scale only take numbers between 0 and 1
  // add the normalized value to each coastline properties
  for (const coastline of resolutionCollection.features) {
    const normalResult = scaleFunc(coastline.properties[pname]);
    const newPropName = 'normal'+ pname;
    coastline.properties[newPropName] = normalResult;
  }
}

// supportive functions for adding data

// find coast box related to selected coastline
function findBoxFromLine(coastline, layerResolutionBoxes) {
  for (const eachBox of layerResolutionBoxes.features) {
    if (eachBox.properties.ID == coastline.properties.ID) {
      return eachBox;
    }
  }
}

// loop through layer to calculate overlap
function dataLoopToGetOverlapBoxPropArray(whichData, box) {
  const overlapArray = [];
  for (const feature of whichData.features) {
    const intersection = turf.intersect(box, feature, {properties: box.properties}); // will be null if no overlap
    if (intersection != null) {
      overlapArray.push(feature.properties);
    }
  }
  return overlapArray;
}

// cal from array of each coast box

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

function calRetreatRateFromArray(propArray) {
  const retreatRateArray = [];
  for (const eachData of propArray) {
    const retreatRate = eachData.RetreatRat;
    retreatRateArray.push(retreatRate);
  }
  const retreatRate = average(retreatRateArray);
  return retreatRate;
}

function calShorelineTypeFromArray(propArray) {
  const shorelineTypeArray = [];
  for (const eachData of propArray) {
    // const shorelineType = eachData.Bluff_In + eachData.Bedload + eachData.GainDowndr + eachData.Littoral_1;
    if (eachData.Shoreline1 == 'Bedrock_(Resistant)_no_overburden' || eachData.Shoreline1 == 'Artificial_Good_Quality_Well_Engineered') {
      const shorelineType = 0;
      shorelineTypeArray.push(shorelineType);
    } else if (eachData.Shoreline1 == 'Bedrock_(Resistant)_with_glacial_overburden' || eachData.Shoreline1 == 'Artificial_Moderate_Quality_Moderately_Engineered' || eachData.Shoreline1 == 'Open_Shore_Wetlands') {
      const shorelineType = 1;
      shorelineTypeArray.push(shorelineType);
    } else if (eachData.Shoreline1 == 'Bedrock_(Erosive)_no_overburden' || eachData.Shoreline1 == 'Bedrock_(Erosive)_with_glacial_Overburden' || eachData.Shoreline1 == 'Open_Shoreline_Wetlands' || eachData.Shoreline1 == 'Composite_Low_Bank_/_Low_Plain') {
      const shorelineType = 2;
      shorelineTypeArray.push(shorelineType);
    } else if (eachData.Shoreline1 == 'Artificial_Poor_Quality_Poorly_Engineered' || eachData.Shoreline1 == 'Pocket_Beach' || eachData.Shoreline1 == 'Artificial_Depositional_(e.g.,_jetty,_groin_fill)' || eachData.Shoreline1 == 'Bedrock_(Resistant)_with_sand_overburden') {
      const shorelineType = 3;
      shorelineTypeArray.push(shorelineType);
    } else if (eachData.Shoreline1 == 'Bedrock_(Erosion)_with_sand_overburden' || eachData.Shoreline1 == 'Baymouth_–_Barrier_(fronting_wetlands_or_shallow_embayments,_estuaries)' || eachData.Shoreline1 == 'Low_Bank' || eachData.Shoreline1 == 'Natural_Depositional_(areas_with_active_supply/deposition)') {
      const shorelineType = 4;
      shorelineTypeArray.push(shorelineType);
    } else {
      const shorelineType = 5;
      shorelineTypeArray.push(shorelineType);
    }
  }
  const shorelineType = average(shorelineTypeArray);
  return shorelineType;
}

function calSoilErosionFromArray(propArray) {
  const soilErosionArray = [];
  for (const eachData of propArray) {
    const soilErosion = eachData.Kfactor;
    soilErosionArray.push(soilErosion);
  }
  const soilErosion = average(soilErosionArray);
  return soilErosion;
}

// points calculation part

function calRasterIndex(pointsWithin, whatIndex) {
  const rasterIndexArray = [];
  for (const point of pointsWithin.features) {
    const index = point.properties[whatIndex];
    rasterIndexArray.push(index);
  }
  const indexAverage = average(rasterIndexArray);
  return indexAverage;
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

// find closest polygon and get properties
function findClosestData(whichData, coastline) {
  const coastlinecenter = turf.pointOnFeature(coastline);
  // need to loop through each shape to get center points because the turf function only take one shape each time
  const centers = [];

  for (const feature of whichData.features) {
    const featureCenter = turf.pointOnFeature(feature);
    featureCenter.properties = feature.properties; // add all feature properties to point properties (although we don't need it later)
    centers.push(featureCenter);
  }

  // find nearest center point and use that to get the park shape
  const dataNear = turf.nearestPoint(coastlinecenter, turf.featureCollection(centers)); // truf function take turf feature collection, not just simple array

  const prop = [dataNear.properties];
  return prop;
}

// species point to buffer polygon array

function speciesPointToBufferPolygon(speciesPoint, method) {
  const speciesBuffer = speciesPoint.features.map((p) => {
    for (const option of method) {
      if (p.properties.species === option.species) {
        return turf.buffer(p, option.buffer, {units: 'kilometers'});
      }
    }
  });
  console.log(speciesBuffer);
  return speciesBuffer;
}

export {
  sedimentLossModel,
  sedimentGainModel,
  erosionPotentialModel,
  habitatProtectionModel,
  wetlandProtectionRestorationModel,
  socialVulnerabilityModel,
  invasiveSpeciesModel,
  average,
  findClosestData,
};
