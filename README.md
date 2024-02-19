A web scraper for https://online.esdat.net/EnvironmentalStandards

Please use to collect data when a standard changes. This scraper is very basic, and required the pixel values for many clicks in order to navigate to the correct standard. Run this code in the console on the website to determine the coordinated:

document.onmousemove = function(event) {
console.log("Mouse coordinates:", event.pageX, event.pageY);
};

then use environmentalData.txt to copy and paste the data over.
