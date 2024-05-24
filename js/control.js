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

const menuAll = [unitGeneratorDiv, similarAreaDiv, strategyFilterDiv, dataExplorerDiv, strategyLibraryDiv, documentationDiv];

// create a function to handle menu bar situation

function handleMenuDisplay(select) {
  for (const item of menuAll) {
    if (item != select) {
      item.style.display = 'none';
    }
  }
  // different div has different display method
  if (select == unitGeneratorDiv || similarAreaDiv) { // when working on SF add this || strategyFilterDiv
    select.style.display = 'flex';
  } else {
    select.style.display = 'block';
  }
}

function handleMenuBar() {
  unitGeneratorButton.addEventListener('click', () => {
    const select = unitGeneratorDiv;
    menuBlock.style.left = 0;
    handleMenuDisplay(select);
  });

  similarAreaButton.addEventListener('click', () => {
    const select = similarAreaDiv;
    menuBlock.style.left = '130px';
    handleMenuDisplay(select);
  });

  strategyFilterButton.addEventListener('click', () => {
    const select = strategyFilterDiv;
    menuBlock.style.left = '260px';
    handleMenuDisplay(select);
  });

  dataExplorerButton.addEventListener('click', () => {
    const select = dataExplorerDiv;
    menuBlock.style.left = '390px';
    handleMenuDisplay(select);
  });

  strategyLibraryButton.addEventListener('click', () => {
    const select = strategyLibraryDiv;
    menuBlock.style.left = '520px';
    handleMenuDisplay(select);
  });

  documentationButton.addEventListener('click', () => {
    const select = documentationDiv;
    menuBlock.style.left = '650px';
    handleMenuDisplay(select);
  });
}

export {
  handleMenuBar,
};
