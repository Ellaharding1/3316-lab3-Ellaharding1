

document.addEventListener('DOMContentLoaded', () => {
    let allDestinations = [];
    let filteredDestinations = []; // Store filtered results
    let currentPage = 1;
    let itemsPerPage = 5; // Default items per page

    // Function to display a specific page of destinations
    function displayCurrentPage(destinations) {
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageDestinations = destinations.slice(start, end);
        
        updateDestinationList(pageDestinations); // Update list with current page items
        updatePaginationControls(destinations.length); // Update pagination controls
    }

     // Function to update pagination controls
     function updatePaginationControls(totalItems) {
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages}`;
        document.getElementById('prev-page').disabled = currentPage === 1;
        document.getElementById('next-page').disabled = currentPage >= totalPages;
    }

    fetch("/api/destinations")
        .then(res => res.json())
        .then(destinations => {
            allDestinations = destinations;
            filteredDestinations = allDestinations; // Initialize with all destinations
            displayCurrentPage(filteredDestinations); // Show the initial page
        })
        .catch(error => console.error('Error fetching destinations:', error));

    // Update items per page when the dropdown changes
    const limitInput = document.getElementById('limit-input');
    limitInput.addEventListener('change', () => {
        itemsPerPage = parseInt(limitInput.value, 10) || 5;
        currentPage = 1; // Reset to first page when items per page changes
        displayCurrentPage(filteredDestinations); // Display the filtered or all destinations
    });


    // Search filter for destinations
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();

        // Update filteredDestinations based on the search query
        filteredDestinations = query 
            ? allDestinations.filter(destination => 
                (destination['Destination'] || destination['﻿Destination'] || '').toLowerCase().includes(query)
              )
            : allDestinations; // Reset to all if the query is empty

        currentPage = 1; // Reset to the first page for new search results
        displayCurrentPage(filteredDestinations);
    });

    // Pagination button event listeners
    document.getElementById('next-page').addEventListener('click', () => {
        currentPage++;
        displayCurrentPage(filteredDestinations);
    });

    document.getElementById('prev-page').addEventListener('click', () => {
        currentPage--;
        displayCurrentPage(filteredDestinations);
    });
    

    // Fetch saved lists and display them in the DOM
    fetch("/api/lists")
        .then(response => response.json())
        .then(lists => {
            for (const [listName, destinationIDs] of Object.entries(lists)) {
                addListToDOM(listName, destinationIDs);
            }
        })
        .catch(error => console.error('Error fetching lists:', error));


    // Fetch data and populate the list

    // Event listener for filter button
    const fieldDropdown = document.getElementById('field-dropdown');
    const patternInput = document.getElementById('pattern-input');
    
    const filterButton = document.getElementById('filter-button');

    filterButton.addEventListener('click', () => {
        const field = fieldDropdown.value;
        const pattern = patternInput.value.trim(); // Trim whitespace for clean input
    
        // Check if pattern is empty; if so, reset filteredDestinations and display all
        if (!pattern) {
            filteredDestinations = allDestinations;
            currentPage = 1;
            displayCurrentPage(filteredDestinations);
            return;
        }
    
        // Remove itemsPerPage assignment from the filter logic if it’s already handled elsewhere
        fetch(`/api/match?field=${field}&pattern=${pattern}`)
            .then(response => response.json())
            .then(matchingIDs => {
                console.log("Matching IDs from API:", matchingIDs); // Debugging
    
                filteredDestinations = allDestinations.filter(destination => 
                    matchingIDs.includes(destination.ID)
                );
    
                console.log("Filtered Destinations:", filteredDestinations); // Debugging
    
                currentPage = 1;
                displayCurrentPage(filteredDestinations);
            })
            .catch(error => console.error('Error fetching matching destinations:', error));
    });
    

    // Function to update the destination list with checkboxes for selection
    function updateDestinationList(destinations) {
        const destinationList = document.getElementById('destination-list');
    
        // Remove existing items
        while (destinationList.firstChild) {
            destinationList.removeChild(destinationList.firstChild);
        }
    
        // Check if there are destinations to display
        if (destinations.length === 0) {
            const noResultsMessage = document.createElement('p');
            noResultsMessage.textContent = "No destinations found.";
            noResultsMessage.classList.add('no-results-message'); 
            destinationList.appendChild(noResultsMessage);
            return;
        }
    
        // If there are destinations, proceed with adding each one to the list
        destinations.forEach((destination, index) => {
            const listItem = document.createElement('div');
            listItem.classList.add('destination-item');
            listItem.id = `destination-${index}`;
            listItem.setAttribute('data-destination-id', destination['ID']);
    
            // Checkbox for selecting destination
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.classList.add('destination-checkbox');
            checkbox.value = destination['ID'];
            listItem.appendChild(checkbox);
    
            // Title of the destination
            const title = document.createElement('h3');
            title.textContent = destination['﻿Destination'] || destination['Destination'];
            listItem.appendChild(title);
    
            // Add other information
            const detailsArray = [
                `Region: ${destination['Region']}`,
                `Country: ${destination['Country']}`,
                `Category: ${destination['Category']}`,
                `Approximate Annual Tourists: ${destination['Approximate Annual Tourists']}`,
                `Currency: ${destination['Currency']}`,
                `Majority Religion: ${destination['Majority Religion']}`,
                `Famous Foods: ${destination['Famous Foods']}`,
                `Language: ${destination['Language']}`,
                `Best Time to Visit: ${destination['Best Time to Visit']}`,
                `Cost of Living: ${destination['Cost of Living']}`,
                `Safety: ${destination['Safety']}`,
                `Cultural Significance: ${destination['Cultural Significance']}`,
                `Description: ${destination['Description']}`
            ];
    
            detailsArray.forEach(detail => {
                const detailParagraph = document.createElement('p');
                detailParagraph.textContent = detail;
                listItem.appendChild(detailParagraph);
            });
    
            // Create a div for the map and add it to the list item
            const mapDiv = document.createElement('div');
            mapDiv.classList.add('destination-map');
            mapDiv.id = `map-${index}`;
            listItem.appendChild(mapDiv);
    
            // Append the list item to the destination list
            destinationList.appendChild(listItem);
    
            // Fetch coordinates from the backend for the destination ID
            const destinationID = destination['ID'];
            fetch(`/api/destinations/${destinationID}/coordinates`)
                .then(response => response.json())
                .then(locationArray => {
                    if (locationArray.length > 0) {
                        const location = locationArray[0];
                        const lat = parseFloat(location.latitude);
                        const lng = parseFloat(location.longitude);
    
                        if (!isNaN(lat) && !isNaN(lng)) {
                            const map = L.map(`map-${index}`).setView([lat, lng], 10);
                            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                maxZoom: 18,
                                attribution: '© OpenStreetMap contributors'
                            }).addTo(map);
    
                            L.marker([lat, lng]).addTo(map)
                                .bindPopup(`<strong>${title.textContent}</strong>`)
                                .openPopup();
                        }
                    } else {
                        console.error(`No location data found for destination ID: ${destinationID}`);
                    }
                })
                .catch(error => console.error(`Error fetching location data for destination ID: ${destinationID}`, error));
        });
    }
    

        // Example function to fetch selected destination IDs (this can be customized)
        function getSelectedDestinationIDs() {
            const selectedIDs = [];
            const checkboxes = document.querySelectorAll('.destination-checkbox');
            checkboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    selectedIDs.push(parseInt(checkbox.value));
                }
            });
            return selectedIDs;
        }



  // Event listener for creating a new list
document.getElementById('create-list-button').addEventListener('click', () => {
    const listName = document.getElementById('list-name').value.trim();
    const destinationIDs = getSelectedDestinationIDs();

    if (!listName || destinationIDs.length === 0) {
        alert('Please enter a list name and select at least one destination.');
        return;
    }

    // Send a POST request to create a new list
    fetch('/api/lists', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ listName, destinationIDs })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            alert(data.message);
            addListToDOM(data.listName, data.destinationIDs);
        }
    })
    .catch(error => console.error('Error creating list:', error));
});


// Function to add or update the list in the DOM with detailed information
function addListToDOM(listName, destinationIDs) {
    const listsContainer = document.getElementById('lists-container');
    let listItem = document.getElementById(`list-${listName}`);

    // Create a new list item if it doesn't exist
    if (!listItem) {
        listItem = document.createElement('li');
        listItem.id = `list-${listName}`;
        listsContainer.appendChild(listItem);
    }

    // Clear the existing content
    while (listItem.firstChild) {
        listItem.removeChild(listItem.firstChild);
    }

    // Add the list name as the title
    const listTitle = document.createElement('h3');
    listTitle.textContent = `List Name: ${escapeHTML(listName)}`;
    listItem.appendChild(listTitle);
    

    // Add a delete button if it doesn’t already exist
    if (!listItem.querySelector('button')) {
        const deleteButton = document.createElement('button');
        deleteButton.textContent = "Delete";
        deleteButton.classList.add('delete-button');
        deleteButton.addEventListener('click', () => deleteList(listName, listItem));
        listItem.appendChild(deleteButton);
    }

    // Create a container for destination details
    const detailsContainer = document.createElement('div');
    detailsContainer.classList.add('details-container');
    listItem.appendChild(detailsContainer);

    // Fetch and display detailed information for each destination ID
    destinationIDs.forEach(id => {
        fetch(`/api/destinations/${id}/details`)
            .then(response => response.json())
            .then(destination => {
                const detailDiv = document.createElement('div');
                detailDiv.classList.add('destination-detail');
    
                const name = document.createElement('h4');
                name.textContent = `Destination: ${escapeHTML(destination.name || destination['Destination'] || 'Unknown')}`;
                detailDiv.appendChild(name);
    
                const region = document.createElement('p');
                region.textContent = `Region: ${escapeHTML(destination.region || 'N/A')}`;
                detailDiv.appendChild(region);
    
                const country = document.createElement('p');
                country.textContent = `Country: ${escapeHTML(destination.country || 'N/A')}`;
                detailDiv.appendChild(country);
    
                const currency = document.createElement('p');
                currency.textContent = `Currency: ${escapeHTML(destination.currency || 'N/A')}`;
                detailDiv.appendChild(currency);
    
                const language = document.createElement('p');
                language.textContent = `Language: ${escapeHTML(destination.language || 'N/A')}`;
                detailDiv.appendChild(language);
    
                detailsContainer.appendChild(detailDiv);
            })
            .catch(error => console.error(`Error fetching details for destination ID ${id}:`, error));
    });
    
}


// Event listener for the sort button
document.getElementById('sort-button').addEventListener('click', () => {
    const sortField = document.getElementById('sort-field').value;

    // Iterate through each list and sort destinations
    fetch("/api/lists")
        .then(response => response.json())
        .then(lists => {
            for (const [listName, destinationIDs] of Object.entries(lists)) {
                fetchSortedDestinations(listName, destinationIDs, sortField);
            }
        })
        .catch(error => console.error('Error fetching lists for sorting:', error));
});

// Function to fetch, sort, and display sorted destinations in a list
function fetchSortedDestinations(listName, destinationIDs, sortField) {
    // Fetch details for each destination and store them
    Promise.all(destinationIDs.map(id => fetch(`/api/destinations/${id}/details`).then(res => res.json())))
        .then(destinations => {
            // Sort destinations based on selected field
            destinations.sort((a, b) => {
                const fieldA = (a[sortField] || '').toString().toLowerCase();
                const fieldB = (b[sortField] || '').toString().toLowerCase();
                return fieldA.localeCompare(fieldB);
            });
            // Update the DOM with sorted destinations
            addListToDOM(listName, destinations.map(dest => dest.id), destinations);
        })
        .catch(error => console.error(`Error fetching and sorting destinations for list '${listName}':`, error));
}

// Update addListToDOM to optionally accept sorted destinations
function addListToDOM(listName, destinationIDs, sortedDestinations = null) {
    const listsContainer = document.getElementById('lists-container');
    let listItem = document.getElementById(`list-${listName}`);

    // Create a new list item if it doesn't exist
    if (!listItem) {
        listItem = document.createElement('li');
        listItem.id = `list-${escapeHTML(listName)}`; // Escape the ID
        listsContainer.appendChild(listItem);
    }

    // Clear the existing content
    while (listItem.firstChild) {
        listItem.removeChild(listItem.firstChild);
    }

    // Add the list name as the title
    const listTitle = document.createElement('h3');
    listTitle.textContent = `List Name: ${escapeHTML(listName)}`;
    listItem.appendChild(listTitle);

    // Add a delete button if it doesn’t already exist
    if (!listItem.querySelector('button')) {
        const deleteButton = document.createElement('button');
        deleteButton.textContent = "Delete";
        deleteButton.classList.add('delete-button');
        deleteButton.addEventListener('click', () => deleteList(listName, listItem));
        listItem.appendChild(deleteButton);
    }

    // Create a container for destination details
    const detailsContainer = document.createElement('div');
    detailsContainer.classList.add('details-container');
    listItem.appendChild(detailsContainer);

    // Use sortedDestinations if provided, otherwise fetch details
    const destinationsToDisplay = sortedDestinations || destinationIDs.map(id => ({ id }));

    destinationsToDisplay.forEach(destinationData => {
        const id = destinationData.id;
        fetch(`/api/destinations/${id}/details`)
            .then(response => response.json())
            .then(destination => {
                const detailDiv = document.createElement('div');
                detailDiv.classList.add('destination-detail');

                const nameText = destination.name || destination['﻿Destination'] || destination['Destination'] || 'Unknown';
                const name = document.createElement('h4');
                name.textContent = `Destination: ${nameText}`;
                detailDiv.appendChild(name);

                const region = document.createElement('p');
                region.textContent = `Region: ${destination.region || 'N/A'}`;
                detailDiv.appendChild(region);

                const country = document.createElement('p');
                country.textContent = `Country: ${destination.country || 'N/A'}`;
                detailDiv.appendChild(country);

                const currency = document.createElement('p');
                currency.textContent = `Currency: ${destination.currency || 'N/A'}`;
                detailDiv.appendChild(currency);

                const language = document.createElement('p');
                language.textContent = `Language: ${destination.language || 'N/A'}`;
                detailDiv.appendChild(language);

                const coordinates = document.createElement('p');
                coordinates.textContent = `Coordinates: ${destination.latitude || 'N/A'}, ${destination.longitude || 'N/A'}`;
                detailDiv.appendChild(coordinates);

                detailsContainer.appendChild(detailDiv);
            })
            .catch(error => console.error(`Error fetching details for destination ID ${id}:`, error));
    });
}



    // Function to delete a list 
    function deleteList(listName, listItem) {
        fetch(`/api/lists/${listName}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else {
                alert(data.message);
                listItem.remove();
            }
        })
        .catch(error => console.error('Error deleting list:', error));
    }


    // Event listener for updating an existing list
    document.getElementById('update-list-button').addEventListener('click', () => {
        const listName = document.getElementById('list-name').value.trim();
        const destinationIDs = getSelectedDestinationIDs();

        if (!listName || destinationIDs.length === 0) {
            alert('Please enter a list name and select at least one destination.');
            return;
        }

        // Send a PUT request to update an existing list
        fetch(`/api/lists/${listName}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ destinationIDs })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(data.error);
            } else {
                alert(data.message);
                addListToDOM(data.listName, data.destinationIDs);
            }
        })
        .catch(error => console.error('Error updating list:', error));
    });


    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>"']/g, (match) => {
            const escapeChars = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            };
            return escapeChars[match];
        });
    }

    
});
