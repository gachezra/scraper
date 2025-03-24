const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function scrapeTablesFromUrl(url) {
  try {
    // Fetch the HTML content from the URL
    const response = await axios.get(url);
    const html = response.data;
    
    // Load the HTML into cheerio
    const $ = cheerio.load(html);
    
    // Find all tables in the HTML
    const tables = [];
    
    // Process each table element
    $('table').each((tableIndex, tableElement) => {
      const tableData = {
        id: tableIndex,
        rows: []
      };
      
      // Process each row in the table
      $(tableElement).find('tr').each((rowIndex, rowElement) => {
        const rowData = [];
        
        // Process each cell (th or td) in the row
        $(rowElement).find('th, td').each((cellIndex, cellElement) => {
          // Get the text content of the cell and trim whitespace
          const cellContent = $(cellElement).text().trim();
          
          // Get colspan and rowspan attributes if they exist
          const colspan = $(cellElement).attr('colspan') ? parseInt($(cellElement).attr('colspan'), 10) : 1;
          const rowspan = $(cellElement).attr('rowspan') ? parseInt($(cellElement).attr('rowspan'), 10) : 1;
          
          // Extract all links within the cell
          const links = [];
          $(cellElement).find('a').each((linkIndex, linkElement) => {
            links.push({
              text: $(linkElement).text().trim(),
              href: $(linkElement).attr('href') || '',
              title: $(linkElement).attr('title') || ''
            });
          });
          
          rowData.push({
            content: cellContent,
            colspan: colspan,
            rowspan: rowspan,
            isHeader: cellElement.name === 'th',
            links: links
          });
        });
        
        if (rowData.length > 0) {
          tableData.rows.push(rowData);
        }
      });
      
      // Only add tables that have actual content
      if (tableData.rows.length > 0) {
        tables.push(tableData);
      }
    });
    
    return tables;
  } catch (error) {
    console.error('Error scraping tables:', error.message);
    throw error;
  }
}

const cleanData = (tables) => {
    let sortedEvents = {};
    let currentDay = "";

    tables.forEach((table) => {
        table.rows.forEach((row) => {
            const cell = row[0]; // Each row has a single cell object

            if (!cell.content.trim() && cell.links.length === 0) {
                return; // Skip empty rows
            }

            if (cell.links.length === 0) {
                // This is a day header
                currentDay = cell.content.trim();
                sortedEvents[currentDay] = [];
            } else {
                // This is an event entry
                let eventData = {
                    description: cell.content.trim(),
                    links: cell.links.map(link => ({
                        text: link.text.trim(),
                        href: link.href.startsWith('http') ? link.href : `http://whats-on-mombasa.com/${link.href}`
                    }))
                };
                sortedEvents[currentDay].push(eventData);
            }
        });
    });

    return sortedEvents;
};

function saveToJson(tables, selectedIds, outputPath) {
  let tablesToSave = tables;
  
  // If selectedIds is provided, filter tables by those IDs
  if (selectedIds && Array.isArray(selectedIds)) {
    tablesToSave = tables.filter(table => selectedIds.includes(table.id));
    console.log(`Filtering to save only ${tablesToSave.length} selected tables (IDs: ${selectedIds.join(', ')}).`);
  }

  const data = cleanData(tablesToSave)

  // fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`Saved ${tablesToSave.length} tables to ${outputPath}`);
  return data;
}

async function Scrape(url, outputPath = 'tables.json', selectedIds = null) {
  try {
    console.log(`Scraping tables from ${url}...`);
    const tables = await scrapeTablesFromUrl(url);
    console.log(`Found ${tables.length} tables on the page.`);
    
    // Print summary of tables to help with selection
    console.log('Table IDs summary:');
    tables.forEach(table => {
      const rowCount = table.rows.length;
      const firstRowCells = table.rows[0]?.length || 0;
      console.log(`Table ID ${table.id}: ${rowCount} rows, ${firstRowCells} columns in first row`);
    });
    
    if (tables.length > 0) {
      const data = saveToJson(tables, selectedIds, outputPath);
      return data;
    } else {
      console.log('No tables found on the page.');
    }
    
    return tables; // Return tables for potential further processing
  } catch (error) {
    console.error('Scraper failed:', error.message);
    return [];
  }
}

module.exports = Scrape;