1.  coast boxes
2.  coast lines
3.  reference boxes

Goal:
* For each coast line, summarize the corresponding reference boxes

Steps:
0.  select a coast box
    1.  find corresponding reference boxes; store them in an array
    2.  find corresponding coast line
    3.  summarize the reference boxes properties
    4.  attach the summarized properties to the coast line

favicon.ico  

__Other ways to open a preview server__  
npm install http-server  
npx http-server  
python3 -m http.server  

# check what element is scrolling
```javascript
    const div = document.querySelector('#documentation-body');
    div.addEventListener('scroll', function(event) {
        const scrolledElement = event.target;
        console.log(scrolledElement); // Log the element being scrolled
    });
```

```html
<script>
    document.addEventListener('DOMContentLoaded', function() {
        const docDiv = document.querySelector('#documentation-body');
        const headers = document.querySelectorAll('h4[id]');
        const navLinks = document.querySelectorAll('.table-of-contents > li > a');
        const offset = 100;  // Offset to trigger the expansion slightly before reaching the section
    
        function expandSection(id) {
            navLinks.forEach(link => {
                const parentLi = link.parentElement;
                const href = link.getAttribute('href').substring(1);
                if (href === id) {
                    parentLi.classList.add('expanded');
                    let nestedUl = parentLi.querySelector('ul');
                    if (nestedUl) {
                        nestedUl.style.maxHeight = nestedUl.scrollHeight + "px";
                    }
                } else {
                    parentLi.classList.remove('expanded');
                    let nestedUl = parentLi.querySelector('ul');
                    if (nestedUl) {
                        nestedUl.style.maxHeight = null;
                    }
                }
            });
        }
    
        function onScroll() {
            let currentHeader = '';
    
            const scrollPosition = docDiv.scrollTop || docDiv.parentElement.scrollTop;
            headers.forEach(header => {
                const headerTop = header.offsetTop;
                if (scrollPosition >= headerTop - offset) {
                    currentHeader = header.getAttribute('id');
                }
            });
    
            if (currentHeader) {
                expandSection(currentHeader);
            }
        }
    
        docDiv.addEventListener('scroll', onScroll);
    
        // Initial check in case the page loads with a section already in view
        onScroll();
    });
    
    function smoothScroll(targetId) {
        document.getElementById(targetId).scrollIntoView({ behavior: 'smooth' });
    }
    </script>
    ```