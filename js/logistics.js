// handle dynamic dropdown

const dropdownOptions = [
  {'label': '--Please choose an option--', 'value': ''},
  {'label': 'Sediment Loss', 'value': 'sl'},
  {'label': 'Sediment Gain', 'value': 'sg'},
  {'label': 'Erosion Potential', 'value': 'ep'},
  {'label': 'Habitat Protection', 'value': 'hp'},
];

function handleDropdownDisplay(DropdownSelect, exclude=[]) {
  DropdownSelect.innerHTML = '';
  // if the previous priority selection includes no selection, there should not be other choices for the following dropdown boxes
  if (exclude.includes('ns')) {
    DropdownSelect.innerHTML += `
    <option value="">--Please choose an option--</option>
    <option value="ns">No Selection</option>
    `;
  // if there is no no selection above
  } else {
    for (const option of dropdownOptions) {
      if (!exclude.includes(option.value)) {
        DropdownSelect.innerHTML += `
          <option value="${option.value}">${option.label}</option>
        `;
      }
    }
    DropdownSelect.innerHTML += '<option value="ns">No Selection</option>';
  }
}

// handle loading spinner

const spinner = document.getElementById('loader');


function showSpinner() {
  spinner.style.display = 'block';
}

function hideSpinner() {
  spinner.style.display = 'none';
}

function withSpinnerDo(callback) {
  showSpinner();
  setTimeout(() => {
    callback();
    hideSpinner();
  }, 0);
}

// handle input box input value range

function unitInputRange(categoryBox) {
  categoryBox.addEventListener('change', () => {
    if (categoryBox.value < '2') {
      categoryBox.value = '';
      alert('Please enter a number greater than 1.');
    }
  });
}

export {
  handleDropdownDisplay,
  showSpinner,
  hideSpinner,
  withSpinnerDo,
  unitInputRange,
};
