/**
* @NApiVersion 2.x
* @NScriptType ScheduledScript
* @NModuleScope SameAccount
*/
define(['N/file', 'N/record', 'N/search'],
/**
* @param {file} file
* @param {record} record
* @param {search} search
*/
function(file, record, search) {

function createCSV(scriptContext) {

 var requestSearchObj = search.load({
   id: 3999,
   type: 'PaymentEvent'
     });



var returnArray = new Array();
var searchResultCount = requestSearchObj.runPaged().count;

if(searchResultCount>0){

log.debug("RESULT COUNT", searchResultCount);

	requestSearchObj.run().each(function (result) {
	    var tempObj = {};
	    tempObj["PNRef"] = result.getValue(result.columns[3]);
	    tempObj["Amount"] = (result.getValue(result.columns[2]))*100;
	    returnArray.push(tempObj);
	    return true;
	});

	log.debug("RESULT ARRAY", returnArray)

	var today = new Date();
	var dd = today.getDate();
	var mm = today.getMonth()+1;
	var yyyy = today.getFullYear();
	var date = dd.toString()+ '/' + mm.toString() + '/' + yyyy.toString();

	// Creating a file name
	var fname = 'Adyen Modifications ' + date;

	// Write to a CSV file
	var fileObj = file.create({
	name: fname,
	fileType: file.Type.CSV,
	contents: ''
	});
	fileObj.folder = 1837973;



	for (var i = 0; i < returnArray.length; i++) {


	fileObj.appendLine({
	        value: 'Company.PostscriptBooksLtd,' + returnArray[i].PNRef + ',cancel,' + returnArray[i].Amount + ',GBP'
	});

	}   
	  
	var fileid = fileObj.save();
}
}
return {
execute: createCSV
};

});