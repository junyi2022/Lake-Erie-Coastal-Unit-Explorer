import { updateState } from './state.js';

const dialogOK = document.querySelector('.start-box-OK');
const dialog = document.getElementById('start-box');

dialogOK.addEventListener('click', () => {
  updateState('dialog', 'close');
});

function applyDialogState(state) {
  if (state.dialog == 'close') {
    dialog.open = false;
  } else {
    dialog.open = true;
  }
}

export {
  applyDialogState,
};
