const express = require('express');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const { parse } = require('json2csv'); 
const app = express();

app.use(express.json());

// Define paths for the CSV file and the lists storage file
const csvFilePath = path.join(__dirname, 'data', 'destinations.csv');
const listsFilePath = path.join(__dirname, 'data', 'lists.json');

// Array to store destination data
let destinations = [];

// Function to add IDs to CSV file directly
function addIdsToCsv() {
    let rows = [];
    let idCounter = 1;

    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
            // Assign a unique ID to each row
            row.ID = idCounter++;
            rows.push(row);
        })
        .on('end', () => {
            // Convert updated rows to CSV format
            const updatedCsv = parse(rows, { fields: Object.keys(rows[0]) });

            // Write the updated CSV back to file
            fs.writeFile(csvFilePath, updatedCsv, (err) => {
                if (err) {
                    console.error('Error writing updated CSV:', err);
                } else {
                    console.log('CSV file updated with IDs');
                }
            });

            // Assign to in-memory destinations for immediate access
            destinations = rows;
            console.log('CSV file successfully processed with IDs');
        });
}

// Call function to modify CSV file on server start
addIdsToCsv();

// Serve static files from the client folder
app.use(express.static(path.join(__dirname, '..', '..', 'client')));

// Serve index.html for the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'client', 'index.html'));
});

// Get all destinations
app.get('/api/destinations', (req, res) => {
    res.send(destinations);
});

app.get('/api/destinations/:id/details',(req,res)=>{
    const id = parseInt(req.params.id);
    const destination = destinations.find(dest=> parseInt(dest.ID)===id);

    if(destination){
        const listInfo = {
            id: destination.ID,
            name: destination['﻿Destination'] || destination['Destination'],
            category: destination.Category,
            approximateAnnualTourists: destination['Approximate Annual Tourists'], 
            currency: destination.Currency,
            majorityReligion: destination['Majority Religion'],
            famousFoods: destination['Famous Foods'],
            language: destination.Language,
            bestTimetoVisit: destination['Best Time to Visit'],
            costofLiving: destination['Cost of Living'],
            saftey: destination.Safety,
            culturalSignificance: destination['Cultural Significance'],
            description: destination['Description'],
            latitude: destination.Latitude,
            longitude: destination.Longitude,
            region: destination.Region,
            country: destination.Country
        };
        
        

        res.send(listInfo);
    } else{
        res.status(404).send({message: "Destination ID not found"});
    }
});

// Endpoint to get geographical coordinates (latitude and longitude) for a given destination ID
app.get('/api/destinations/:id/coordinates', (req, res) => {
    const id = parseInt(req.params.id);
    const destination = destinations.find(dest => parseInt(dest.ID) === id);

    if (destination) {
        const location = [
            {
                id: destination.ID,
                latitude: destination.Latitude,
                longitude: destination.Longitude
            }
        ];
        
        res.send(location);
    } else {
        res.status(404).send({ message: "Destination ID not found" });
    }
});

// Get all unique country names from the destinations array
app.get('/api/countries', (req, res) => {
    const countries = [...new Set(destinations.map(destination => destination.Country))];
    res.send(countries);
});

// Endpoint to match destinations by a field and pattern, with an optional limit
app.get('/api/match', (req, res) => {
    const { field, pattern, n } = req.query;

    if (!field || !pattern) {
        return res.status(400).send({ error: "Field and pattern are required parameters." });
    }

    const regex = new RegExp(pattern, 'i');
    const maxResults = n ? parseInt(n, 10) : null;

    let matchingDestinations = destinations.filter(destination => {
        const fieldValue = destination[field];
        return fieldValue && regex.test(fieldValue);
    });

    if (maxResults && matchingDestinations.length > maxResults) {
        matchingDestinations = matchingDestinations.slice(0, maxResults);
    }

    const matchingIDs = matchingDestinations.map(destination => destination.ID);
    res.send(matchingIDs);
});

// Function to read lists from file
function readListsFromFile() {
    if (fs.existsSync(listsFilePath)) {
        const data = fs.readFileSync(listsFilePath, 'utf-8');
        return JSON.parse(data);
    }
    return {};
}

// Function to write lists to file
function writeListsToFile(lists) {
    fs.writeFileSync(listsFilePath, JSON.stringify(lists, null, 2), 'utf-8');
}

// Endpoint to create a new list (only if it doesn't already exist)
app.post('/api/lists', (req, res) => {
    const { listName, destinationIDs } = req.body;


    // Validate input
    if (!listName || !Array.isArray(destinationIDs)) {
        return res.status(400).send({ error: "List name and an array of destination IDs are required." });
    }

    // Read existing lists from file
    let lists = readListsFromFile();

    // Check if the list already exists
    if (lists[listName]) {
        return res.status(400).send({ error: `List '${listName}' already exists.` });
    }

    // Create a new list with the provided destination IDs
    lists[listName] = destinationIDs;

    // Write updated lists to file
    writeListsToFile(lists);

    res.status(201).send({
        message: `List '${listName}' created successfully.`,
        listName,
        destinationIDs
    });
});

// Endpoint to update (replace) destination IDs in an existing list
app.put('/api/lists/:listName', (req, res) => {
    const { listName } = req.params;
    const { destinationIDs } = req.body;

    // Validate input
    if (!destinationIDs || !Array.isArray(destinationIDs)) {
        return res.status(400).send({ error: "An array of destination IDs is required." });
    }

    // Read existing lists from file
    let lists = readListsFromFile();

    // Check if the list exists
    if (!lists[listName]) {
        return res.status(404).send({ error: `List '${listName}' does not exist.` });
    }

    // Replace the destination IDs in the existing list
    lists[listName] = destinationIDs;

    // Write updated lists to file
    writeListsToFile(lists);

    res.status(200).send({
        message: `List '${listName}' updated successfully.`,
        listName,
        destinationIDs
    });
});

// Endpoint to retrieve all lists
app.get('/api/lists', (req, res) => {
    const lists = readListsFromFile(); 
    res.status(200).send(lists);
});



//Deleting a list from the database 
app.delete('/api/lists/:listName',(req,res)=>{
    const {listName} = req.params;

    //read existing lists from file or database
    const lists = readListsFromFile(); //reads lists from json file 

    //check if the list exists
    if (!lists[listName]) {
        return res.status(404).send({ error: `List '${listName}' not found.` });
    }

    //Delete the list from the data 
    delete lists[listName];

    //write the updated lists back to the file or database
    writeListsToFile(lists);//writes lists back to the json file 

    res.status(200).send({message: `List '${listName}' deleted succesfully.`})
});

// Endpoint to add a destination to an existing list, or create the list if it doesn't exist
app.post('/api/lists/:listName/add', (req, res) => {
    const { listName } = req.params;
    const { destinationID } = req.body;

    // Validate input
    if (!destinationID) {
        return res.status(400).send({ error: "Destination ID is required." });
    }

    // Read existing lists from file
    let lists = readListsFromFile();

    // If the list doesn't exist, create a new list with this destination ID
    if (!lists[listName]) {
        lists[listName] = [destinationID];
    } else {
        // If the list exists, add the destination ID if it is not already in the list
        if (!lists[listName].includes(destinationID)) {
            lists[listName].push(destinationID);
        } else {
            return res.status(400).send({ error: `Destination ID ${destinationID} is already in the list '${listName}'.` });
        }
    }

    // Write updated lists to file
    writeListsToFile(lists);

    res.status(200).send({
        message: `Destination ID ${destinationID} added to list '${listName}' successfully.`,
        listName,
        destinationIDs: lists[listName]
    });
});






// Start server
const port = process.env.PORT || 5001;
app.listen(port, () => console.log(`Listening on port ${port}...`));