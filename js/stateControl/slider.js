import { updateState } from './state.js';

// read all the components for slider
const slider = document.getElementById('slider');
const backButton = document.querySelector('.show');
const letsGoButton = document.querySelector('.hide');

function handleSliderState(state) {
  // manually update states

  // handle lets go button
  letsGoButton.addEventListener('click', () => {
    slider.classList.remove('no-transition');
    slider.classList.add('collapsed');
    updateState('sliderPosition', 'up');
  });

  // handle back button
  backButton.addEventListener('click', () => {
    slider.classList.remove('no-transition');
    slider.classList.remove('collapsed');
    updateState('sliderPosition', 'down');
  });

  // use state to update slider

  function collapseSlider() {
    // slider.style.transition = 'top 0';
    slider.classList.add('collapsed', 'no-transition');
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

  applySliderState(state);
}


export {
  handleSliderState,
};
