// state.js
const state = JSON.parse(window.localStorage.getItem('state')) || {
  sliderPosition: 'down',
};

function updateState(key, val) {
  state[key] = val;
  localStorage.setItem('state', JSON.stringify(state));
}

export {
  updateState,
  state,
};
