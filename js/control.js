// handle menu bar dynamics

// get all the buttons
const unitGeneratorButton = document.querySelector('.unit-generator-button');
const documentationButton = document.querySelector('.documentation');

// get all divs
const unitGeneratorDiv = document.querySelector('#unit-generator-body');
const documentationDiv = document.querySelector('.container');

const menuAll = [unitGeneratorDiv, documentationDiv];

// create a function to handle menu bar situation

function handleMenuDisplay(select) {
  for (const item of menuAll) {
    if (item != select) {
      item.style.display = 'none';
    }
  }
  // different div has different display method
  if (select == unitGeneratorDiv) {
    unitGeneratorDiv.style.display = 'flex';
  } else if (select == documentationDiv) {
    documentationDiv.style.display = 'block';
  }
}

function handleMenuBar() {
  documentationButton.addEventListener('click', () => {
    const select = documentationDiv;
    handleMenuDisplay(select);
  });

  unitGeneratorButton.addEventListener('click', () => {
    const select = unitGeneratorDiv;
    handleMenuDisplay(select);
  });
}

export {
  handleMenuBar,
};
