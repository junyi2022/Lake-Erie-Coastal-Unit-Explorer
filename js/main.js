import { initializeMap } from './map.js';
import { handleSliderState } from './stateControl/slider.js';
import { applyDialogState } from './stateControl/dialog.js';
import { state } from './stateControl/state.js';


// state control
handleSliderState(state);
applyDialogState(state);

// if want model dialog, need to do it in JS
// const dialog = document.getElementById('start-box');
// dialog.showModal();

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

const fl = await fetch('data/flowline.json');
const flowline = await fl.json();

const shore = await fetch('data/shoreline-base-to-bridge.geojson');
const shorelineBase = await shore.json();

// working layers

const sb = await fetch('data/sediment-budget-rrbh.geojson');
const sendimentBudget = await sb.json();

const shoretype = await fetch('data/edge-clean.geojson');
const shorelineType = await shoretype.json();

const soil = await fetch('data/soil-erosion-k.geojson');
const soilErosion = await soil.json();


window.censusTracts = censusTracts;
window.dataBoundary = dataBoundary;
window.county = county;
window.huc10 = huc10;
window.huc12 = huc12;
window.flowline = flowline;

window.sendimentBudget = sendimentBudget;
window.shorelineBase = shorelineBase;
window.shorelineType = shorelineType;
window.soilErosion = soilErosion;
window.map = initializeMap(censusTracts, dataBoundary, huc10, huc12, shorelineBase, county, flowline, sendimentBudget); // remember to add new layer her as well
