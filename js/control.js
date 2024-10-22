import { initializeSimilarAreaMap } from './map.js';
import { censusTracts, dataBoundary, huc10, huc12, shorelineBase, county, sendimentBudget } from './main.js';

// handle menu bar dynamics

// get all the buttons
const unitGeneratorButton = document.querySelector('.unit-generator-button');
const similarAreaButton = document.querySelector('.find-similar-area');
const dataExplorerButton = document.querySelector('.data-explorer');
const documentationButton = document.querySelector('.documentation');

const menuBlock = document.querySelector('.menu-block');


// get all divs
const unitGeneratorDiv = document.querySelector('#unit-generator-body');
const similarAreaDiv = document.querySelector('#find-similar-area-body');
const dataExplorerDiv = document.querySelector('#data-explorer-body');
const documentationDiv = document.querySelector('#documentation-body');

// get footer div
const footer = document.querySelector('.footer');


const menuAll = [unitGeneratorDiv, similarAreaDiv, dataExplorerDiv, documentationDiv];

let hasNotClickedSimilarAreaButton = true;

// create a function to handle menu bar situation

function handleMenuDisplay(select) {
  for (const item of menuAll) {
    if (item != select) {
      item.style.display = 'none';
    }
  }
  // different div has different display method
  select == unitGeneratorDiv || select == similarAreaDiv ? select.style.display = 'flex' : select.style.display = 'block';
}

function handleFooter(select) {
  select == documentationDiv ? footer.style.display = 'none' : footer.style.display = 'block';
}

function manipulateMenu(select, width) {
  menuBlock.style.left = width;
  handleMenuDisplay(select);
  handleFooter(select);
}

function handleMenuBar() {
  unitGeneratorButton.addEventListener('click', () => {
    manipulateMenu(unitGeneratorDiv, 0);
  });

  similarAreaButton.addEventListener('click', () => {
    manipulateMenu(similarAreaDiv, '130px');
    // initialize map here when display is not none, map cannot show up correctly if it is initially hidden
    // only need to initialize the map once
    if (hasNotClickedSimilarAreaButton) {
      window.map2 = initializeSimilarAreaMap(censusTracts, dataBoundary, huc10, huc12, shorelineBase, county, sendimentBudget);
      hasNotClickedSimilarAreaButton = false;
    }
  });

  dataExplorerButton.addEventListener('click', () => {
    manipulateMenu(dataExplorerDiv, '260px');
  });

  documentationButton.addEventListener('click', () => {
    manipulateMenu(documentationDiv, '390px');
  });
}

export {
  handleMenuBar,
};
