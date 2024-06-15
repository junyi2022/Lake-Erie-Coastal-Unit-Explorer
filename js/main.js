/* globals turf */

import { initializeMap } from './map.js';
import { handleMenuBar } from './control.js';


// read files
// reference layers

const db = await fetch('data/data-boundary.json');
const dataBoundary = await db.json();

const census = await fetch('data/census-tract.json');
const censusTracts = await census.json();

const ct = await fetch('data/county.json');
const county = await ct.json();

const HUC10 = await fetch('data/HUC10.geojson');
const huc10 = await HUC10.json();

const HUC12 = await fetch('data/HUC12.json');
const huc12 = await HUC12.json();


// working layers
// because the analysis later (turf.intersect) only takes polygon, need to manipulate lines here before adding them

const shore = await fetch('data/shoreline-base-to-bridge.geojson');
const shorelineBase = await shore.json();

const sb = await fetch('data/sediment-budget-rrbh.geojson');
const sendimentBudget = await sb.json();

const shoretype = await fetch('data/edge-clean.geojson');
const shorelineTypeline = await shoretype.json();
const shorelineType = turf.buffer(shorelineTypeline, 0.01);

const soil = await fetch('data/soil-erosion-k.geojson');
const soilErosion = await soil.json();

const fishWildlife = await fetch('data/fish-wildlife-points800.json');
const fishWildlifePoints = await fishWildlife.json();

const wetlandPotential = await fetch('data/wetland-potential-points800.geojson');
const wetlandPotentialPoints = await wetlandPotential.json();

const communityExposure = await fetch('data/community-exposure-points800.geojson');
const communityExposurePoints = await communityExposure.json();

const GBIFendangeredSpecies = await fetch('data/GBIF-endanger.geojson');
const endangeredSpecies = await GBIFendangeredSpecies.json();

const GBIFinvasiveSpecies = await fetch('data/GBIF-invasive.geojson');
const invasiveSpecies = await GBIFinvasiveSpecies.json();

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
