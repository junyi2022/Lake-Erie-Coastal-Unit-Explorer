// handle dynamic dropdown

const dropdownOptions = [
  {'label': '--Please choose an option--', 'value': ''},
  {'label': 'No Selection', 'value': 'ns'},
  {'label': 'Sediment Loss', 'value': 'sl'},
  {'label': 'Sediment Gain', 'value': 'sg'},
];

function handleDropdownDisplay(DropdownSelect, exclude=[]) {
  DropdownSelect.innerHTML = '';
  for (const option of dropdownOptions) {
    if (!exclude.includes(option.value)) {
      DropdownSelect.innerHTML += `
        <option value="${option.value}">${option.label}</option>
      `;
    }
  }
}

export {
  handleDropdownDisplay,
};
