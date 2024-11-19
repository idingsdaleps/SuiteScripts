/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */


// PSBooks OGMED processor. Sets lead source for customers without it populated to the source of the first order


define(['N/search', 'N/runtime', 'N/https','N/record','N/file','N/currentRecord'],
function (search, runtime, https, record, file, currentRecord) {

    var scriptObj = runtime.getCurrentScript();
    const SAVED_SEARCH_ID = scriptObj.getParameter('custscript_ogmed_search'); 


//Get input from saved search and push values into array

    function getInputData() {
        try {
            log.audit("GET INPUT", "**SCRIPT START**");
            var returnArray = new Array();
            var requestSearchObj = search.load({
                id: SAVED_SEARCH_ID
            });
            var searchResultCount = requestSearchObj.runPaged().count;
            log.audit("Search Returned", searchResultCount + " results")   
            requestSearchObj.run().each(function (result) {
            var tempObj = {};

                tempObj["custID"] = result.getValue("internalid");
                tempObj["ogmed"] = result.getValue({
                    name: "leadsource",
                    join: "transaction"
                });

                returnArray.push(tempObj);

              log.debug("SEARCH RESPONSE", result)

                return true;
                    });

            return returnArray;
        }
        catch (e) {
            log.error("GET INPUT ERROR : " + e.name, e.message);
        }
    }


 function map(context) {

try{

            var requestObj = JSON.parse(context.value);

            log.debug("MAP requestObj",requestObj);

            
            //Set variables for current request

            var custID = requestObj.custID;
            var leadSource = requestObj.ogmed;

            log.audit("Processing", "Customer ID " + custID + " with lead source ID " + leadSource)

            var current_customer = record.load({
            type: record.Type.CUSTOMER,
            id : custID,
            isDynamic: false
            });

            current_customer.setValue({
            fieldId: 'leadsource',
            value: leadSource
            });

            try {
                var recId = current_customer.save();
                log.debug({
                    title: 'Customer successfully saved',
                    details: 'Id: ' + recId
                });
            } catch (e) {
                log.error({
                    title: e.name,
                    details: e.message      
                });
             }

        
}

    catch (e) {
            log.debug("MAP ERROR : " + e.name, e.message);

        }
    }

    function summarize(context) {
        log.debug("SUMMARIZE", "**SCRIPT END**");
    }

    return {
        getInputData: getInputData,
        map: map,
        summarize: summarize
    };
});