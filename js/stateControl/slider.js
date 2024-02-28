import { updateState } from './state.js';


const slider = document.getElementById('slider');

function collapseSlider() {
  slider.classList.add('collapsed');
  updateState('sliderPosition', 'up');
}

function showSlider() {
  slider.classList.remove('collapsed');
  updateState('sliderPosition', 'down');
}

function applySliderState(state) {
  if (state.sliderPosition == 'down') {
    showSlider();
  } else {
    collapseSlider();
  }
}

export {
  applySliderState,
};
