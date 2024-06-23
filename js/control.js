import { initializeSimilarAreaMap } from './map.js';
import { censusTracts, dataBoundary, huc10, huc12, shorelineBase, county, sendimentBudget } from './main.js';

// handle menu bar dynamics

// get all the buttons
const unitGeneratorButton = document.querySelector('.unit-generator-button');
const similarAreaButton = document.querySelector('.find-similar-area');
const strategyFilterButton = document.querySelector('.strategy-filter');
const dataExplorerButton = document.querySelector('.data-explorer');
const strategyLibraryButton = document.querySelector('.strategy-library');
const documentationButton = document.querySelector('.documentation');

const menuBlock = document.querySelector('.menu-block');


// get all divs
const unitGeneratorDiv = document.querySelector('#unit-generator-body');
const similarAreaDiv = document.querySelector('#find-similar-area-body');
const strategyFilterDiv = document.querySelector('#strategy-filter-body');
const dataExplorerDiv = document.querySelector('#data-explorer-body');
const strategyLibraryDiv = document.querySelector('#strategy-library-body');
const documentationDiv = document.querySelector('#documentation-body');

// get footer div
const footer = document.querySelector('.footer');


const menuAll = [unitGeneratorDiv, similarAreaDiv, strategyFilterDiv, dataExplorerDiv, strategyLibraryDiv, documentationDiv];

let hasNotClickedSimilarAreaButton = true;

// create a function to handle menu bar situation

function handleMenuDisplay(select) {
  for (const item of menuAll) {
    if (item != select) {
      item.style.display = 'none';
    }
  }
  // different div has different display method
  if (select == unitGeneratorDiv || select == similarAreaDiv) { // when working on SF add this || strategyFilterDiv
    select.style.display = 'flex';
  } else {
    select.style.display = 'block';
  }
}

function handleFooter(select) {
  if (select == documentationDiv) { // when working on SF add this || strategyFilterDiv
    footer.style.display = 'none';
  } else {
    footer.style.display = 'block';
  }
}

function handleMenuBar() {
  unitGeneratorButton.addEventListener('click', () => {
    const select = unitGeneratorDiv;
    menuBlock.style.left = 0;
    handleMenuDisplay(select);
    handleFooter(select);
  });

  similarAreaButton.addEventListener('click', () => {
    const select = similarAreaDiv;
    menuBlock.style.left = '130px';
    handleMenuDisplay(select);
    handleFooter(select);
    // initialize map here when display is not none, map cannot show up correctly if it is initially hidden
    // only need to initialize the map once
    if (hasNotClickedSimilarAreaButton) {
      window.map2 = initializeSimilarAreaMap(censusTracts, dataBoundary, huc10, huc12, shorelineBase, county, sendimentBudget);
      hasNotClickedSimilarAreaButton = false;
    }
  });

  strategyFilterButton.addEventListener('click', () => {
    const select = strategyFilterDiv;
    menuBlock.style.left = '260px';
    handleMenuDisplay(select);
    handleFooter(select);
  });

  dataExplorerButton.addEventListener('click', () => {
    const select = dataExplorerDiv;
    menuBlock.style.left = '390px';
    handleMenuDisplay(select);
    handleFooter(select);
  });

  strategyLibraryButton.addEventListener('click', () => {
    const select = strategyLibraryDiv;
    menuBlock.style.left = '520px';
    handleMenuDisplay(select);
    handleFooter(select);
  });

  documentationButton.addEventListener('click', () => {
    const select = documentationDiv;
    menuBlock.style.left = '650px';
    handleMenuDisplay(select);
    handleFooter(select);
  });
}

export {
  handleMenuBar,
};
