/* globals $ */

// Executes your code when the DOM is ready.  Acts the same as $(document).ready().
// when page load, call this function
// $(document).ready(() => {
//   // $('.dropdown-button').dropdown({
//   //   constrainWidth: false,
//   //   hover: true,
//   //   belowOrigin: true,
//   //   alignment: 'left',
//   // });

//   // scrollspy init
//   $('.scrollspy').scrollSpy();
// });

// document.addEventListener('DOMContentLoaded', function() {
//   // Get all section elements
//   const sections = document.querySelectorAll('.section');

//   // Create a map to store the offset top position of each section
//   const sectionOffsets = new Map();

//   // Calculate and store the offset top position of each section
//   sections.forEach((section) => {
//     sectionOffsets.set(section.id, section.offsetTop);
//   });

//   // Add scroll event listener to the window
//   window.addEventListener('scroll', function() {
//     // Get the current scroll position
//     const scrollPosition = window.scrollY;

//     // Loop through each section and check if it's in the viewport
//     sectionOffsets.forEach((offset, id) => {
//       if (scrollPosition >= offset - 100) { // Adjust 100 as needed for better accuracy
//         // Remove 'active' class from all navigation links
//         document.querySelectorAll('#navbar a').forEach((link) => {
//           link.classList.remove('active');
//         });

//         // Add 'active' class to the corresponding navigation link
//         document.querySelector(`#navbar a[href="#${id}"]`).classList.add('active');
//       }
//     });
//   });
// });
