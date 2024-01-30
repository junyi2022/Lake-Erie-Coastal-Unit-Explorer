import { initializeMap } from './map.js';

// if want model dialog, need to do it in JS
// const dialog = document.getElementById('start-box');
// dialog.showModal();

// read files

const shore = await fetch('data/shoreline-base.geojson');
const shorelineBase = await shore.json();

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

const sb = await fetch('data/sediment-budget-new.json');
const sendimentBudget = await sb.json();

const shoretype = await fetch('data/shoreline-type.json');
const shorelineType = await shoretype.json();

const fl = await fetch('data/flowline.json');
const flowline = await fl.json();

window.censusTracts = censusTracts;
window.dataBoundary = dataBoundary;
window.county = county;
window.huc10 = huc10;
window.huc12 = huc12;
window.flowline = flowline;
window.sendimentBudget = sendimentBudget;
window.shorelineBase = shorelineBase;
window.shorelineType = shorelineType;
window.map = initializeMap(censusTracts, dataBoundary, huc10, huc12, shorelineBase, county, flowline, sendimentBudget); // remember to add new layer her as well
