/* globals turf */

import { initializeMap } from './map.js';
import { handleMenuBar } from './control.js';


async function readJSON(path) {
  const data = await fetch(path);
  return await data.json();
}

// read files
// reference layers

const dataBoundary = await readJSON('data/data-boundary.json');

const censusTracts = await readJSON('data/census-tract.json');

const county = await readJSON('data/county.json');

const huc10 = await readJSON('data/HUC10.geojson');

const huc12 = await readJSON('data/HUC12.json');


// working layers
// because the analysis later (turf.intersect) only takes polygon, need to manipulate lines here before adding them

const shorelineBase = await readJSON('data/shoreline-base-to-bridge.geojson');

const sendimentBudget = await readJSON('data/sediment-budget-rrbh.geojson');

const shorelineTypeline = await readJSON('data/edge-clean.geojson');
const shorelineType = turf.buffer(shorelineTypeline, 0.01);

const soilErosion = await readJSON('data/soil-erosion-k.geojson');

const fishWildlifePoints = await readJSON('data/fish-wildlife-points600.json');

const wetlandPotentialPoints = await readJSON('data/wetland-potential-points600.geojson');

const communityExposurePoints = await readJSON('data/community-exposure-points600.geojson');

const endangeredSpecies = await readJSON('data/GBIF-endanger.geojson');

const invasiveSpecies = await readJSON('data/GBIF-invasive.geojson');

const slope = await readJSON('data/5mSlope20mBufferPT.geojson');

// reference layers

window.censusTracts = censusTracts;
window.dataBoundary = dataBoundary;
window.county = county;
window.huc10 = huc10;
window.huc12 = huc12;

// working layers
window.sendimentBudget = sendimentBudget;
window.shorelineBase = shorelineBase;
window.shorelineType = shorelineType;
window.soilErosion = soilErosion;
window.fishWildlifePoints = fishWildlifePoints;
window.wetlandPotentialPoints = wetlandPotentialPoints;
window.communityExposurePoints = communityExposurePoints;
window.endangeredSpecies = endangeredSpecies;
window.invasiveSpecies = invasiveSpecies;
window.slope = slope;

// map for unit generator
// Other maps shouldn't be called here since they are not shown up at the beginning and have display = none
window.map = initializeMap(censusTracts, dataBoundary, huc10, huc12, shorelineBase, county, sendimentBudget); // remember to add new layer her as well

// menu bar
handleMenuBar();

export {
  censusTracts, dataBoundary, huc10, huc12, shorelineBase, county,
  sendimentBudget,
  shorelineType,
  soilErosion,
  fishWildlifePoints,
  wetlandPotentialPoints,
  communityExposurePoints,
  endangeredSpecies,
  invasiveSpecies,
};
