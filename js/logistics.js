// handle dynamic dropdown

const dropdownOptions = [
  {'label': '--Please choose an option--', 'value': ''},
  {'label': 'Sediment Loss', 'value': 'sl'},
  {'label': 'Sediment Gain', 'value': 'sg'},
  {'label': 'Erosion Potential', 'value': 'ep'},
  {'label': 'Invasive Species Control', 'value': 'is'},
  {'label': 'NFWF Habitat Protection', 'value': 'hp'},
  {'label': 'NOAA Wetland Protection/Restoration', 'value': 'wpr'},
  {'label': 'NFWF Community Exposure', 'value': 'sv'},
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
// category groups validation

function unitInputRange(categoryBox) {
  categoryBox.addEventListener('change', () => {
    const inputNum = parseInt(categoryBox.value);
    if (inputNum < 2) {
      categoryBox.value = '';
      alert('Please enter a number greater than 1.');
    }
  });
}

// handle range input dynamics

const fromSlider = document.querySelector('#fromSlider');
const toSlider = document.querySelector('#toSlider');
const fromInput = document.querySelector('#fromInput');
const toInput = document.querySelector('#toInput');

function controlFromInput(fromSlider, fromInput, toInput, toSlider) {
  const [from, to] = getParsed(fromInput, toInput);
  fillSlider(fromInput, toInput, '#C6C6C6', '#c1e2ff', toSlider);
  if (from > to) {
    fromSlider.value = to;
    fromInput.value = to;
  } else {
    fromSlider.value = from;
  }
}

function controlToInput(toSlider, fromInput, toInput, controlSlider) {
  const [from, to] = getParsed(fromInput, toInput);
  fillSlider(fromInput, toInput, '#C6C6C6', '#c1e2ff', controlSlider);
  setToggleAccessible(toInput);
  if (from <= to) {
    toSlider.value = to;
    toInput.value = to;
  } else {
    toInput.value = from;
  }
}

function controlFromSlider(fromSlider, toSlider, fromInput) {
  const [from, to] = getParsed(fromSlider, toSlider);
  fillSlider(fromSlider, toSlider, '#C6C6C6', '#c1e2ff', toSlider);
  if (from > to) {
    fromSlider.value = to;
    fromInput.value = to;
  } else {
    fromInput.value = from;
  }
}

function controlToSlider(fromSlider, toSlider, toInput) {
  const [from, to] = getParsed(fromSlider, toSlider);
  fillSlider(fromSlider, toSlider, '#C6C6C6', '#c1e2ff', toSlider);
  setToggleAccessible(toSlider);
  if (from <= to) {
    toSlider.value = to;
    toInput.value = to;
  } else {
    toInput.value = from;
    toSlider.value = from;
  }
}

function getParsed(currentFrom, currentTo) {
  const from = parseFloat(currentFrom.value);
  const to = parseFloat(currentTo.value);
  return [from, to];
}

function fillSlider(from, to, sliderColor, rangeColor, controlSlider) {
  const rangeDistance = to.max-to.min;
  const fromPosition = from.value - to.min;
  const toPosition = to.value - to.min;
  controlSlider.style.background = `linear-gradient(
    to right,
    ${sliderColor} 0%,
    ${sliderColor} ${(fromPosition)/(rangeDistance)*100}%,
    ${rangeColor} ${((fromPosition)/(rangeDistance))*100}%,
    ${rangeColor} ${(toPosition)/(rangeDistance)*100}%, 
    ${sliderColor} ${(toPosition)/(rangeDistance)*100}%, 
    ${sliderColor} 100%)`;
}

function setToggleAccessible(currentTarget) {
  const toSlider = document.querySelector('#toSlider');
  if (Number(currentTarget.value) <= 0 ) {
    toSlider.style.zIndex = 2;
  } else {
    toSlider.style.zIndex = 0;
  }
}


fillSlider(fromSlider, toSlider, '#C6C6C6', '#c1e2ff', toSlider);
setToggleAccessible(toSlider);

fromSlider.oninput = () => controlFromSlider(fromSlider, toSlider, fromInput);
toSlider.oninput = () => controlToSlider(fromSlider, toSlider, toInput);
fromInput.oninput = () => controlFromInput(fromSlider, fromInput, toInput, toSlider);
toInput.oninput = () => controlToInput(toSlider, fromInput, toInput, toSlider);

// handle selected point on range input

const scoreMarker = document.querySelector('.select-point-box');
const scoreLabel = document.querySelector('.select-point-box-label');

function displaySelectPointScoreOnRange(score) {
  scoreMarker.classList.remove('hidden');
  // incorporate the width of the circle picker
  scoreMarker.style.width = `calc((100% - 14px) * ${score} + 7px)`;

  scoreLabel.innerHTML = `<div id="select-point-box-text" class="select-point-box-pop">Selected Point: ${score}</div>`;

  // need to remove hidden class before get the width
  scoreLabel.classList.remove('hidden');
  scoreLabel.style.display = 'flex';
  const scoreLabelWidth = scoreLabel.offsetWidth;
  scoreLabel.style.left = `min(calc(100% - ${scoreLabelWidth + 1}px), calc((100% - 14px) * ${score} + 7px))`;
}


export {
  handleDropdownDisplay,
  showSpinner,
  hideSpinner,
  withSpinnerDo,
  unitInputRange,
  getParsed,
  displaySelectPointScoreOnRange,
};
