/* globals turf */
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';

import { getResolutionBoxes } from './cal.js';

// because point cloud has too many features, it is better to import the data instead of using map layer as a middle step
import { sendimentBudget, shorelineType, soilErosion, fishWildlifePoints, wetlandPotentialPoints, communityExposurePoints, endangeredSpecies, invasiveSpecies } from './main.js';

const invasiveMethod = [ // buffer unit is km
  {'species': 'Neogobius melanostomus', 'buffer': 0.3},
  {'species': 'Myriophyllum spicatum', 'buffer': 0.2},
  {'species': 'Lythrum salicaria', 'buffer': 0.2},
  {'species': 'Dreissena polymorpha', 'buffer': 1},
  {'species': 'Cyprinus carpio', 'buffer': 1.5},
  {'species': 'Phragmites australis', 'buffer': 0.2},
];

const endangeredMethod = [ // buffer unit is km
  {'species': 'Acipenser fulvescens', 'buffer': 10},
  {'species': 'Castanea dentata', 'buffer': 0.1},
  {'species': 'Fraxinus americana', 'buffer': 0.1},
  {'species': 'Fraxinus nigra', 'buffer': 0.1},
  {'species': 'Fraxinus pennsylvanica', 'buffer': 0.1},
  {'species': 'Fraxinus profunda', 'buffer': 0.1},
  {'species': 'Juglans cinerea', 'buffer': 0.1},
  {'species': 'Oryctolagus cuniculus', 'buffer': 2},
  {'species': 'Ulmus americana', 'buffer': 0.1},
  {'species': 'Acipenser brevirostrum', 'buffer': 10},
  {'species': 'Aquila chrysaetos', 'buffer': 20},
  {'species': 'Asio flammeus', 'buffer': 15},
  {'species': 'Charadrius melodus', 'buffer': 1},
  {'species': 'Chlidonias niger', 'buffer': 1.5},
  {'species': 'Falco peregrinus', 'buffer': 2.5},
  {'species': 'Lanius ludovicianus', 'buffer': 1},
];

const shorelineTypeScore = {
  0: ['Bedrock_(Resistant)_no_overburden', 'Artificial_Good_Quality_Well_Engineered'],
  1: ['Bedrock_(Resistant)_with_glacial_overburden', 'Artificial_Moderate_Quality_Moderately_Engineered', 'Open_Shore_Wetlands'],
  2: ['Bedrock_(Erosive)_no_overburden', 'Bedrock_(Erosive)_with_glacial_Overburden', 'Open_Shoreline_Wetlands', 'Composite_Low_Bank_/_Low_Plain'],
  3: ['Artificial_Poor_Quality_Poorly_Engineered', 'Pocket_Beach', 'Artificial_Depositional_(e.g.,_jetty,_groin_fill)', 'Bedrock_(Resistant)_with_sand_overburden'],
  4: ['Bedrock_(Erosion)_with_sand_overburden', 'Baymouth_–_Barrier_(fronting_wetlands_or_shallow_embayments,_estuaries)', 'Low_Bank', 'Natural_Depositional_(areas_with_active_supply/deposition)'],
};


// sediment net loss model
function sedimentNetLossModel(map, resolutionCollection) {
  calCloestDataFromLayer(map, sendimentBudget, resolutionCollection, calSedimentNetLossFromArray, 'sedimentNetLoss', 1.5);
}

// sediment net gain model
function sedimentNetGainModel(map, resolutionCollection) {
  calDataFromLayer(map, sendimentBudget, resolutionCollection, 0.1, calSedimentNetGainFromArray, 'sedimentNetGain', 1.5);
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
  // fish and wildlife index from NFWF
  calDataFromPoints(map, fishWildlifePoints, resolutionCollection, 0.15, calRasterIndex, 'wild_index', 'fishWildlifeIndex', 1);
  // endangered species
  const endangeredSpeciesBufferArray = speciesPointToBufferPolygon(endangeredSpecies, endangeredMethod);
  speciesDiversityFromPolygonArray(endangeredSpeciesBufferArray, resolutionCollection, 0.15, 'endangeredDiversity', 1);
  // weight all the layers
  for (const coastline of resolutionCollection.features) {
    coastline.properties.normalhabitatProtection = coastline.properties.normalfishWildlifeIndex * 0.7 + coastline.properties.normalendangeredDiversity * 0.3;
  }
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
  const invasiveSpeciesBufferArray = speciesPointToBufferPolygon(invasiveSpecies, invasiveMethod);
  speciesDiversityFromPolygonArray(invasiveSpeciesBufferArray, resolutionCollection, 0.15, 'invasiveDiversity', 1);
}

// physical condition model
function physicalConditionModel(map, resolutionCollection) {
  const slope = window.slope;
  // calDataFromLayer(map, slope, resolutionCollection, 0.01, calSlopeFromArray, 'physicalCondition', 0.4);
  // test use average slope
  // calDataFromPoints(map, slope, resolutionCollection, 0.01, calRasterIndex, 'grid_code', 'physicalCondition', 1);
  // test use median slope
  calDataFromPoints(map, slope, resolutionCollection, 0.01, calRasterMedIndex, 'grid_code', 'physicalCondition', 1);
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
    const value = dataNeedToCal(propArray, box);

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

// function for add data using closest data
function calCloestDataFromLayer(map, whichData, resolutionCollection, dataNeedToCal, pname, scaleFactor) { // dataNeedToCal is the function for what thing to cal, depending on the data here; pname is the properties name to add to the coastline chunk properties
  // input value to coastline through overlap of boxes and data layer
  // loop through each coast line
  for (const coastline of resolutionCollection.features) {
    // get all the values that are connected to the box as an array
    const propArray = findClosestData(whichData, coastline);

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
      overlapArray.push(feature);
    }
  }
  return overlapArray;
}

// cal from array of each coast box

function calSedimentLossFromArray(propArray) {
  const sedimentLossArray = propArray.map((item) => item.properties.Coarse_Out + item.properties.Bypass + item.properties.Downdrift + item.properties.Fines_Out + item.properties.Littoral_1);
  const sedimentLoss = average(sedimentLossArray);
  return sedimentLoss;
}

function calSedimentGainFromArray(propArray) {
  const sedimentGainArray = propArray.map((item) => item.properties.Bluff_In + item.properties.Bedload + item.properties.GainDowndr + item.properties.Littoral_C);
  const sedimentGain = average(sedimentGainArray);
  return sedimentGain;
}

function calSedimentNetLossFromArray(propArray) {
  const loss = calSedimentLossFromArray(propArray);
  const gain = calSedimentGainFromArray(propArray);
  return loss - gain;
}

function calSedimentNetGainFromArray(propArray) {
  const loss = calSedimentLossFromArray(propArray);
  const gain = calSedimentGainFromArray(propArray);
  return gain - loss;
}

function calRetreatRateFromArray(propArray) {
  const retreatRateArray = propArray.map((item) => item.properties.RetreatRat);
  const retreatRate = average(retreatRateArray);
  return retreatRate;
}

const findKeyByValue = (obj, value) => {
  return Object.keys(obj).find((key) => obj[key].includes(value)) || 5; // if not found, return 5
};

function calShorelineTypeFromArray(propArray) {
  const shorelineTypeArray = propArray.map((item) => {
    return +findKeyByValue(shorelineTypeScore, item.properties.Shoreline1); // + convert values to numbers
  });
  const shorelineType = average(shorelineTypeArray);
  return shorelineType;
}

function calSoilErosionFromArray(propArray) {
  const soilErosionArray = propArray.map((item) => item.properties.Kfactor);
  const soilErosion = average(soilErosionArray);
  return soilErosion;
}

// function calSlopeFromArray(propArray, box) {
//   // Initialize an object to hold arrays for each gridcode
//   const groupedFeatures = {};

//   propArray.map((feature) => {
//     const gridcode = feature.properties.gridcode;

//     // If the gridcode group doesn't exist, create an array for it
//     if (!groupedFeatures[gridcode]) {
//       groupedFeatures[gridcode] = [];
//     }

//     // Push the feature into the corresponding gridcode array
//     groupedFeatures[gridcode].push(turf.area(feature));
//   });

//   // calculate sum of each gridcode
//   Object.keys(groupedFeatures).map((key) => {
//     groupedFeatures[key] = groupedFeatures[key].reduce((a, b) => a + b);
//   });

//   // calculate weighted sum
//   const sum = turf.area(box);
//   return Object.keys(groupedFeatures).map((key) => key * groupedFeatures[key] / sum).reduce((a, b) => a + b);
// }


// points calculation part

function calRasterIndex(pointsWithin, whatIndex) {
  const rasterIndexArray = pointsWithin.features.map((point) => point.properties[whatIndex]);
  const indexAverage = average(rasterIndexArray);
  return indexAverage;
}

function calRasterMedIndex(pointsWithin, whatIndex) {
  const rasterIndexArray = pointsWithin.features.map((point) => point.properties[whatIndex]);
  const indexAverage = median(rasterIndexArray);
  return indexAverage;
}

// calculate average from array of numbers
// const average = (array) => array.reduce((a, b) => a + b) / array.length;
function average(array) {
  const sum = array.reduce((a, b) => a + b);
  return sum == 0 ? 0 : sum / array.length;
}

// calculate median from array of numbers
function median(array) {
  array.sort((a, b) => a - b); // Sort numbers in ascending order
  const mid = array.length / 2;
  return mid % 1 ? array[mid - 0.5] : (array[mid - 1] + array[mid]) / 2;
}

// find closest polygon and get properties
function findClosestData(whichData, coastline) {
  const coastlinecenter = turf.pointOnFeature(coastline);
  // need to loop through each shape to get center points because the turf function only take one shape each time

  const centers = whichData.features.map((feature) => {
    const featureCenter = turf.pointOnFeature(feature);
    featureCenter.properties = feature.properties; // add all feature properties to point properties (although we don't need it later)
    return featureCenter;
  });

  // find nearest center point and use that to get the park shape
  const dataNear = turf.nearestPoint(coastlinecenter, turf.featureCollection(centers)); // truf function take turf feature collection, not just simple array

  const prop = [dataNear];
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
  // remove undefined
  const validBuffer = speciesBuffer.filter((b) => b != void 0);
  return validBuffer;
}

// species diversity from polygon array

function speciesDiversityFromPolygonArray(speciesBuffer, resolutionCollection, num, pname, scaleFactor) {
  const layerResolutionBoxes = getResolutionBoxes(resolutionCollection, num);

  // calculate diversity through overlap of boxes and buffer
  // loop through each coast line
  for (const coastline of resolutionCollection.features) {
    // get the box of each coastline
    const box = findBoxFromLine(coastline, layerResolutionBoxes);

    // count diversity of each line through box overlap
    const diversityArray = [];
    for (let i = 0; i < speciesBuffer.length; i++) {
      const intersection = turf.intersect(box, speciesBuffer[i]); // will be null if no overlap
      if (intersection != null) {
        const species = speciesBuffer[i].properties.species;
        if (!diversityArray.includes(species)) {
          diversityArray.push(species);
        }
      }
    }

    // count diversity
    const diversity = diversityArray.length;

    // add the cal result to coastline properties
    coastline.properties[pname] = diversity;
  }

  // need to normalize the values

  // get an array of all the values of the coastline piece of this model calculation
  const propertiesValueArray = resolutionCollection.features.map((f) => f.properties[pname]);

  // calculate the min max of the values
  const min = Math.min(...propertiesValueArray);
  const max = Math.max(...propertiesValueArray);

  // use a D3 scale to normalize this data
  // scale factor is the thing to control the shape of the reprojection
  const scaleFunc = d3.scalePow([min, max], [0, 1]).exponent(scaleFactor); // need to map to 0 to 1 because the later color scale only take numbers between 0 and 1
  // add the normalized value to each coastline properties
  for (const coastline of resolutionCollection.features) {
    const normalResult = scaleFunc(coastline.properties[pname]);
    const newPropName = 'normal'+ pname;
    coastline.properties[newPropName] = normalResult;
  }
}

export {
  sedimentNetLossModel,
  sedimentNetGainModel,
  erosionPotentialModel,
  habitatProtectionModel,
  wetlandProtectionRestorationModel,
  socialVulnerabilityModel,
  invasiveSpeciesModel,
  physicalConditionModel,
  average,
  findClosestData,
};
